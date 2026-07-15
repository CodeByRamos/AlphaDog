import "server-only";

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

const globalForOffers = globalThis as unknown as { offerStore?: OfferStore };

export const offerStore: OfferStore =
  globalForOffers.offerStore ?? new InMemoryOfferStore();

if (process.env.NODE_ENV !== "production") globalForOffers.offerStore = offerStore;
