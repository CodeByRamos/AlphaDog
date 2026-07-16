import { Container, Section } from "@/components/ui/section";

export type LegalSection = {
  heading: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

/**
 * Layout único das páginas legais.
 *
 * O conteúdo é dado; o layout, componente. Assim revisar um termo é editar um
 * arquivo de conteúdo, sem tocar em JSX.
 */
export function LegalPage({
  title,
  updatedAt,
  intro,
  sections,
}: {
  title: string;
  updatedAt: string;
  intro?: string;
  sections: readonly LegalSection[];
}) {
  return (
    <Section>
      <Container width="prose">
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
          <p className="text-ink-400 text-sm">Última atualização: {updatedAt}</p>
          {intro && <p className="text-ink-600 text-lg leading-relaxed">{intro}</p>}
        </header>

        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="text-xl">{section.heading}</h2>
              {section.paragraphs.map((p) => (
                <p key={p} className="text-ink-600 leading-relaxed">
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className="text-ink-600 mt-3 space-y-2">
                  {section.bullets.map((b) => (
                    <li key={b} className="flex gap-3 leading-relaxed">
                      <span aria-hidden className="text-alpha-500 mt-1.5 shrink-0">
                        •
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </Container>
    </Section>
  );
}
