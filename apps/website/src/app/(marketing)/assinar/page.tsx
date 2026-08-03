import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/section";
import { getSyncPayEnvironmentLabel } from "@/features/billing/environment";
import { SubscribeForm } from "./subscribe-form";

export const metadata: Metadata = {
  title: "Assinar o AlphaDog",
  description:
    "Ative o acesso ao aplicativo AlphaDog. Assine com o mesmo e-mail da sua conta e o app libera sozinho.",
  alternates: { canonical: "/assinar" },
  // Página de conversão de quem já decidiu; não deve competir com a landing na
  // busca nem aparecer para quem ainda está descobrindo o produto.
  robots: { index: false, follow: true },
};

/**
 * Nunca pré-renderizada.
 *
 * A página depende da sessão do usuário e das chaves do gateway, que só existem
 * em runtime. Gerar HTML estático dela no build significaria ou quebrar a
 * compilação por falta de variável, ou congelar um estado que não vale para
 * ninguém.
 */
export const dynamic = "force-dynamic";

/**
 * Onde a assinatura acontece.
 *
 * Fica no site, e não no aplicativo, por uma razão econômica: a Apple exige o
 * In-App Purchase dela para venda de conteúdo digital dentro do app iOS, com
 * comissão de 15 a 30%. Vendendo aqui, o app apenas reconhece um acesso que já
 * existe — o que a Guideline 3.1.3(b) permite explicitamente.
 *
 * A conta é a mesma do app porque o login é o mesmo Supabase. Sem isso, o
 * pagamento cairia numa identidade que o aplicativo não enxerga.
 */
/** Planos válidos, para não confiar no que vem da URL. */
const PLAN_IDS = ["mensal", "trimestral", "semestral"] as const;

export default async function AssinarPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const { plano } = await searchParams;
  const initialPlan = PLAN_IDS.find((p) => p === plano);

  return (
    <Section className="bg-bone">
      <Container>
        <div className="mx-auto max-w-lg">
          <div className="text-center">
            <p className="text-alpha-700 text-sm font-bold tracking-[0.12em] uppercase">
              Ativar acesso
            </p>
            <h1 className="mt-4 text-3xl sm:text-4xl">Assine e treine hoje</h1>
            <p className="text-ink-500 mt-4 leading-relaxed">
              Sua assinatura libera o aplicativo inteiro: plano montado para o seu
              cão, exercícios guiados, sessões cronometradas e histórico.
            </p>
          </div>

          {getSyncPayEnvironmentLabel().sandbox && (
            // Sem este aviso, um deploy esquecido em sandbox faria alguém achar
            // que pagou de verdade.
            <p className="border-alpha-300 bg-alpha-50 text-alpha-800 mt-8 rounded-xl border p-3 text-center text-sm font-semibold">
              Ambiente de testes — nenhuma cobrança real será feita.
            </p>
          )}

          <div className="shadow-card border-ink-100 mt-8 rounded-2xl border bg-white p-6 sm:p-8">
            <SubscribeForm initialPlan={initialPlan} />
          </div>

          <p className="text-ink-500 mt-6 text-center text-sm">
            Já assinou? Abra o aplicativo e entre com o mesmo e-mail — o acesso
            aparece sozinho.
          </p>
        </div>
      </Container>
    </Section>
  );
}
