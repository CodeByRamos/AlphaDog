import { describe, expect, it } from "vitest";
import {
  grantsAccess,
  normalizePaymentStatus,
  parseSyncPayEvent,
  subscriptionStatusFor,
  syncPayWebhookSchema,
} from "./events";

/**
 * Os testes deste arquivo protegem dinheiro.
 *
 * Um erro na tradução de estados não dá exceção nem tela vermelha: dá acesso
 * liberado sem pagamento, ou tutor pagante trancado do lado de fora. Nenhum dos
 * dois aparece em log.
 */

describe("normalizePaymentStatus", () => {
  it("reconhece os sinônimos de pago que gateways brasileiros usam", () => {
    for (const raw of ["paid", "approved", "completed", "complete", "success"]) {
      expect(normalizePaymentStatus(raw)).toBe("paid");
    }
  });

  it("ignora caixa e espaço", () => {
    expect(normalizePaymentStatus("  COMPLETED ")).toBe("paid");
  });

  it("estado desconhecido NUNCA vira pago", () => {
    // A regra mais importante do arquivo. Um status novo inventado pela SyncPay
    // — ou por quem forjar um postback — não pode liberar o produto.
    for (const raw of ["", "qualquer_coisa", "PAID_MAYBE", "liberado"]) {
      const status = normalizePaymentStatus(raw);
      expect(grantsAccess(status)).toBe(false);
      expect(status).toBe("pending");
    }
  });

  it("reconhece os estados que a API devolve de verdade", () => {
    // Observados em chamada real, e ausentes da documentação: WAITING_FOR_APPROVAL
    // vem na criação da cobrança; ATIVA, no payload dinâmico do PIX. Os dois
    // significam "ainda não pagou" e não podem virar acesso liberado.
    expect(normalizePaymentStatus("WAITING_FOR_APPROVAL")).toBe("pending");
    expect(normalizePaymentStatus("ATIVA")).toBe("pending");
  });

  it("separa recusa, cancelamento, reembolso e contestação", () => {
    expect(normalizePaymentStatus("refused")).toBe("failed");
    expect(normalizePaymentStatus("cancelled")).toBe("canceled");
    expect(normalizePaymentStatus("refunded")).toBe("refunded");
    expect(normalizePaymentStatus("chargeback")).toBe("chargeback");
  });
});

describe("grantsAccess", () => {
  it("só 'paid' libera", () => {
    expect(grantsAccess("paid")).toBe(true);
    for (const s of ["pending", "processing", "failed", "canceled", "refunded", "chargeback"] as const) {
      expect(grantsAccess(s)).toBe(false);
    }
  });
});

describe("subscriptionStatusFor", () => {
  it("traduz cada estado de pagamento para o da assinatura", () => {
    expect(subscriptionStatusFor("paid")).toBe("active");
    expect(subscriptionStatusFor("processing")).toBe("processing");
    expect(subscriptionStatusFor("pending")).toBe("incomplete");
    expect(subscriptionStatusFor("failed")).toBe("failed");
    expect(subscriptionStatusFor("canceled")).toBe("canceled");
    expect(subscriptionStatusFor("refunded")).toBe("refunded");
  });

  it("contestação vira inadimplência, não cancelamento", () => {
    // A diferença importa: cancelado é decisão do cliente e encerra o caso;
    // inadimplente com disputa aberta precisa de atendimento humano.
    expect(subscriptionStatusFor("chargeback")).toBe("past_due");
  });
});

describe("syncPayWebhookSchema", () => {
  const valid = {
    data: {
      id: "abc",
      status: "completed",
      amount: 4990,
      idtransaction: "tx_1",
      externalreference: "pay_1",
    },
  };

  it("aceita o corpo documentado", () => {
    expect(syncPayWebhookSchema.safeParse(valid).success).toBe(true);
  });

  it("aceita campos novos sem reclamar", () => {
    // A SyncPay pode acrescentar campos a qualquer momento. Recusar o postback
    // por causa de uma chave desconhecida seria perder um pagamento legítimo.
    const withExtras = { data: { ...valid.data, campo_novo: true, outro: { a: 1 } } };
    expect(syncPayWebhookSchema.safeParse(withExtras).success).toBe(true);
  });

  it("recusa corpo sem status", () => {
    // Sem status não há o que decidir; aceitar seria gravar um evento mudo.
    const rest: Record<string, unknown> = { ...valid.data };
    delete rest.status;
    expect(syncPayWebhookSchema.safeParse({ data: rest }).success).toBe(false);
  });

  it("aceita amount como texto", () => {
    // Gateways alternam entre número e string na mesma API; um "4990" recusado
    // por não ser number seria pagamento perdido.
    const asText = { data: { ...valid.data, amount: "4990" } };
    expect(syncPayWebhookSchema.safeParse(asText).success).toBe(true);
  });
});

describe("parseSyncPayEvent", () => {
  it("extrai transação, referência e valor", () => {
    const event = parseSyncPayEvent({
      data: {
        status: "completed",
        amount: 4990,
        idtransaction: "tx_1",
        externalreference: "pay_1",
        end_to_end: "E123",
      },
    });

    expect(event.transactionId).toBe("tx_1");
    expect(event.reference).toBe("pay_1");
    expect(event.status).toBe("paid");
    expect(event.amountCents).toBe(4990);
    expect(event.endToEnd).toBe("E123");
  });

  it("aceita as duas grafias do id de transação", () => {
    // A documentação usa `idtransaction` no webhook e `idTransaction` na
    // resposta da cobrança. Perder um pagamento por causa de uma letra
    // maiúscula seria absurdo.
    const camel = parseSyncPayEvent({ data: { status: "pending", idTransaction: "tx_2" } });
    expect(camel.transactionId).toBe("tx_2");
  });

  it("cai para o campo id quando não há id de transação", () => {
    const event = parseSyncPayEvent({ data: { status: "pending", id: 77 } });
    expect(event.transactionId).toBe("77");
  });

  it("guarda o status cru mesmo traduzindo", () => {
    // É o que permite descobrir um estado novo olhando a auditoria, em vez de
    // ver tudo virar "pending" sem explicação.
    const event = parseSyncPayEvent({ data: { status: "ESTADO_NOVO" } });
    expect(event.rawStatus).toBe("ESTADO_NOVO");
    expect(event.status).toBe("pending");
  });
});
