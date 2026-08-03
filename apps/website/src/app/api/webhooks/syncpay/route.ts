import { NextResponse } from "next/server";
import { applyEvent, recordEvent } from "../../../../features/billing/subscriptions";
import { fetchTransactionStatus } from "../../../../features/billing/syncpay/charges";
import { isSyncPayConfigured } from "../../../../features/billing/syncpay/config";
import {
  grantsAccess,
  normalizePaymentStatus,
  parseSyncPayEvent,
  syncPayWebhookSchema,
} from "../../../../features/billing/syncpay/events";

/**
 * Postback da SyncPay.
 *
 * Aqui é onde o dinheiro vira acesso, e é o ponto mais atacável do sistema:
 * um POST bem-sucedido nesta rota libera o produto. Três camadas defendem isso.
 *
 * CAMADA 1 — SEGREDO NA URL.
 * A documentação da SyncPay não descreve assinatura HMAC nos postbacks: o corpo
 * chega sem cabeçalho para conferir. Na falta dele, a URL de retorno carrega um
 * segredo, comparado em tempo constante. Quem não o apresenta é recusado antes
 * de qualquer efeito.
 *
 * CAMADA 2 — RECONFERÊNCIA NO GATEWAY.
 * Segredo em URL vaza: aparece em log de proxy, em print de tela, em histórico
 * de navegador. Por isso ele não é a última palavra. Nenhum evento de "pago"
 * libera acesso apenas por ter chegado — o estado é reconferido direto na API
 * da SyncPay, por um caminho que o atacante não controla. Sem confirmação, o
 * pagamento fica "em processamento" e nada é liberado.
 *
 * CAMADA 3 — IDEMPOTÊNCIA NO BANCO.
 * A SyncPay desiste em 5 segundos e reenvia. Se cada chegada estendesse o
 * período, uma tentativa repetida daria meses de graça. A trava é a transição
 * de estado dentro do Postgres, onde conferir e escrever são a mesma instrução.
 *
 * A rota SEMPRE responde 200 depois de gravar a auditoria, mesmo recusando o
 * evento. Devolver erro faria a SyncPay reenviar em laço um postback que nunca
 * vai ser aceito. O que precisamos é do registro, e ele já foi feito.
 */

// O corpo precisa chegar cru e a resposta não pode ser cacheada: é um efeito
// colateral, não uma leitura.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Comparação em tempo constante.
 *
 * `a === b` sai no primeiro caractere diferente, e essa diferença de tempo é
 * mensurável pela rede: dá para descobrir o segredo caractere a caractere. Aqui
 * o laço percorre tudo sempre.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  if (!isSyncPayConfigured()) {
    // Sem credenciais não há como reconferir nada; aceitar seria confiar no
    // corpo recebido, que é exatamente o que não se pode fazer.
    return NextResponse.json({ received: false, reason: "gateway não configurado" }, { status: 503 });
  }

  const secret = process.env.SYNCPAY_WEBHOOK_SECRET!.trim();
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const authenticated = safeEqual(token, secret);

  const raw = await request.text();
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = { raw: raw.slice(0, 2000) };
  }

  if (!authenticated) {
    // Registrado, e não descartado em silêncio: uma sequência de recusas é o
    // sinal de que a URL vazou, e é a auditoria que revela isso.
    await recordEvent({
      payload,
      transactionId: null,
      reference: null,
      rawStatus: null,
      authenticated: false,
      outcome: "rejected",
    });
    return NextResponse.json({ received: false }, { status: 401 });
  }

  const parsed = syncPayWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    await recordEvent({
      payload,
      transactionId: null,
      reference: null,
      rawStatus: null,
      authenticated: true,
      outcome: "invalid_payload",
    });
    return NextResponse.json({ received: true, outcome: "invalid_payload" });
  }

  const event = parseSyncPayEvent(parsed.data);

  try {
    let confirmedByGateway = false;

    if (grantsAccess(event.status) && event.transactionId) {
      const remote = await fetchTransactionStatus(event.transactionId);
      // Sem caminho de consulta configurado, `remote` é null e a confirmação
      // NÃO acontece. Falha para o lado seguro: o pagamento fica em
      // processamento em vez de liberar acesso sem prova.
      confirmedByGateway = remote != null && grantsAccess(normalizePaymentStatus(remote));
    }

    const outcome = await applyEvent(event, { confirmedByGateway });

    await recordEvent({
      payload,
      transactionId: event.transactionId,
      reference: event.reference,
      rawStatus: event.rawStatus,
      authenticated: true,
      outcome,
    });

    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[syncpay] falha ao processar postback", { message });

    await recordEvent({
      payload,
      transactionId: event.transactionId,
      reference: event.reference,
      rawStatus: event.rawStatus,
      authenticated: true,
      outcome: "error",
    });

    // 500 aqui é intencional: erro NOSSO merece reenvio da SyncPay, ao
    // contrário de um evento recusado por regra, que nunca vai passar.
    return NextResponse.json({ received: false }, { status: 500 });
  }
}

/** GET responde para dar um jeito simples de checar a rota em produção. */
export function GET() {
  return NextResponse.json({
    endpoint: "syncpay-webhook",
    configured: isSyncPayConfigured(),
  });
}
