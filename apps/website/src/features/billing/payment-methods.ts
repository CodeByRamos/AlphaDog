import type { PlanId } from "./pricing";

/**
 * Meios de pagamento.
 *
 * HOJE SÓ PIX, e isso é constatação, não escolha de produto: a API que a
 * SyncPay documenta para receber é o cash-in por PIX (`POST /v1/gateway/api`),
 * cuja resposta traz `paymentCode` e `paymentCodeBase64` — copia-e-cola e QR.
 * Não há, na documentação pública, endpoint de cobrança em cartão nem de
 * recorrência automática.
 *
 * A lista é fechada e tipada de propósito: quando o cartão for habilitado no
 * contrato, adicioná-lo exige mexer aqui e escrever a chamada correspondente —
 * e não descobrir em produção que um botão bonito não cobra nada.
 */
export const PAYMENT_METHODS = ["pix"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentMethodInfo = {
  id: PaymentMethod;
  label: string;
  description: string;
  /** PIX confirma na hora; cartão cairia em análise. */
  settlement: "instant" | "authorization";
};

export const paymentMethods: readonly PaymentMethodInfo[] = [
  {
    id: "pix",
    label: "PIX",
    description: "Aprovação em segundos.",
    settlement: "instant",
  },
];

export function getPaymentMethod(id: PaymentMethod) {
  const method = paymentMethods.find((m) => m.id === id);
  if (!method) throw new Error(`Meio de pagamento não suportado: ${id}`);
  return method;
}

/**
 * Contrato do gateway.
 *
 * A SyncPay é o provedor atual e único. A interface continua existindo para que
 * trocar de provedor — ou somar um segundo — seja escrever uma implementação
 * nova, e não reescrever o domínio: quem chama conhece só este contrato.
 */
export type CheckoutIntent = {
  planId: PlanId;
  method: PaymentMethod;
  /** Em centavos, resolvido no servidor contra o catálogo. Nunca vem do cliente. */
  amountCents: number;
  /** Id do nosso registro de pagamento, enviado ao gateway como referência. */
  reference: string;
  customer: { email: string; name: string; cpf: string; phone?: string };
};

export type CheckoutSession = {
  /** Id da transação no gateway. */
  id: string;
  pix?: { copyPaste: string; qrCodeBase64?: string };
  status: "pending" | "paid" | "failed" | "expired";
};

export interface PaymentProvider {
  readonly name: string;
  readonly supports: readonly PaymentMethod[];
  createCheckout(intent: CheckoutIntent): Promise<CheckoutSession>;
  /** Reconfere o estado direto na fonte, para o webhook não ser a única palavra. */
  getCheckout(id: string): Promise<CheckoutSession | null>;
}
