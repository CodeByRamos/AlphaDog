import { Plus } from "lucide-react";
import { Container, Section, SectionHeader } from "@/components/ui/section";
import { faq } from "@/lib/content/marketing";

/**
 * `details/summary` nativo: acessível por padrão, indexável pelo Google e sem
 * JavaScript no cliente.
 */
export function FaqSection() {
  return (
    <Section>
      <Container width="narrow">
        <SectionHeader title="Perguntas frequentes" />

        <div className="mt-12 space-y-3">
          {faq.map((item) => (
            <details
              key={item.question}
              className="group border-ink-100 rounded-card open:shadow-card border bg-white transition-shadow"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden">
                <h3 className="text-base sm:text-lg">{item.question}</h3>
                <Plus
                  aria-hidden
                  className="text-alpha-600 size-5 shrink-0 transition-transform duration-200 group-open:rotate-45"
                />
              </summary>
              <p className="text-ink-500 px-6 pb-6 leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
