import { Check, Clock3 } from "lucide-react";
import { Container, Section, SectionHeader } from "@/components/ui/section";
import { capabilities } from "@/lib/content/marketing";

/**
 * Tudo o que o serviço oferece, separado por status.
 *
 * `disponivel` recebe um check sage; `em-breve` recebe um selo âmbar — o mesmo
 * padrão do app. Marcar o roadmap como roadmap é o que mantém a página vendável
 * sem prometer o que ainda não existe.
 */
function StatusBadge({ status }: { status: "disponivel" | "em-breve" }) {
  if (status === "em-breve") {
    return (
      <span className="border-alpha-200 bg-alpha-50 text-alpha-700 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-bold tracking-wide uppercase">
        <Clock3 className="size-3" />
        Em breve
      </span>
    );
  }
  return (
    <span className="bg-sage-500 flex size-5 shrink-0 items-center justify-center rounded-full">
      <Check className="size-3 text-white" strokeWidth={3.5} />
    </span>
  );
}

export function CapabilitiesSection() {
  return (
    <Section className="bg-white">
      <Container>
        <SectionHeader
          eyebrow={capabilities.eyebrow}
          title={capabilities.title}
          subtitle={capabilities.lead}
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {capabilities.groups.map((group) => {
            const emBreve = group.items.every((i) => i.status === "em-breve");
            return (
              <section
                key={group.name}
                className={
                  "rounded-card border p-6 sm:p-8 " +
                  (emBreve
                    ? "border-alpha-200/70 bg-alpha-50/40"
                    : "border-ink-100 bg-bone/50")
                }
              >
                <h3 className="font-display text-ink-900 text-lg font-extrabold">
                  {group.name}
                </h3>
                <ul className="mt-5 space-y-5">
                  {group.items.map((item) => (
                    <li key={item.title} className="flex gap-3.5">
                      <span className="mt-0.5">
                        <StatusBadge status={item.status} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-ink-900 font-display flex flex-wrap items-center gap-2 font-bold">
                          {item.title}
                        </p>
                        <p className="text-ink-500 mt-1 text-sm leading-relaxed">
                          {item.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
