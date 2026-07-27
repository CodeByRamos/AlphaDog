import "server-only";

import type { PlanId } from "./pricing";
import type { CheckoutSession, PaymentMethod } from "./payment-methods";

/**
 * Integração com o Asaas.
 *
 * Roda só no servidor (`server-only`): a chave de API dá poder de cobrar em nome
 * da empresa, e vazá-la para o navegador seria entregar o caixa. O cliente
 * chama a server action, nunca o Asaas direto.
 *
 * Por que Asaas e não Stripe ou Mercado Pago:
 *   - PIX recorrente nativo. O Stripe só faz PIX avulso no Brasil, o que
 *     quebra o modelo de assinatura.
 *   - Taxa de PIX de ~R$ 1,99 fixo contra ~3,99% + R$ 0,39 do Stripe. Numa
 *     mensalidade de R$ 49,90 a diferença é material.
 *   - Documentação em português e suporte com CNPJ brasileiro.
 */

const API = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
} as const;

function config() {
  const key = process.env.ASAAS_API_KEY;
  if (!key) {
    throw new Error(
      "ASAAS_API_KEY ausente. Defina em apps/website/.env.local — sem ela não " +
        "há como criar cobrança.",
    );
  }
  // Sandbox por padrão: um deploy esquecido não deve cobrar cliente de verdade.
  const env = process.env.ASAAS_ENV === "production" ? "production" : "sandbox";
  return { key, baseUrl: API[env], env };
}

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { key, baseUrl } = config();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      access_token: key,
      ...init?.headers,
    },
    // Cobrança nunca vem de cache.
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Asaas ${response.status} em ${path}: ${body.slice(0, 400)}`);
  }

  return response.json() as Promise<T>;
}

/** Meios do domínio -> nomes do Asaas. */
const BILLING_TYPE: Record<PaymentMethod, string> = {
  pix: "PIX",
  credit_card: "CREDIT_CARD",
  debit_card: "CREDIT_CARD", // O Asaas trata débito no mesmo fluxo de cartão.
};

type AsaasCustomer = { id: string };
type AsaasPayment = {
  id: string;
  status: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
};
type AsaasPixQr = { encodedImage: string; payload: string; expirationDate: string };

/**
 * Acha ou cria o cliente no Asaas.
 *
 * Busca por e-mail antes de criar: sem isso, cada renovação criaria um cliente
 * novo e o histórico do assinante ficaria fragmentado no painel.
 */
async function ensureCustomer(input: {
  email: string;
  name: string;
  taxId?: string;
}): Promise<string> {
  const found = await asaasFetch<{ data: AsaasCustomer[] }>(
    `/customers?email=${encodeURIComponent(input.email)}`,
  );
  if (found.data?.[0]) return found.data[0].id;

  const created = await asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      cpfCnpj: input.taxId,
      notificationDisabled: false,
    }),
  });
  return created.id;
}

export type CreateChargeInput = {
  /**
   * ID do usuário no Supabase Auth. Vai no `externalReference` e é o que amarra
   * o pagamento à conta do app — não o e-mail, que o usuário pode trocar.
   */
  userId: string;
  email: string;
  name: string;
  taxId?: string;
  planId: PlanId;
  method: PaymentMethod;
  amountCents: number;
};

/**
 * Cria a cobrança e devolve o que o navegador precisa mostrar.
 *
 * PIX volta com QR e copia-e-cola; cartão volta com a URL da fatura hospedada
 * pelo Asaas — assim os dados do cartão nunca passam pelo nosso servidor, o que
 * tira o site inteiro do escopo de PCI.
 */
export async function createCharge(input: CreateChargeInput): Promise<CheckoutSession> {
  const customerId = await ensureCustomer({
    email: input.email,
    name: input.name,
    taxId: input.taxId,
  });

  // Vence hoje: assinatura é acesso imediato, não boleto para daqui a uma semana.
  const dueDate = new Date().toISOString().slice(0, 10);

  const payment = await asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType: BILLING_TYPE[input.method],
      value: input.amountCents / 100,
      dueDate,
      description: `AlphaDog — plano ${input.planId}`,
      externalReference: input.userId,
    }),
  });

  if (input.method === "pix") {
    const qr = await asaasFetch<AsaasPixQr>(`/payments/${payment.id}/pixQrCode`);
    return {
      id: payment.id,
      status: "pending",
      pix: {
        qrCode: `data:image/png;base64,${qr.encodedImage}`,
        copyPaste: qr.payload,
        expiresAt: qr.expirationDate,
      },
    };
  }

  return {
    id: payment.id,
    status: "pending",
    redirectUrl: payment.invoiceUrl,
  };
}

/** Estado atual da cobrança, para a tela saber quando liberar. */
export async function getCharge(id: string): Promise<CheckoutSession | null> {
  try {
    const payment = await asaasFetch<AsaasPayment>(`/payments/${id}`);
    const paid = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(payment.status);
    return {
      id: payment.id,
      status: paid ? "paid" : payment.status === "OVERDUE" ? "expired" : "pending",
      redirectUrl: payment.invoiceUrl,
    };
  } catch {
    return null;
  }
}

/** O Asaas está em sandbox? A tela avisa, para ninguém achar que cobrou. */
export function isSandbox(): boolean {
  return process.env.ASAAS_ENV !== "production";
}
