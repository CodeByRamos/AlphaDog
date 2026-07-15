import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlphaDogMark } from "@/components/brand/logo";
import { BonusStack } from "@/components/offer/bonus-stack";
import { Countdown } from "@/components/offer/countdown";
import { Guarantee } from "@/components/offer/guarantee";
import { LevelProgress } from "@/components/offer/level-progress";
import { PlanSelector } from "@/components/offer/plan-selector";
import { priceAll } from "@/features/billing/pricing";
import { personalizeOffer } from "@/features/offer/personalize";
import { faq } from "@/lib/content/marketing";
import { routes } from "@/lib/routes";
import { getCurrentOffer, getCurrentQuizSession } from "@/server/session";

export const metadata: Metadata = {
  title: "O plano do seu cão",
  robots: { index: false, follow: false },
};

export default async function OfferPage() {
  const session = await getCurrentQuizSession();

  // Sem funil respondido não há oferta: o preço depende das respostas.
  if (!session || Object.keys(session.answers).length === 0) {
    redirect(routes.quiz);
  }

  const offer = await getCurrentOffer();
  const percentOff = offer?.percentOff ?? 0;
  const pricing = priceAll(percentOff);
  const p = personalizeOffer(session.answers);

  return (
    <div className="bg-bone min-h-dvh">
      {offer && <Countdown expiresAt={offer.expiresAt} />}

      <main className="mx-auto w-full max-w-2xl space-y-6 px-5 py-10">
        <header className="text-center">
          <AlphaDogMark className="text-ink-900 mx-auto size-10" />
          <h1 className="mt-5 text-3xl sm:text-4xl">
            O plano {p.possessive} {p.dogName} está pronto
          </h1>
          {/* Sem toLowerCase: "SRD" é sigla e "Golden Retriever" é nome próprio. */}
          <p className="text-ink-500 mt-3 leading-relaxed">
            Montado para {p.breedLabel}, {p.ageLabel} — sessões de {p.minutesPerDay}{" "}
            minutos por dia.
          </p>
        </header>

        {p.focusAreas.length > 0 && (
          <div className="border-ink-100 rounded-card border bg-white p-7">
            <h2 className="text-lg">Onde vamos atacar primeiro</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {p.focusAreas.map((area) => (
                <li
                  key={area}
                  className="bg-alpha-50 text-alpha-800 font-display rounded-full px-3.5 py-1.5 text-sm font-bold"
                >
                  {area}
                </li>
              ))}
            </ul>
          </div>
        )}

        <LevelProgress levels={p.levels} />

        <section className="border-ink-100 rounded-card border bg-white p-7">
          <h2 className="text-lg">Escolha seu plano</h2>
          {percentOff > 0 && (
            <p className="text-sage-600 mt-1 text-sm font-semibold">
              Desconto de {percentOff}% aplicado.
            </p>
          )}
          <div className="mt-5">
            <PlanSelector pricing={pricing} />
          </div>
        </section>

        <BonusStack />
        <Guarantee />

        <section className="border-ink-100 rounded-card border bg-white p-7">
          <h2 className="text-lg">Dúvidas antes de começar</h2>
          <div className="mt-4 space-y-2">
            {faq.slice(0, 4).map((item) => (
              <details
                key={item.question}
                className="group border-ink-100 border-b pb-2"
              >
                <summary className="font-display cursor-pointer list-none py-3 font-bold [&::-webkit-details-marker]:hidden">
                  {item.question}
                </summary>
                <p className="text-ink-500 pb-3 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="text-ink-400 space-y-3 pb-10 text-center text-xs leading-relaxed">
          <p>
            A assinatura renova automaticamente ao fim do período. Cancele quando quiser
            na sua conta.
          </p>
          <p className="flex justify-center gap-4">
            <Link href={routes.terms} className="hover:text-ink-600 underline">
              Termos
            </Link>
            <Link href={routes.privacy} className="hover:text-ink-600 underline">
              Privacidade
            </Link>
            <Link
              href={routes.subscriptionPolicy}
              className="hover:text-ink-600 underline"
            >
              Política de assinatura
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
