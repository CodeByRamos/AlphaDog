import "server-only";
import { authorizedRequest } from "./client";
import { getSyncPayConfig, webhookUrl } from "./config";

/**
 * Criação e consulta de cobrança PIX na SyncPay.
 *
 * TUDO NESTE ARQUIVO FOI MEDIDO CONTRA A API REAL, com credenciais de produção,
 * porque a documentação pública diverge do comportamento em três pontos que
 * custariam caro. As evidências estão anotadas junto de cada decisão.
 *
 *   POST /v1/gateway/api                      cria a cobrança
 *   GET  /api/partner/v1/transaction/{id}     consulta o estado
 *
 * LIMITE REAL DO GATEWAY, e ele molda o produto: a SyncPay faz cash-in por PIX,
 * sem cobrança recorrente automática. Não existe "assinatura" do lado dela que
 * renove sozinha. A recorrência do AlphaDog é nossa: cada PIX confirmado
 * ESTENDE o período de acesso, e a renovação é uma cobrança nova.
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

/**
 * Endereço do comprador.
 *
 * OBRIGATÓRIO, e a documentação não diz isso — ela lista `customer.address`
 * como um objeto de campos opcionais. A API respondeu 422 exigindo TODOS eles:
 *
 *   customer.address.city / state / street / country / zipCode /
 *   neighborhood / streetNumber — "field is required"
 *
 * Por isso o tipo não tem nada opcional: faltar um campo aqui não vira erro de
 * TypeScript no futuro, vira cobrança recusada no meio do checkout.
 */
export type CustomerAddress = {
  zipCode: string;
  street: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
};

export type CreateChargeInput = {
  /** Id do nosso registro de pagamento. Volta no webhook como externalreference. */
  reference: string;
  amountCents: number;
  description: string;
  customer: {
    name: string;
    email: string;
    /** CPF só com dígitos. */
    cpf: string;
    /** Telefone só com dígitos. Obrigatório — a API responde 422 sem ele. */
    phone: string;
    address: CustomerAddress;
  };
  /** IP de quem está comprando — a SyncPay usa para antifraude. */
  ip?: string;
};

/**
 * Valor mínimo aceito pela SyncPay.
 *
 * Medido: `amount: 0.99` devolveu 500; `amount: 1.99` passou e gerou uma
 * cobrança de R$ 1,99. Barrar aqui transforma um erro genérico do gateway numa
 * mensagem que diz o que fazer.
 */
export const MIN_CHARGE_CENTS = 100;

/**
 * Converte centavos para o que a SyncPay espera em `amount`.
 *
 * A UNIDADE É REAIS, NÃO CENTAVOS, e essa é a descoberta mais cara deste
 * arquivo. A documentação diz apenas "integer". Foi medido assim:
 *
 *   enviado  amount: 100
 *   gerado   payload PIX com valor.original = "100.00"   → R$ 100,00
 *
 * Ou seja, `amount` é 1:1 com o real. Se o código tivesse ido ao ar tratando
 * como centavos, o plano de R$ 49,90 teria cobrado R$ 4.990,00 de cada cliente.
 *
 * Decimais FUNCIONAM — `amount: 1.99` gerou valor.original "1.99". O 500 que o
 * 0.99 devolveu era o valor mínimo, não o formato. Por isso a divisão preserva
 * os centavos em vez de arredondar: R$ 49,90 continua R$ 49,90.
 */
function toGatewayAmount(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

/**
 * Data de expiração do PIX.
 *
 * O campo se chama `expiresInDays`, mas NÃO aceita um número de dias: a API
 * responde 422 com "The pix.expires in days field must be a valid date". O nome
 * mente; o formato exigido é uma data.
 */
function expiresOn(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

/** Quanto tempo o tutor tem para pagar antes de a cobrança expirar. */
const PIX_VALID_DAYS = 1;

type GatewayResponse = {
  status?: string;
  message?: string;
  paymentCode?: string;
  idTransaction?: string;
  paymentCodeBase64?: string;
  status_transaction?: string;
};

export async function createPixCharge(input: CreateChargeInput): Promise<PixCharge> {
  if (input.amountCents < MIN_CHARGE_CENTS) {
    throw new Error(
      `Valor abaixo do mínimo aceito pelo gateway (R$ ${(MIN_CHARGE_CENTS / 100).toFixed(2)}).`,
    );
  }

  const config = getSyncPayConfig();
  const amount = toGatewayAmount(input.amountCents);

  const body = {
    amount,
    // A SyncPay usa o IP no antifraude; sem ele a cobrança ainda sai.
    ip: input.ip ?? "0.0.0.0",
    pix: { expiresInDays: expiresOn(PIX_VALID_DAYS) },
    items: [
      {
        title: input.description,
        quantity: 1,
        tangible: false,
        // Mesma unidade do `amount`: a soma dos itens precisa bater com o total.
        unitPrice: amount,
      },
    ],
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      cpf: input.customer.cpf,
      phone: input.customer.phone,
      // Campo grafado assim na API da SyncPay (sem o "l" de "external"). É por
      // ele que o webhook volta sabendo de qual pagamento nosso se trata.
      externaRef: input.reference,
      address: {
        zipCode: input.customer.address.zipCode,
        street: input.customer.address.street,
        streetNumber: input.customer.address.streetNumber,
        neighborhood: input.customer.address.neighborhood,
        city: input.customer.address.city,
        state: input.customer.address.state,
        country: "BR",
        complement: input.customer.address.complement ?? "",
      },
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
 * Caminho de consulta de uma transação.
 *
 * Descoberto por sondagem contra a API real, com um id de transação válido:
 * de nove candidatos plausíveis, só este respondeu 200. O corpo vem em `data`,
 * com `status`, `amount` e `currency`.
 *
 * Continua sobrescrevível por variável de ambiente caso a SyncPay mude o
 * caminho — mas não depende mais dela para funcionar.
 */
const DEFAULT_STATUS_PATH = "/api/partner/v1/transaction/{id}";

/**
 * Reconfere uma transação direto na SyncPay.
 *
 * É a segunda camada de segurança do webhook: como os postbacks não trazem
 * assinatura, nenhum evento libera acesso só por ter chegado. Quem confirma que
 * o dinheiro entrou é o gateway, consultado por um caminho que o atacante não
 * controla.
 *
 * Devolve `null` em qualquer falha — e a camada de cima trata `null` como "não
 * confirmado", nunca como "confirmado". Falhar aqui atrasa um acesso legítimo;
 * o contrário daria acesso a quem forjou um POST.
 */
export async function fetchTransactionStatus(
  transactionId: string,
): Promise<string | null> {
  const template = process.env.SYNCPAY_STATUS_PATH?.trim() || DEFAULT_STATUS_PATH;
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
