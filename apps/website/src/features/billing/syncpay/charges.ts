import "server-only";
import { authorizedRequest } from "./client";
import { getSyncPayConfig, webhookUrl } from "./config";

/**
 * Criação e consulta de cobrança PIX na SyncPay.
 *
 * Endpoint confirmado na documentação oficial:
 *   POST /v1/gateway/api
 *   -> { status, message, client_id, urlWebHook, paymentCode,
 *        idTransaction, paymentCodeBase64, status_transaction }
 *
 * `paymentCode` é o copia-e-cola do PIX; `paymentCodeBase64`, a imagem do QR.
 *
 * LIMITE REAL DO GATEWAY, e ele molda o produto: a SyncPay documenta cash-in
 * por PIX, sem cobrança recorrente automática. Não existe "assinatura" do lado
 * dela que renove sozinha no cartão. A recorrência do AlphaDog é nossa: cada
 * PIX confirmado ESTENDE o período de acesso, e a renovação é uma nova cobrança
 * — o que também é o comportamento que o público brasileiro entende melhor.
 * Fingir renovação automática aqui geraria acesso vencido sem cobrança.
 */

export type PixCharge = {
  /** Identificador da transação na SyncPay. */
  transactionId: string;
  /** Copia-e-cola do PIX. */
  copyPaste: string;
  /** QR em base64, quando a SyncPay devolve. */
  qrCodeBase64?: string;
  /** Estado inicial informado pela SyncPay. */
  status: string;
};

export type CreateChargeInput = {
  /** Id do nosso registro de pagamento. Volta no webhook como externalreference. */
  reference: string;
  amountCents: number;
  description: string;
  customer: {
    name: string;
    email: string;
    /** CPF só com dígitos. A SyncPay exige para gerar o PIX. */
    cpf: string;
    phone?: string;
  };
  /** IP de quem está comprando — a SyncPay usa para antifraude. */
  ip?: string;
};

/**
 * Unidade que a SyncPay espera no campo `amount`.
 *
 * A documentação diz apenas "integer", sem afirmar se são centavos ou reais.
 * Errar isso cobra cem vezes a mais ou a menos do cliente — não é detalhe para
 * deduzir. Fica como variável de ambiente, com centavos por padrão (a convenção
 * da maioria dos gateways brasileiros), para ser confirmado com uma cobrança de
 * teste no sandbox antes de abrir vendas. O procedimento está em docs/SYNCPAY.md.
 */
function toGatewayAmount(cents: number): number {
  const unit = process.env.SYNCPAY_AMOUNT_UNIT?.trim();
  return unit === "reais" ? Math.round(cents / 100) : cents;
}

type GatewayResponse = {
  status?: string;
  message?: string;
  paymentCode?: string;
  idTransaction?: string;
  paymentCodeBase64?: string;
  status_transaction?: string;
};

export async function createPixCharge(input: CreateChargeInput): Promise<PixCharge> {
  const config = getSyncPayConfig();

  const body = {
    amount: toGatewayAmount(input.amountCents),
    // A SyncPay usa o IP no antifraude; sem ele a cobrança ainda sai.
    ip: input.ip ?? "0.0.0.0",
    pix: { expiresInDays: "1" },
    items: [
      {
        title: input.description,
        quantity: 1,
        tangible: false,
        unitPrice: toGatewayAmount(input.amountCents),
      },
    ],
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      cpf: input.customer.cpf,
      phone: input.customer.phone ?? "",
      // Campo grafado assim na API da SyncPay. É por ele que o webhook volta
      // sabendo de qual pagamento nosso se trata.
      externaRef: input.reference,
    },
    metadata: {
      provider: "alphadog",
      user_email: input.customer.email,
    },
    traceable: true,
    postbackUrl: webhookUrl(config),
  };

  const response = await authorizedRequest<GatewayResponse>(
    "/v1/gateway/api",
    { method: "POST", body: JSON.stringify(body) },
    "cash-in",
    config,
  );

  if (!response?.idTransaction || !response.paymentCode) {
    throw new Error(
      `SyncPay aceitou a requisição mas não devolveu cobrança utilizável (${response?.message ?? "sem mensagem"}).`,
    );
  }

  return {
    transactionId: response.idTransaction,
    copyPaste: response.paymentCode,
    qrCodeBase64: response.paymentCodeBase64,
    status: response.status_transaction ?? response.status ?? "pending",
  };
}

/**
 * Reconfere uma transação direto na SyncPay.
 *
 * É a segunda camada de segurança do webhook: como os postbacks não trazem
 * assinatura, nenhum evento libera acesso só por ter chegado. Quem confirma que
 * o dinheiro entrou é o gateway, consultado por um caminho que o atacante não
 * controla.
 *
 * O caminho de consulta varia conforme o contrato de cada parceiro; por isso
 * ele é configurável. Sem `SYNCPAY_STATUS_PATH` definido, a reconferência é
 * desligada — e a função devolve `null`, que a camada de cima trata como
 * "não confirmado por aqui", nunca como "confirmado".
 */
export async function fetchTransactionStatus(
  transactionId: string,
): Promise<string | null> {
  const template = process.env.SYNCPAY_STATUS_PATH?.trim();
  if (!template) return null;

  const path = template.replace("{id}", encodeURIComponent(transactionId));

  try {
    const response = await authorizedRequest<{
      status?: string;
      status_transaction?: string;
      data?: { status?: string };
    }>(path, { method: "GET" }, "consulta-transacao");

    return response?.data?.status ?? response?.status_transaction ?? response?.status ?? null;
  } catch (error) {
    console.error("[syncpay] falha ao reconferir transação", {
      transactionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
