import { Container, Section, SectionHeader } from "@/components/ui/section";
import { howItWorks } from "@/lib/content/marketing";

export function HowItWorks() {
  return (
    <Section className="bg-white">
      <Container>
        <SectionHeader
          eyebrow="Como funciona"
          title="Do caos ao plano em três passos"
        />

        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {howItWorks.map((item) => (
            <li key={item.step} className="relative">
              <span
                aria-hidden
                className="font-display text-alpha-200 block text-6xl font-extrabold"
              >
                {item.step}
              </span>
              <h3 className="mt-2 text-xl">{item.title}</h3>
              <p className="text-ink-500 mt-2 leading-relaxed">{item.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
