import { Camera, Hand, Lock, ScanLine } from "lucide-react";
import { Container, Section } from "@/components/ui/section";
import { cameraSection } from "@/lib/content/marketing";

/**
 * A câmera — o diferencial do produto.
 *
 * Fundo ink (escuro) para destacar a seção mais tecnológica da página sem
 * inventar estética que o resto do site não tem. A honestidade é o argumento,
 * não um aparte: o selo "Em desenvolvimento" abre a seção, o que funciona hoje
 * ganha um card próprio, e a nota final admite em voz alta que o modelo não está
 * no ar. Vender no presente uma IA que não existe, num site que cobra, é
 * propaganda enganosa — aqui a ambição é vendida como roadmap incluído.
 */
export function CameraSection() {
  return (
    <Section className="bg-ink-900 text-white">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <span className="border-alpha-500/30 bg-alpha-500/10 text-alpha-300 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-[0.1em] uppercase">
            <ScanLine className="size-3.5" />
            {cameraSection.eyebrow}
          </span>
          <h2 className="mt-5 text-3xl text-white sm:text-4xl">{cameraSection.title}</h2>
          <p className="mt-5 text-lg leading-relaxed text-white/70 text-balance">
            {cameraSection.lead}
          </p>
        </div>

        <ol className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-2">
          {cameraSection.steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-card border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="flex items-center gap-3">
                <span className="border-alpha-500/30 text-alpha-400 font-display flex size-8 shrink-0 items-center justify-center rounded-lg border text-sm font-extrabold">
                  {i + 1}
                </span>
                <h3 className="text-base leading-tight text-white">{step.title}</h3>
              </div>
              <p className="mt-3 leading-relaxed text-white/60">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mx-auto mt-6 grid max-w-4xl gap-4 md:grid-cols-2">
          {/* O que já funciona — em destaque âmbar, porque é o que você compra hoje. */}
          <div className="rounded-card border-alpha-500/30 bg-alpha-500/[0.07] border p-6">
            <div className="text-alpha-300 flex items-center gap-2">
              <Hand className="size-4" />
              <span className="text-xs font-bold tracking-[0.1em] uppercase">
                Funciona hoje
              </span>
            </div>
            <h3 className="mt-3 text-lg text-white">{cameraSection.today.title}</h3>
            <p className="mt-2 leading-relaxed text-white/70">{cameraSection.today.body}</p>
          </div>

          {/* Privacidade — argumento de venda e verdade técnica ao mesmo tempo. */}
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center gap-2 text-white/80">
              <Lock className="size-4" />
              <span className="text-xs font-bold tracking-[0.1em] uppercase">
                Privacidade
              </span>
            </div>
            <p className="mt-3 leading-relaxed text-white/70">{cameraSection.privacy}</p>
          </div>
        </div>

        <p className="mx-auto mt-8 flex max-w-2xl items-start justify-center gap-2.5 text-center text-sm leading-relaxed text-white/50">
          <Camera className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{cameraSection.note}</span>
        </p>
      </Container>
    </Section>
  );
}
