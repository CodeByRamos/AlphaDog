import { Container } from "@/components/ui/container";
import { stats } from "@/lib/content/marketing";

export function StatsBar() {
  return (
    <div className="border-ink-100 border-b bg-white">
      <Container>
        <dl className="grid grid-cols-2 gap-8 py-10 sm:grid-cols-4">
          {stats.map((stat) => (
            // flex-col-reverse: o valor aparece em cima, mas no HTML o <dt>
            // (rótulo) vem antes do <dd> (valor), como a semântica pede. Antes
            // o rótulo existia duas vezes — num dt oculto e de novo no dd — e o
            // leitor de tela anunciava tudo em dobro.
            <div key={stat.label} className="flex flex-col-reverse text-center">
              <dt className="text-ink-500 mt-1 text-sm">{stat.label}</dt>
              <dd className="font-display text-ink-900 text-3xl font-extrabold">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </div>
  );
}
