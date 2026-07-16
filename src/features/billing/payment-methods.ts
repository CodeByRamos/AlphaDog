import type { PlanId } from "./pricing";

/**
 * Meios de pagamento aceitos.
 *
 * A lista é fechada de propósito: PIX, crédito e débito. Boleto, PayPal,
 * carteiras e cripto ficam fora — como é um `const` tipado, adicionar um método
 * exige mexer aqui, não em algum formulário perdido.
 */
export const PAYMENT_METHODS = ["pix", "credit_card", "debit_card"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentMethodInfo = {
  id: PaymentMethod;
  label: string;
  description: string;
  /** Parcelamento só existe no crédito. */
  supportsInstallments: boolean;
  /** PIX confirma na hora; cartão pode cair em análise. */
  settlement: "instant" | "authorization";
};

export const paymentMethods: readonly PaymentMethodInfo[] = [
  {
    id: "pix",
    label: "PIX",
    description: "Aprovação na hora, sem taxa.",
    supportsInstallments: false,
    settlement: "instant",
  },
  {
    id: "credit_card",
    label: "Cartão de crédito",
    description: "Parcele em até 12x.",
    supportsInstallments: true,
    settlement: "authorization",
  },
  {
    id: "debit_card",
    label: "Cartão de débito",
    description: "Débito à vista na sua conta.",
    supportsInstallments: false,
    settlement: "authorization",
  },
];

export const MAX_INSTALLMENTS = 12;

export function getPaymentMethod(id: PaymentMethod) {
  const method = paymentMethods.find((m) => m.id === id);
  if (!method) throw new Error(`Meio de pagamento não suportado: ${id}`);
  return method;
}

/**
 * Contrato do gateway.
 *
 * Nenhum provedor está integrado. A interface existe para que a escolha entre
 * Asaas, Mercado Pago, Pagar.me ou Stripe Brasil seja uma implementação nova, e
 * não uma reescrita do domínio — o resto do código só conhece este contrato.
 */
export type CheckoutIntent = {
  planId: PlanId;
  method: PaymentMethod;
  /** Sempre 1 fora do crédito. */
  installments: number;
  /** Em centavos, já com desconto aplicado e validado no servidor. */
  amountCents: number;
  offerId?: string;
  customer: { email: string; name?: string; taxId?: string };
};

export type CheckoutSession = {
  id: string;
  /** Para redirecionar ao gateway, quando ele hospeda a página. */
  redirectUrl?: string;
  /** PIX: payload copia-e-cola e QR. */
  pix?: { qrCode: string; copyPaste: string; expiresAt: string };
  status: "pending" | "paid" | "failed" | "expired";
};

export interface PaymentProvider {
  readonly name: string;
  readonly supports: readonly PaymentMethod[];
  createCheckout(intent: CheckoutIntent): Promise<CheckoutSession>;
  getCheckout(id: string): Promise<CheckoutSession | null>;
  /** Valida assinatura do webhook antes de qualquer efeito colateral. */
  verifyWebhook(payload: string, signature: string): Promise<boolean>;
}
