import "server-only";
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

// O dev server recarrega módulos; sem o global as sessões sumiriam a cada edição.
const globalForStore = globalThis as unknown as { quizStore?: QuizSessionStore };

export const quizSessionStore: QuizSessionStore =
  globalForStore.quizStore ?? new InMemoryQuizSessionStore();

if (process.env.NODE_ENV !== "production") globalForStore.quizStore = quizSessionStore;
