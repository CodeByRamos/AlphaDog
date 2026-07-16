import type { Metadata } from "next";
import { DeliverableGrid } from "@/components/deliverables/deliverable-grid";
import { Container, Section } from "@/components/ui/section";
import { mockDeliverablesPage } from "@/features/deliverables/mock";
import type { DeliverablesState } from "@/features/deliverables/types";

export const metadata: Metadata = {
  title: "Seus materiais",
  description: "Os guias e materiais do programa do seu cão.",
  // Área do cliente: não deve ser indexada.
  robots: { index: false, follow: false },
};

export default function DeliverablesPage() {
  // Fonte provisória. Quando a API existir, isto vira um fetch e o resto do
  // componente não muda — o contrato é o mesmo.
  const state: DeliverablesState = { status: "ready", data: mockDeliverablesPage() };

  return (
    <Section>
      <Container width="wide">
        <header className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl">Seus materiais</h1>
          <p className="text-ink-500 mt-3 text-lg leading-relaxed">
            Tudo que acompanha o programa do seu cão, num lugar só.
          </p>
        </header>

        <div className="mt-12">
          <DeliverableGrid state={state} />
        </div>
      </Container>
    </Section>
  );
}
