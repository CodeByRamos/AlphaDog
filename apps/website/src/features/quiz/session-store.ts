import "server-only";
import { QuizStatus } from "@/generated/prisma";
import { getPrisma, hasDatabase } from "@/server/db/prisma";
import type { Answers, QuizSession } from "./types";

/**
 * Persistência de sessões do funil.
 *
 * O funil depende só desta interface. Hoje roda em memória; quando a
 * DATABASE_URL existir, criamos um `PrismaQuizSessionStore` que implementa o
 * mesmo contrato e trocamos apenas a linha do export no final do arquivo —
 * nenhum componente, action ou página muda.
 */
export interface QuizSessionStore {
  create(input: { funnelSlug: string; utmSource?: string }): Promise<QuizSession>;
  get(id: string): Promise<QuizSession | null>;
  saveAnswers(id: string, answers: Answers): Promise<void>;
  complete(id: string): Promise<void>;
}

/**
 * Implementação em memória — desenvolvimento apenas.
 *
 * Some quando o processo reinicia e não sobrevive a múltiplas instâncias
 * serverless. É intencional: serve para destravar o funil enquanto o banco não
 * entra. O cliente também guarda as respostas em sessionStorage, então a
 * retomada do usuário não depende disto.
 */
class InMemoryQuizSessionStore implements QuizSessionStore {
  private sessions = new Map<string, QuizSession>();

  async create(input: { funnelSlug: string; utmSource?: string }) {
    const session: QuizSession = {
      id: crypto.randomUUID(),
      funnelSlug: input.funnelSlug,
      utmSource: input.utmSource,
      answers: {},
      startedAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async get(id: string) {
    return this.sessions.get(id) ?? null;
  }

  async saveAnswers(id: string, answers: Answers) {
    const session = this.sessions.get(id);
    if (!session) return;
    this.sessions.set(id, { ...session, answers: { ...session.answers, ...answers } });
  }

  async complete(id: string) {
    const session = this.sessions.get(id);
    if (!session) return;
    this.sessions.set(id, { ...session, completedAt: new Date().toISOString() });
  }
}

/** Implementação real. Mesmo contrato — quem consome não sabe a diferença. */
class PrismaQuizSessionStore implements QuizSessionStore {
  async create(input: { funnelSlug: string; utmSource?: string }) {
    const row = await getPrisma().quizSession.create({
      data: {
        funnel: {
          connectOrCreate: {
            where: { slug: input.funnelSlug },
            create: { slug: input.funnelSlug },
          },
        },
        utmSource: input.utmSource,
        answers: {},
      },
    });
    return toSession(row);
  }

  async get(id: string) {
    const row = await getPrisma().quizSession.findUnique({ where: { id } });
    return row ? toSession(row) : null;
  }

  async saveAnswers(id: string, answers: Answers) {
    const db = getPrisma();
    const current = await db.quizSession.findUnique({
      where: { id },
      select: { answers: true },
    });
    if (!current) return;

    const merged = { ...(current.answers as Answers), ...answers };

    // A sessão guarda o mapa completo para leitura rápida no paywall; as linhas
    // de QuizAnswer existem para medir drop-off por passo.
    await db.$transaction([
      db.quizSession.update({ where: { id }, data: { answers: merged } }),
      ...Object.entries(answers).map(([stepKey, value]) =>
        db.quizAnswer.upsert({
          where: { sessionId_stepKey: { sessionId: id, stepKey } },
          create: { sessionId: id, stepKey, value },
          update: { value },
        }),
      ),
    ]);
  }

  async complete(id: string) {
    await getPrisma().quizSession.update({
      where: { id },
      data: { status: QuizStatus.COMPLETED, completedAt: new Date() },
    });
  }
}

type QuizSessionRow = {
  id: string;
  funnelSlug: string;
  answers: unknown;
  utmSource: string | null;
  startedAt: Date;
  completedAt: Date | null;
};

function toSession(row: QuizSessionRow): QuizSession {
  return {
    id: row.id,
    funnelSlug: row.funnelSlug,
    answers: (row.answers ?? {}) as Answers,
    utmSource: row.utmSource ?? undefined,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
  };
}

// O dev server recarrega módulos; sem o global as sessões sumiriam a cada edição.
const globalForStore = globalThis as unknown as { quizStore?: QuizSessionStore };

function createStore(): QuizSessionStore {
  return hasDatabase ? new PrismaQuizSessionStore() : new InMemoryQuizSessionStore();
}

export const quizSessionStore: QuizSessionStore =
  globalForStore.quizStore ?? createStore();

if (process.env.NODE_ENV !== "production") globalForStore.quizStore = quizSessionStore;
