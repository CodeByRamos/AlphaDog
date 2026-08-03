import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Container, Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { getSubscription, hasAccess } from "@/features/billing/subscriptions";
import { SUBSCRIPTION_LABELS } from "@/features/billing/syncpay/events";
import { formatBRL, getPlan } from "@/features/billing/pricing";

export const metadata: Metadata = {
  title: "Minha assinatura",
  robots: { index: false, follow: false },
};

/**
 * Estado da assinatura do tutor.
 *
 * Renderizada no servidor, lendo o banco. A alternativa — buscar no navegador
 * — exigiria expor o estado por uma API pública e abriria a porta para alguém
 * consultar a assinatura alheia trocando um id na URL.
 *
 * Não há botão de cancelar cobrança recorrente porque não existe cobrança
 * recorrente: cada período é um PIX avulso. "Cancelar" é simplesmente não
 * renovar, e dizer isso claramente evita o chamado de quem procura o botão.
 */
export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function SubscriptionPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return (
      <Section>
        <Container className="max-w-lg text-center">
          <h1 className="text-3xl">Minha assinatura</h1>
          <p className="text-ink-500 mt-4">
            Entre na sua conta para ver o estado da sua assinatura.
          </p>
          <Button className="mt-6" asChild>
            <a href="/assinar">Entrar</a>
          </Button>
        </Container>
      </Section>
    );
  }

  const subscription = await getSubscription(user.id);
  const active = hasAccess(subscription);
  const plan = subscription?.planId
    ? (() => {
        try {
          return getPlan(subscription.planId as never);
        } catch {
          // Plano arquivado ou removido do catálogo: mostrar o slug cru é
          // melhor que quebrar a página de quem pagou por ele.
          return null;
        }
      })()
    : null;

  return (
    <Section>
      <Container className="max-w-lg">
        <h1 className="text-3xl">Minha assinatura</h1>
        <p className="text-ink-500 mt-2 text-sm">{user.email}</p>

        <div className="shadow-card border-ink-100 mt-8 space-y-4 rounded-2xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <span className="text-ink-500 text-sm">Situação</span>
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                active ? "bg-green-100 text-green-800" : "bg-ink-100 text-ink-700"
              }`}
            >
              {subscription ? SUBSCRIPTION_LABELS[subscription.status] : "Sem assinatura"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-ink-500 text-sm">Plano</span>
            <span className="font-semibold">
              {plan ? plan.name : (subscription?.planId ?? "—")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-ink-500 text-sm">Acesso até</span>
            <span className="font-semibold">
              {formatDate(subscription?.currentPeriodEnd ?? null)}
            </span>
          </div>

          {plan && (
            <div className="flex items-center justify-between">
              <span className="text-ink-500 text-sm">Valor do período</span>
              <span className="font-semibold">{formatBRL(plan.listPriceCents)}</span>
            </div>
          )}
        </div>

        {active ? (
          <div className="mt-6 space-y-3">
            <p className="text-ink-600 text-sm">
              Seu acesso está liberado no aplicativo. Para continuar depois de{" "}
              {formatDate(subscription?.currentPeriodEnd ?? null)}, basta renovar
              — não há débito automático nem cobrança surpresa.
            </p>
            <Button className="w-full" asChild>
              <a href="/assinar">Renovar ou trocar de plano</a>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-ink-600 text-sm">
              {subscription?.status === "refunded"
                ? "O valor foi devolvido e o acesso encerrado."
                : subscription?.status === "past_due"
                  ? "Há uma contestação em aberto nesta assinatura. Fale com a gente para resolver."
                  : "Você ainda não tem acesso liberado ao aplicativo."}
            </p>
            <Button className="w-full" asChild>
              <a href="/assinar">Assinar agora</a>
            </Button>
          </div>
        )}

        {/* Dito de frente, porque é a dúvida número um de quem paga por PIX. */}
        <p className="text-ink-500 mt-6 text-center text-xs">
          Não existe cobrança automática. Cada período é pago uma vez, e o acesso
          vale até a data acima.
        </p>
      </Container>
    </Section>
  );
}
