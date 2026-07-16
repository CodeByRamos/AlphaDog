import { AlphaDogMark, Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const palette = [
  { name: "ink-900", className: "bg-ink-900" },
  { name: "alpha-500", className: "bg-alpha-500" },
  { name: "trust-500", className: "bg-trust-500" },
  { name: "sage-500", className: "bg-sage-500" },
  { name: "bone", className: "bg-bone border border-ink-200" },
];

export default function BrandPreviewPage() {
  return (
    <Container className="space-y-12 py-16">
      <section className="space-y-6">
        <h1 className="text-3xl">Marca</h1>
        <div className="rounded-card shadow-card flex flex-wrap items-end gap-10 bg-white p-8">
          <AlphaDogMark className="text-ink-900 h-24 w-24" />
          <AlphaDogMark className="text-alpha-500 h-16 w-16" />
          <Logo />
          <Logo markOnly />
        </div>
        <div className="rounded-card bg-ink-900 flex flex-wrap items-center gap-10 p-8">
          <AlphaDogMark className="text-alpha-500 h-24 w-24" />
          <Logo className="text-bone" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl">Paleta</h2>
        <div className="flex flex-wrap gap-4">
          {palette.map((c) => (
            <div key={c.name} className="space-y-2">
              <div className={`rounded-card h-20 w-32 ${c.className}`} />
              <p className="text-ink-500 text-sm">{c.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl">Botões</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg">
            Começar o quiz
          </Button>
          <Button variant="ink">Entrar</Button>
          <Button variant="outline">Saiba mais</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl">Tipografia</h2>
        <p className="font-display text-5xl font-extrabold">Sora Extrabold</p>
        <p className="text-ink-600 max-w-prose">
          Inter no corpo do texto. O AlphaDog cria um programa de adestramento a partir
          da raça, idade e comportamento do seu cão.
        </p>
      </section>
    </Container>
  );
}
