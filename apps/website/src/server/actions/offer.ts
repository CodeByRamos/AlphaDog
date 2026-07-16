"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { offerStore, type OfferSource } from "@/features/offer/offer-store";

const SESSION_COOKIE = "alphadog_quiz_session";

const sourceSchema = z.enum(["scratch-card", "fortune-wheel"]);

/**
 * Resgata o desconto da sessão atual.
 *
 * Repare no que o cliente NÃO manda: o percentual. Ele só diz de onde veio; o
 * servidor decide quanto vale e por quanto tempo.
 */
export async function claimOffer(source: unknown) {
  const parsed = sourceSchema.safeParse(source);
  if (!parsed.success) return { ok: false as const };

  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return { ok: false as const };

  const offer = await offerStore.claim(sessionId, parsed.data as OfferSource);
  return {
    ok: true as const,
    percentOff: offer.percentOff,
    expiresAt: offer.expiresAt,
  };
}

/** Lida pelo servidor ao montar a oferta — nunca confia em valor do cliente. */
export async function getActiveOffer() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return offerStore.getActive(sessionId);
}
