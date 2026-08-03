/**
 * Planos e cálculo de preço.
 *
 * Todo valor monetário é inteiro em centavos. Nunca float: 0.1 + 0.2 !== 0.3, e
 * erro de arredondamento em cobrança é bug que aparece no extrato do cliente.
 */

export type PlanId = "mensal" | "trimestral" | "semestral" | "anual";

export type Plan = {
  id: PlanId;
  name: string;
  /** Uma linha explicando para quem o plano serve. */
  description: string;
  months: number;
  days: number;
  /** Preço cheio, sem desconto, em centavos. */
  listPriceCents: number;
  /** O que o tutor leva. Igual em todos hoje; o campo existe para diferenciar. */
  benefits: readonly string[];
  /**
   * Plano à venda?
   *
   * `archived` some da vitrine mas continua válido para quem já assinou —
   * remover a linha do catálogo quebraria a renovação e o histórico de quem
   * comprou nele.
   */
  status: "active" | "archived";
  /** Destaque visual — só um plano pode ser o recomendado. */
  featured?: boolean;
  badge?: string;
};

/** O que toda assinatura entrega, independente do período. */
const CORE_BENEFITS = [
  "Reconhecimento de postura pela câmera, direto no aparelho",
  "Plano de treino personalizado para o seu cão",
  "Biblioteca completa de exercícios",
  "Histórico de sessões e evolução",
  "Bônus: socialização, ansiedade, latido e jogos de faro",
] as const;

export const plans: readonly Plan[] = [
  {
    id: "mensal",
    name: "1 mês",
    description: "Para experimentar sem compromisso longo.",
    months: 1,
    days: 30,
    listPriceCents: 4990,
    benefits: CORE_BENEFITS,
    status: "active",
  },
  {
    id: "trimestral",
    name: "3 meses",
    description: "O tempo que um comando novo leva para virar hábito.",
    months: 3,
    days: 90,
    listPriceCents: 8990,
    benefits: CORE_BENEFITS,
    status: "active",
    featured: true,
    badge: "Mais escolhido",
  },
  {
    id: "semestral",
    name: "6 meses",
    description: "Para quem quer o repertório completo, do básico ao avançado.",
    months: 6,
    days: 180,
    listPriceCents: 14990,
    benefits: CORE_BENEFITS,
    status: "active",
  },
  {
    id: "anual",
    name: "12 meses",
    description: "Um ano inteiro pelo preço de pouco mais de meio.",
    months: 12,
    days: 365,
    listPriceCents: 24990,
    benefits: CORE_BENEFITS,
    status: "active",
    badge: "Melhor preço por dia",
  },
] as const;

/** Só os planos à venda. A vitrine usa esta lista; o histórico usa `plans`. */
export const activePlans = plans.filter((p) => p.status === "active");

export const DEFAULT_PLAN_ID: PlanId = "trimestral";

export function getPlan(id: PlanId) {
  const plan = plans.find((p) => p.id === id);
  if (!plan) throw new Error(`Plano desconhecido: ${id}`);
  return plan;
}

/** Aplica desconto arredondando para o centavo — sempre a favor do cliente. */
export function applyDiscount(cents: number, percentOff: number) {
  const clamped = Math.min(Math.max(percentOff, 0), 90);
  return Math.floor(cents * (1 - clamped / 100));
}

export type PlanPricing = {
  plan: Plan;
  listPriceCents: number;
  finalPriceCents: number;
  /** Preço por dia do período — a âncora que faz o plano longo parecer barato. */
  perDayCents: number;
  savingsCents: number;
  percentOff: number;
};

export function priceFor(plan: Plan, percentOff: number): PlanPricing {
  const finalPriceCents = applyDiscount(plan.listPriceCents, percentOff);
  return {
    plan,
    listPriceCents: plan.listPriceCents,
    finalPriceCents,
    perDayCents: Math.round(finalPriceCents / plan.days),
    savingsCents: plan.listPriceCents - finalPriceCents,
    percentOff,
  };
}

export function priceAll(percentOff: number): PlanPricing[] {
  return plans.map((plan) => priceFor(plan, percentOff));
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(cents: number) {
  return BRL.format(cents / 100);
}

/** Bônus empilhados: valor percebido exibido riscado, entregue junto do plano. */
export const bonuses = [
  {
    title: "Guia de socialização",
    description: "Apresentar seu cão a gente, cães e barulho sem trauma.",
    valueCents: 3990,
  },
  {
    title: "Ansiedade de separação",
    description: "Protocolo de dessensibilização para ficar sozinho sem sofrer.",
    valueCents: 4990,
  },
  {
    title: "Por que meu cão late",
    description: "Identificar o gatilho e cortar o latido na raiz.",
    valueCents: 2990,
  },
  {
    title: "50+ jogos de faro",
    description: "Gastar energia mental em 10 minutos, dentro de casa.",
    valueCents: 1990,
  },
] as const;

export const bonusTotalCents = bonuses.reduce((sum, b) => sum + b.valueCents, 0);
