import { Container, Section } from "@/components/ui/section";
import { whatIs } from "@/lib/content/marketing";

/**
 * "O que é" — vende o depois, não a lista de funções.
 *
 * Fundo bone para separar do hero branco sem quebrar o ritmo claro da página. A
 * abertura é uma cena concreta (o lead), e os quatro blocos são momentos do dia
 * do tutor quatro semanas à frente — cada um um benefício, não uma feature.
 */
export function WhatIsSection() {
  return (
    <Section className="bg-bone">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-alpha-700 text-sm font-bold tracking-[0.12em] uppercase">
            {whatIs.eyebrow}
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl">{whatIs.title}</h2>
          <p className="text-ink-600 mt-5 text-lg leading-relaxed text-balance">
            {whatIs.lead}
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-5 sm:grid-cols-2">
          {whatIs.blocks.map((block, i) => (
            <article
              key={block.title}
              className="shadow-card rounded-card border-ink-100/80 relative overflow-hidden border bg-white p-6 sm:p-7"
            >
              <span
                aria-hidden
                className="font-display text-alpha-100 absolute -top-3 right-3 text-6xl font-extrabold select-none"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="relative text-lg">{block.title}</h3>
              <p className="text-ink-500 relative mt-3 leading-relaxed">{block.body}</p>
            </article>
          ))}
        </div>

        <p className="text-ink-700 mx-auto mt-12 max-w-2xl text-center text-lg leading-relaxed font-medium text-balance">
          {whatIs.close}
        </p>
      </Container>
    </Section>
  );
}
