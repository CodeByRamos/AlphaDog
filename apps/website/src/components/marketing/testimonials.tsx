import { Star } from "lucide-react";
import { Container, Section, SectionHeader } from "@/components/ui/section";
import { testimonials } from "@/lib/content/marketing";

export function Testimonials() {
  return (
    <Section className="bg-white">
      <Container>
        <SectionHeader
          eyebrow="Quem já treina"
          title="Resultado que aparece na guia, não no papel"
        />

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <li
              key={item.author}
              className="border-ink-100 rounded-card flex flex-col border bg-white p-7"
            >
              <div aria-label="5 de 5 estrelas" className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    aria-hidden
                    className="fill-alpha-500 text-alpha-500 size-4"
                  />
                ))}
              </div>

              <blockquote className="text-ink-700 mt-4 flex-1 leading-relaxed">
                “{item.quote}”
              </blockquote>

              <footer className="border-ink-100 mt-5 border-t pt-4">
                <p className="font-display font-bold">{item.author}</p>
                <p className="text-ink-500 text-sm">{item.dog}</p>
              </footer>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
