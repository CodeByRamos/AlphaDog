import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPlan, type PlanId } from "./pricing";
import {
  grantsAccess,
  type PaymentStatus,
  type SubscriptionStatus,
  type SyncPayEvent,
} from "./syncpay/events";

/**
 * Escrita da camada de assinatura, com a chave de serviço.
 *
 * A `service_role` IGNORA o RLS. Ela existe exatamente para o webhook poder
 * gravar em tabelas onde o cliente não tem permissão de escrita — que é o que
 * impede o tutor de se conceder acesso pelo celular.
 *
 * Por isso este arquivo é `server-only` e a chave nunca tem prefixo público. Se
 * ela chegasse ao navegador, qualquer visitante teria acesso administrativo ao
 * banco inteiro: leitura de todos os usuários, escrita em qualquer tabela.
 */

let cached: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL são obrigatórias para processar pagamentos.",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/**
 * Registra a intenção de pagamento ANTES de falar com o gateway.
 *
 * A ordem importa: a linha nasce primeiro para que o seu id vá como referência
 * externa na cobrança. Se a chamada à SyncPay falhar depois disso, sobra um
 * registro pendente — barato e rastreável. O inverso seria pior: cobrança criada
 * no gateway sem nenhum registro nosso é dinheiro entrando sem dono, e o
 * postback chegaria sem ter a que se referir.
 */
export async function createPendingPayment(input: {
  userId: string;
  planId: PlanId;
  amountCents: number;
  method: string;
}): Promise<string> {
  const { data, error } = await admin()
    .from("payments")
    .insert({
      user_id: input.userId,
      plan_id: input.planId,
      amount_cents: input.amountCents,
      method: input.method,
      status: "pending",
      gateway: "syncpay",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Não foi possível registrar o pagamento: ${error?.message ?? "sem retorno"}`);
  }
  return data.id as string;
}

/** Guarda o id da transação assim que a SyncPay o devolve. */
export async function attachTransaction(paymentId: string, transactionId: string) {
  const { error } = await admin()
    .from("payments")
    .update({ transaction_id: transactionId, updated_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) {
    // Não derruba o checkout: o PIX já foi gerado e o tutor pode pagar. O
    // postback ainda encontra o pagamento pela referência externa.
    console.error("[billing] falha ao vincular transação", { paymentId, error: error.message });
  }
}

export type ApplyOutcome =
  | "applied"
  | "duplicate"
  | "unknown_reference"
  | "ignored";

/**
 * Aplica um evento do gateway ao estado da assinatura.
 *
 * Toda a decisão de dinheiro acontece dentro de funções do Postgres
 * (`apply_paid_payment`, `revoke_payment`) porque idempotência precisa ser
 * atômica. Verificar "já está pago?" aqui e gravar depois abriria a janela em
 * que dois postbacks simultâneos passam os dois pela verificação e estendem o
 * acesso duas vezes. No banco, conferir e escrever são a mesma instrução.
 */
export async function applyEvent(
  event: SyncPayEvent,
  options: { confirmedByGateway: boolean },
): Promise<ApplyOutcome> {
  const reference = event.reference;
  if (!reference) return "unknown_reference";

  const { data: payment, error } = await admin()
    .from("payments")
    .select("id, plan_id, status")
    .eq("id", reference)
    .maybeSingle();

  if (error || !payment) return "unknown_reference";

  if (grantsAccess(event.status)) {
    // Liberar acesso exige confirmação vinda do gateway, não do corpo recebido.
    // Sem ela o pagamento fica em processamento e um humano decide — melhor um
    // cliente esperando cinco minutos que acesso vitalício para quem forjou um
    // POST.
    if (!options.confirmedByGateway) {
      await setStatus(reference, "processing", event.rawStatus);
      return "ignored";
    }

    const plan = getPlan(payment.plan_id as PlanId);
    const { data, error: rpcError } = await admin().rpc("apply_paid_payment", {
      p_payment_id: reference,
      p_days: plan.days,
      p_transaction_id: event.transactionId,
      p_end_to_end: event.endToEnd,
      p_raw_status: event.rawStatus,
    });

    if (rpcError) throw new Error(`Falha ao ativar assinatura: ${rpcError.message}`);
    return data === true ? "applied" : "duplicate";
  }

  if (event.status === "refunded" || event.status === "chargeback") {
    const { data, error: rpcError } = await admin().rpc("revoke_payment", {
      p_payment_id: reference,
      p_status: event.status,
      p_raw_status: event.rawStatus,
    });
    if (rpcError) throw new Error(`Falha ao revogar acesso: ${rpcError.message}`);
    return data === true ? "applied" : "duplicate";
  }

  // Pendente, em processamento, falhou, cancelado: só anota. Nenhum deles mexe
  // no período — quem já pagou antes continua com o acesso que comprou.
  if (payment.status === "paid") return "duplicate";
  await setStatus(reference, event.status, event.rawStatus);
  return "applied";
}

async function setStatus(paymentId: string, status: PaymentStatus, rawStatus: string) {
  const { error } = await admin()
    .from("payments")
    .update({ status, raw_status: rawStatus, updated_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) throw new Error(`Falha ao atualizar pagamento: ${error.message}`);
}

/** Grava o postback como chegou, tenha ele sido aceito ou não. */
export async function recordEvent(input: {
  payload: unknown;
  transactionId: string | null;
  reference: string | null;
  rawStatus: string | null;
  authenticated: boolean;
  outcome: string;
}) {
  const { error } = await admin().from("payment_events").insert({
    gateway: "syncpay",
    transaction_id: input.transactionId,
    reference: input.reference,
    raw_status: input.rawStatus,
    payload: input.payload as never,
    authenticated: input.authenticated,
    outcome: input.outcome,
  });

  if (error) {
    // Auditoria que falha não pode derrubar o processamento do pagamento.
    console.error("[billing] falha ao gravar auditoria", error.message);
  }
}

export type SubscriptionRow = {
  status: SubscriptionStatus;
  planId: string | null;
  currentPeriodEnd: string | null;
  nextChargeAt: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethod: string | null;
};

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await admin()
    .from("subscriptions")
    .select(
      "status, plan_id, current_period_end, next_charge_at, cancel_at_period_end, payment_method",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    status: data.status as SubscriptionStatus,
    planId: data.plan_id,
    currentPeriodEnd: data.current_period_end,
    nextChargeAt: data.next_charge_at,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    paymentMethod: data.payment_method,
  };
}

/**
 * O acesso está liberado agora?
 *
 * Duas condições, e as duas precisam valer: estado ativo E período no futuro.
 * Só o estado não basta — uma assinatura fica marcada "active" com a data
 * vencida até alguém rodar a rotina de expiração, e quem confere é este ponto.
 */
export function hasAccess(subscription: SubscriptionRow | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== "active" && subscription.status !== "trialing") return false;
  if (!subscription.currentPeriodEnd) return false;
  return new Date(subscription.currentPeriodEnd).getTime() > Date.now();
}

/** Estado de um pagamento, para a tela de checkout acompanhar. */
export async function getPaymentStatus(
  paymentId: string,
  userId: string,
): Promise<PaymentStatus | null> {
  const { data, error } = await admin()
    .from("payments")
    .select("status, user_id")
    .eq("id", paymentId)
    .maybeSingle();

  // Confere o dono: sem isso, quem tivesse um id de pagamento alheio leria o
  // estado da compra de outra pessoa.
  if (error || !data || data.user_id !== userId) return null;
  return data.status as PaymentStatus;
}
