import "server-only";
import { OfferSource as PrismaOfferSource } from "@/generated/prisma";
import { getPrisma, hasDatabase } from "@/server/db/prisma";

/**
 * Ofertas de desconto.
 *
 * O desconto é decidido e validado no servidor. O cliente só dispara o resgate
 * — nunca informa o percentual. Se o valor viesse do cliente, qualquer um com o
 * devtools aberto escolheria o próprio desconto.
 *
 * Mesma estratégia do QuizSessionStore: interface primeiro, memória agora,
 * Prisma depois sem tocar em quem consome.
 */

export type OfferSource = "scratch-card" | "fortune-wheel";

export type Offer = {
  id: string;
  sessionId: string;
  source: OfferSource;
  percentOff: number;
  expiresAt: string;
};

/** Percentual fixo por origem — sem randomização que gere disputa de preço. */
const PERCENT_BY_SOURCE: Record<OfferSource, number> = {
  "scratch-card": 40,
  "fortune-wheel": 40,
};

const TTL_MINUTES = 15;

export interface OfferStore {
  /** Idempotente: raspar de novo não renova o prazo nem troca o desconto. */
  claim(sessionId: string, source: OfferSource): Promise<Offer>;
  /** Devolve null quando expirou — a validade é real, não decorativa. */
  getActive(sessionId: string): Promise<Offer | null>;
}

class InMemoryOfferStore implements OfferStore {
  private offers = new Map<string, Offer>();

  async claim(sessionId: string, source: OfferSource) {
    const existing = this.offers.get(sessionId);
    if (existing) return existing;

    const offer: Offer = {
      id: crypto.randomUUID(),
      sessionId,
      source,
      percentOff: PERCENT_BY_SOURCE[source],
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000).toISOString(),
    };

    this.offers.set(sessionId, offer);
    return offer;
  }

  async getActive(sessionId: string) {
    const offer = this.offers.get(sessionId);
    if (!offer) return null;
    return new Date(offer.expiresAt).getTime() > Date.now() ? offer : null;
  }
}

const TO_PRISMA: Record<OfferSource, PrismaOfferSource> = {
  "scratch-card": PrismaOfferSource.SCRATCH_CARD,
  "fortune-wheel": PrismaOfferSource.FORTUNE_WHEEL,
};

const FROM_PRISMA: Record<PrismaOfferSource, OfferSource> = {
  SCRATCH_CARD: "scratch-card",
  FORTUNE_WHEEL: "fortune-wheel",
};

class PrismaOfferStore implements OfferStore {
  async claim(sessionId: string, source: OfferSource) {
    // upsert com update vazio: raspar de novo devolve a mesma oferta, sem
    // renovar o prazo. A idempotência é garantida pelo unique em sessionId.
    const row = await getPrisma().offer.upsert({
      where: { sessionId },
      create: {
        sessionId,
        source: TO_PRISMA[source],
        percentOff: PERCENT_BY_SOURCE[source],
        expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
      },
      update: {},
    });

    return {
      id: row.id,
      sessionId: row.sessionId,
      source: FROM_PRISMA[row.source],
      percentOff: row.percentOff,
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  async getActive(sessionId: string) {
    const row = await getPrisma().offer.findFirst({
      where: { sessionId, expiresAt: { gt: new Date() } },
    });
    if (!row) return null;

    return {
      id: row.id,
      sessionId: row.sessionId,
      source: FROM_PRISMA[row.source],
      percentOff: row.percentOff,
      expiresAt: row.expiresAt.toISOString(),
    };
  }
}

const globalForOffers = globalThis as unknown as { offerStore?: OfferStore };

export const offerStore: OfferStore =
  globalForOffers.offerStore ??
  (hasDatabase ? new PrismaOfferStore() : new InMemoryOfferStore());

if (process.env.NODE_ENV !== "production") globalForOffers.offerStore = offerStore;
