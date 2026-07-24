import { describe, expect, it } from "vitest";
import {
  formatBRL,
  isSubscriptionActive,
  pricePerDayCents,
  getPlan,
  type Subscription,
} from "./subscription";

const NOW = Date.UTC(2026, 6, 24); // 2026-07-24
const future = new Date(NOW + 86_400_000).toISOString();
const past = new Date(NOW - 86_400_000).toISOString();

function sub(partial: Partial<Subscription>): Subscription {
  return {
    status: "active",
    planId: "trimestral",
    currentPeriodEnd: future,
    cancelAtPeriodEnd: false,
    ...partial,
  };
}

describe("isSubscriptionActive", () => {
  it("null não tem acesso", () => {
    expect(isSubscriptionActive(null, NOW)).toBe(false);
  });

  it("ativa dentro do período tem acesso", () => {
    expect(isSubscriptionActive(sub({}), NOW)).toBe(true);
  });

  it("ativa com período vencido não tem acesso", () => {
    expect(isSubscriptionActive(sub({ currentPeriodEnd: past }), NOW)).toBe(false);
  });

  it("past_due não libera, mesmo dentro do período", () => {
    // Cobrança recusada corta o acesso até reativar — senão bastava não pagar.
    expect(isSubscriptionActive(sub({ status: "past_due" }), NOW)).toBe(false);
  });

  it("canceled não libera", () => {
    expect(isSubscriptionActive(sub({ status: "canceled" }), NOW)).toBe(false);
  });

  it("trialing sem data conta como ativa (período de teste)", () => {
    expect(
      isSubscriptionActive(sub({ status: "trialing", currentPeriodEnd: null }), NOW),
    ).toBe(true);
  });

  it("active sem data (nunca cobrada) não libera", () => {
    expect(
      isSubscriptionActive(sub({ status: "active", currentPeriodEnd: null }), NOW),
    ).toBe(false);
  });
});

describe("preço", () => {
  it("formata centavos em BRL", () => {
    expect(formatBRL(4990)).toBe("R$ 49,90");
    expect(formatBRL(14990)).toBe("R$ 149,90");
  });

  it("preço por dia do trimestral é menor que o do mensal", () => {
    expect(pricePerDayCents(getPlan("trimestral"))).toBeLessThan(
      pricePerDayCents(getPlan("mensal")),
    );
  });
});
