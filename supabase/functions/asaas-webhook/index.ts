/**
 * Webhook do Asaas — a única porta por onde o status de assinatura muda.
 *
 * Por que Asaas, e não Stripe ou Mercado Pago:
 *   - PIX recorrente nativo (PIX Automático), que o Stripe não tem no Brasil.
 *     Stripe só faz PIX avulso, o que quebra o modelo de assinatura.
 *   - Cartão de crédito recorrente com retentativa automática de recusa.
 *   - Taxa por PIX (~R$ 1,99 fixo ou 0,99%) contra ~3,99% + R$ 0,39 do Stripe:
 *     numa mensalidade de R$ 49,90 a diferença é material.
 *   - Documentação e suporte em português, CNPJ brasileiro, sem exigir conta
 *     internacional.
 *   - Mercado Pago tem taxa competitiva mas a API de assinatura é mais instável
 *     e a documentação de webhooks é pior.
 *
 * O cliente NUNCA escreve em `subscriptions` — não existe policy de escrita para
 * o usuário (ver migration 0002). Quem grava é esta função, com a service_role,
 * que ignora RLS. É isso que impede o tutor de se conceder acesso adulterando o
 * app: o estado de pagamento nasce no gateway e entra por aqui.
 *
 * Deploy:
 *   supabase functions deploy asaas-webhook --no-verify-jwt
 *   supabase secrets set ASAAS_WEBHOOK_TOKEN=... SUPABASE_SERVICE_ROLE_KEY=...
 *
 * `--no-verify-jwt` é obrigatório: quem chama é o Asaas, que não tem JWT do
 * Supabase. A autenticação é feita pelo token abaixo.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

/** Dias de acesso concedidos por plano. Espelha PLANS em @alphadog/core. */
const PLAN_DAYS: Record<string, number> = {
  mensal: 30,
  trimestral: 90,
  semestral: 180,
};

/**
 * Eventos que interessam. O Asaas manda dezenas de tipos; reagir a todos seria
 * superfície de bug sem ganho.
 */
type AsaasEvent =
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_DELETED"
  | "SUBSCRIPTION_DELETED";

type AsaasPayload = {
  event: AsaasEvent;
  payment?: {
    id: string;
    customer: string;
    subscription?: string;
    value: number;
    billingType: "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "BOLETO";
    externalReference?: string;
    confirmedDate?: string;
  };
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  // Autenticação do remetente. Sem isto, qualquer um que descobrisse a URL
  // poderia conceder assinatura a si mesmo — o webhook viraria a porta dos
  // fundos que a RLS existe para fechar.
  const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!expected || req.headers.get("asaas-access-token") !== expected) {
    return json({ error: "não autorizado" }, 401);
  }

  let payload: AsaasPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }

  const { event, payment } = payload;
  if (!payment) return json({ ignored: event });

  // externalReference carrega o user_id do Supabase, gravado na criação da
  // cobrança. É o que amarra o pagamento à conta sem depender de e-mail, que o
  // usuário pode trocar.
  const userId = payment.externalReference;
  if (!userId) {
    console.error("pagamento sem externalReference", payment.id);
    return json({ error: "pagamento sem usuário vinculado" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // O plano vem do valor pago. Mapear por valor evita confiar num campo que o
  // cliente poderia manipular na criação da cobrança.
  const planId =
    payment.value >= 149 ? "semestral" : payment.value >= 89 ? "trimestral" : "mensal";

  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED": {
      // Estende a partir do fim do período atual, não de agora: quem paga
      // adiantado não perde os dias que já tinha.
      const { data: current } = await supabase
        .from("subscriptions")
        .select("current_period_end")
        .eq("user_id", userId)
        .maybeSingle();

      const now = new Date();
      const base =
        current?.current_period_end && new Date(current.current_period_end) > now
          ? new Date(current.current_period_end)
          : now;

      const end = new Date(base);
      end.setDate(end.getDate() + (PLAN_DAYS[planId] ?? 30));

      const { error } = await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          status: "active",
          plan_id: planId,
          current_period_end: end.toISOString(),
          payment_method: payment.billingType.toLowerCase(),
          gateway_customer_id: payment.customer,
          gateway_subscription_id: payment.subscription ?? null,
          cancel_at_period_end: false,
        },
        { onConflict: "user_id" },
      );

      if (error) {
        console.error("falha ao ativar assinatura", userId, error.message);
        // 500 faz o Asaas reenviar. Perder uma confirmação de pagamento é pior
        // que processar duas vezes — o upsert é idempotente por user_id.
        return json({ error: "falha ao gravar" }, 500);
      }

      console.log("assinatura ativa", userId, planId, end.toISOString());
      return json({ ok: true, status: "active", until: end.toISOString() });
    }

    case "PAYMENT_OVERDUE": {
      // Vencido não cancela: vira past_due, que já não libera acesso
      // (isSubscriptionActive só aceita active e trialing). Manter o registro
      // permite reativar quando o pagamento entrar.
      await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("user_id", userId);
      return json({ ok: true, status: "past_due" });
    }

    case "PAYMENT_REFUNDED":
    case "PAYMENT_DELETED":
    case "SUBSCRIPTION_DELETED": {
      await supabase
        .from("subscriptions")
        .update({ status: "canceled", cancel_at_period_end: true })
        .eq("user_id", userId);
      return json({ ok: true, status: "canceled" });
    }

    default:
      return json({ ignored: event });
  }
});
