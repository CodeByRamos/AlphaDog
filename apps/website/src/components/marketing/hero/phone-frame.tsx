import { HudScene } from "./hud-scene";

/**
 * Mockup do celular.
 *
 * O aparelho é CSS puro (moldura, ilha dinâmica, brilho da borda) — nenhum
 * asset. A tela mostra a cena de visão computacional (HudScene): o cão sob
 * análise de postura, que é o que o produto é. Arte conceitual — a honestidade
 * sobre "ainda em treinamento" vive na seção da câmera logo abaixo.
 */
export function PhoneFrame() {
  return (
    <div className="bg-ink-950 ring-ink-700/60 relative h-[560px] w-[276px] rounded-[3rem] p-[10px] shadow-[0_40px_90px_-20px_rgb(11_14_20/0.45)] ring-1">
      {/* Brilho da borda de alumínio. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[3rem] bg-gradient-to-br from-white/25 via-transparent to-white/10"
      />

      <div className="bg-ink-950 relative h-full w-full overflow-hidden rounded-[2.4rem]">
        <HudScene />
      </div>

      {/* Ilha dinâmica — acima da tela para não ser coberta pela cena. */}
      <div
        aria-hidden
        className="bg-ink-950 absolute top-[22px] left-1/2 z-10 h-[26px] w-[86px] -translate-x-1/2 rounded-full"
      />
    </div>
  );
}
