/**
 * Domínio de assinatura, compartilhado entre o app e o site.
 *
 * O catálogo de planos e a regra de "está ativa" vivem aqui, num pacote sem
 * React nem banco, para que o celular e o funil web concordem sobre o mesmo
 * usuário sem duplicar a lógica. Preço em centavos inteiros — nunca float, que
 * erra no extrato do cliente.
 */

export type PlanId = "mensal" | "trimestral" | "semestral";

export type Plan = {
  id: PlanId;
  name: string;
  /** Duração do acesso concedido por um ciclo. Com PIX avulso (CPF), cada
   *  pagamento estende o acesso por estes dias. */
  days: number;
  /** Preço do ciclo, em centavos. */
  priceCents: number;
  /** Destaque visual — só um plano é o recomendado. */
  featured?: boolean;
  badge?: string;
};

export const PLANS: readonly Plan[] = [
  { id: "mensal", name: "1 mês", days: 30, priceCents: 4990 },
  {
    id: "trimestral",
    name: "3 meses",
    days: 90,
    priceCents: 8990,
    featured: true,
    badge: "Mais escolhido",
  },
  { id: "semestral", name: "6 meses", days: 180, priceCents: 14990 },
] as const;

export const DEFAULT_PLAN_ID: PlanId = "trimestral";

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Plano desconhecido: ${id}`);
  return plan;
}

/** Preço equivalente por dia, para comparação honesta entre planos. */
export function pricePerDayCents(plan: Plan): number {
  return Math.round(plan.priceCents / plan.days);
}

/** "R$ 49,90" a partir de centavos. Formatação estável, sem depender de locale
 *  do dispositivo, que no Android pode vir trocado. */
export function formatBRL(cents: number): string {
  const reais = (cents / 100).toFixed(2).replace(".", ",");
  return `R$ ${reais}`;
}

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "expired",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type Subscription = {
  status: SubscriptionStatus;
  planId: PlanId | null;
  /** ISO. Null quando nunca houve cobrança confirmada. */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

/**
 * A assinatura dá acesso ao app?
 *
 * Ativa ou em teste, e dentro do período pago. `past_due` NÃO libera: cobrança
 * recusada tira o acesso até o novo pagamento entrar (reativação). A checagem de
 * data usa o relógio passado por quem chama — o app manda `Date.now()`, um teste
 * manda um instante fixo, e nenhum dos dois depende do relógio do módulo.
 */
export function isSubscriptionActive(
  sub: Subscription | null,
  nowMs: number,
): boolean {
  if (!sub) return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  if (sub.currentPeriodEnd === null) return sub.status === "trialing";
  return new Date(sub.currentPeriodEnd).getTime() > nowMs;
}
