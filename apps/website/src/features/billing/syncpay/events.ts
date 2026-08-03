import { z } from "zod";

/**
 * Contrato do postback da SyncPay e tradução para o domínio do AlphaDog.
 *
 * Este arquivo NÃO é `server-only` de propósito: ele é só formato e tradução,
 * sem credencial e sem acesso a banco. Assim os testes rodam sem ambiente e a
 * tela de estado da assinatura pode reaproveitar os mesmos rótulos.
 *
 * Formato confirmado na documentação oficial — o corpo vem embrulhado em `data`:
 *
 *   { "data": { "id", "status", "amount", "idtransaction",
 *               "externalreference", "end_to_end", "paymentcode", ... } }
 */

/**
 * Validação do corpo recebido.
 *
 * Deliberadamente TOLERANTE com campos extras e ESTRITA com os que decidem
 * dinheiro. A SyncPay pode acrescentar campos a qualquer momento, e recusar o
 * postback por causa de uma chave nova significaria perder um pagamento
 * legítimo. Já `status` e a identificação da transação não podem faltar: sem
 * eles não há o que decidir.
 *
 * `amount` aceita número ou texto porque gateways alternam entre os dois na
 * mesma API, e um `"4990"` recusado por não ser number é um pagamento perdido.
 */
export const syncPayWebhookSchema = z.object({
  data: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    status: z.string().min(1),
    amount: z.union([z.string(), z.number()]).optional(),
    idtransaction: z.string().optional(),
    idTransaction: z.string().optional(),
    externalreference: z.string().optional(),
    externalReference: z.string().optional(),
    end_to_end: z.string().nullish(),
    paymentcode: z.string().nullish(),
    client_email: z.string().nullish(),
    client_name: z.string().nullish(),
  }),
});

export type SyncPayWebhookBody = z.infer<typeof syncPayWebhookSchema>;

/**
 * Estado de um pagamento avulso, normalizado.
 *
 * Separado do estado da ASSINATURA porque são coisas diferentes: um pagamento
 * pode falhar sem que a assinatura caia, se o período anterior ainda vale.
 */
export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded"
  | "chargeback";

/** Estado da assinatura. Espelha o enum do banco. */
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "processing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "expired"
  | "refunded"
  | "failed";

/**
 * Tradução do vocabulário da SyncPay para o nosso.
 *
 * A lista cobre as variações que gateways brasileiros usam para a mesma coisa
 * (`paid`, `approved`, `completed`) porque a documentação mostra `pending` e
 * `completed` mas não promete que sejam os únicos. Reconhecer sinônimos é
 * barato; tratar "approved" como desconhecido custaria um acesso não liberado.
 *
 * O que NÃO for reconhecido vira `pending`, nunca `paid`. Estado desconhecido
 * jamais pode liberar acesso — é a diferença entre errar para o lado seguro e
 * dar o produto de graça para quem descobrir um status novo.
 */
const STATUS_MAP: Record<string, PaymentStatus> = {
  paid: "paid",
  approved: "paid",
  completed: "paid",
  complete: "paid",
  success: "paid",

  pending: "pending",
  waiting: "pending",
  waiting_payment: "pending",
  created: "pending",

  processing: "processing",
  in_process: "processing",
  analysis: "processing",

  failed: "failed",
  error: "failed",
  denied: "failed",
  rejected: "failed",
  refused: "failed",

  canceled: "canceled",
  cancelled: "canceled",
  expired: "canceled",

  refunded: "refunded",
  refund: "refunded",
  returned: "refunded",

  chargeback: "chargeback",
  chargedback: "chargeback",
  contested: "chargeback",
};

export function normalizePaymentStatus(raw: string): PaymentStatus {
  return STATUS_MAP[raw.trim().toLowerCase()] ?? "pending";
}

/** O pagamento libera acesso? Só um estado faz isso. */
export function grantsAccess(status: PaymentStatus): boolean {
  return status === "paid";
}

/**
 * Estado da assinatura decorrente de um pagamento.
 *
 * `paid` fica de fora porque virar "ativa" depende também da data: quem paga
 * hoje ganha período novo, e isso é decidido em quem grava, não aqui.
 */
export function subscriptionStatusFor(payment: PaymentStatus): SubscriptionStatus {
  switch (payment) {
    case "paid":
      return "active";
    case "processing":
      return "processing";
    case "pending":
      return "incomplete";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    case "refunded":
      return "refunded";
    case "chargeback":
      // Contestação é inadimplência com disputa aberta: o acesso cai e o caso
      // vai para atendimento humano.
      return "past_due";
  }
}

/** Rótulos para a interface. Um lugar só, para site e app dizerem o mesmo. */
export const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Em teste",
  active: "Ativa",
  processing: "Em processamento",
  past_due: "Inadimplente",
  canceled: "Cancelada",
  incomplete: "Pendente",
  expired: "Expirada",
  refunded: "Reembolsada",
  failed: "Falhou",
};

/**
 * Dados que interessam do postback, já normalizados.
 *
 * A SyncPay alterna maiúsculas em `idtransaction`/`idTransaction` conforme o
 * evento; aceitar as duas formas evita perder pagamento por causa de uma letra.
 */
export type SyncPayEvent = {
  transactionId: string | null;
  reference: string | null;
  status: PaymentStatus;
  rawStatus: string;
  amountCents: number | null;
  endToEnd: string | null;
};

export function parseSyncPayEvent(body: SyncPayWebhookBody): SyncPayEvent {
  const data = body.data;
  const amount = data.amount == null ? null : Number(data.amount);

  return {
    transactionId: data.idtransaction ?? data.idTransaction ?? (data.id != null ? String(data.id) : null),
    reference: data.externalreference ?? data.externalReference ?? null,
    status: normalizePaymentStatus(data.status),
    rawStatus: data.status,
    amountCents: Number.isFinite(amount) ? (amount as number) : null,
    endToEnd: data.end_to_end ?? null,
  };
}
