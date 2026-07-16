import {
  CalendarCheck,
  Gamepad2,
  Flame,
  MessageCircleQuestion,
  PlayCircle,
  ShieldAlert,
} from "lucide-react";
import { Container, Section, SectionHeader } from "@/components/ui/section";
import { features } from "@/lib/content/marketing";

/** Ícones na mesma ordem de `features` — o conteúdo permanece livre de JSX. */
const icons = [
  CalendarCheck,
  PlayCircle,
  Gamepad2,
  ShieldAlert,
  MessageCircleQuestion,
  Flame,
];

export function FeatureGrid() {
  return (
    <Section>
      <Container>
        <SectionHeader
          eyebrow="O que você recebe"
          title="Tudo que o seu cão precisa, num lugar só"
          subtitle="Sem playlist infinita, sem conselho contraditório. Um caminho, na ordem certa."
        />

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = icons[i];
            return (
              <li
                key={feature.title}
                className="border-ink-100 rounded-card hover:shadow-card group border bg-white p-7 transition-shadow"
              >
                <span className="bg-alpha-50 text-alpha-700 group-hover:bg-alpha-500 group-hover:text-ink-900 mb-5 flex size-12 items-center justify-center rounded-full transition-colors">
                  <Icon className="size-6" />
                </span>
                <h3 className="text-lg">{feature.title}</h3>
                <p className="text-ink-500 mt-2 leading-relaxed">
                  {feature.description}
                </p>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
