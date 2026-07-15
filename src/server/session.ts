import "server-only";
import { cookies } from "next/headers";
import { offerStore } from "@/features/offer/offer-store";
import { quizSessionStore } from "@/features/quiz/session-store";

/**
 * Leitura da sessão do funil no servidor.
 *
 * Separado das Server Actions de propósito: actions são mutação disparada pelo
 * cliente; isto aqui é leitura para Server Components. Misturar os dois no mesmo
 * arquivo "use server" exporia leitura como endpoint sem necessidade.
 */

export const QUIZ_SESSION_COOKIE = "alphadog_quiz_session";

export async function getQuizSessionId() {
  const jar = await cookies();
  return jar.get(QUIZ_SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentQuizSession() {
  const id = await getQuizSessionId();
  if (!id) return null;
  return quizSessionStore.get(id);
}

/** Desconto vigente. Null quando não existe ou já expirou. */
export async function getCurrentOffer() {
  const id = await getQuizSessionId();
  if (!id) return null;
  return offerStore.getActive(id);
}
