"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { FUNNEL_SLUG } from "@/features/quiz/funnel-config";
import { quizSessionStore } from "@/features/quiz/session-store";

const SESSION_COOKIE = "alphadog_quiz_session";

const answerValueSchema = z.union([
  z.string().max(200),
  z.array(z.string().max(80)).max(20),
]);
const answersSchema = z.record(z.string().max(60), answerValueSchema);

/** Cria (ou reaproveita) a sessão do funil e devolve o id. */
export async function startQuizSession(utmSource?: string) {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;

  if (existing && (await quizSessionStore.get(existing))) return existing;

  const session = await quizSessionStore.create({
    funnelSlug: FUNNEL_SLUG,
    utmSource: utmSource?.slice(0, 80),
  });

  jar.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return session.id;
}

/**
 * Persiste as respostas. O cliente já avançou — isto é gravação em segundo
 * plano, então falha aqui nunca deve travar o funil.
 */
export async function saveQuizAnswers(answers: unknown) {
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false as const };

  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return { ok: false as const };

  await quizSessionStore.saveAnswers(id, parsed.data);
  return { ok: true as const };
}

export async function completeQuizSession() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return { ok: false as const };

  await quizSessionStore.complete(id);
  return { ok: true as const, sessionId: id };
}
