import Image from "next/image";
import { AlphaDogMark } from "@/components/brand/logo";
import { hero } from "@/lib/content/marketing";

/**
 * Mockup do celular.
 *
 * O aparelho é CSS puro (moldura, ilha dinâmica, brilho da borda) — nenhum
 * asset. Só a foto dentro da tela é imagem, e ela vive num slot próprio.
 */
export function PhoneFrame() {
  return (
    <div className="bg-ink-950 ring-ink-700/60 relative h-[560px] w-[276px] rounded-[3rem] p-[10px] shadow-[0_40px_90px_-20px_rgb(11_14_20/0.45)] ring-1">
      {/* Brilho da borda de alumínio. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[3rem] bg-gradient-to-br from-white/25 via-transparent to-white/10"
      />

      <div className="bg-sage-700 relative h-full w-full overflow-hidden rounded-[2.4rem]">
        {/* Slot da foto — trocar por foto real de cães mantém tudo no lugar. */}
        <Image
          src="/brand/hero-app-dogs.png"
          alt="Cães felizes durante uma sessão de treino"
          fill
          priority
          sizes="276px"
          className="object-cover"
        />

        {/* Legibilidade do texto sobre a foto. */}
        <div
          aria-hidden
          className="from-ink-950/55 to-ink-950/70 absolute inset-0 bg-gradient-to-b via-transparent"
        />

        <div className="relative flex h-full flex-col p-5 text-white">
          <div className="mt-7 flex items-center justify-center gap-2">
            <AlphaDogMark className="text-alpha-500 size-6" />
            <span className="font-display text-lg font-extrabold">
              Alpha<span className="text-alpha-500">Dog</span>
            </span>
          </div>
          <p className="mt-1 text-center text-xs text-white/80">{hero.phone.tagline}</p>

          <div className="mt-auto space-y-2.5">
            <div className="bg-alpha-500 text-ink-900 rounded-xl py-2.5 text-center text-sm font-bold">
              {hero.phone.cta}
            </div>
            <p className="text-center text-[0.625rem] text-white/70">
              {hero.phone.footnote}{" "}
              <span className="text-alpha-400 font-semibold underline">
                {hero.phone.footnoteLink}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Ilha dinâmica. */}
      <div
        aria-hidden
        className="bg-ink-950 absolute top-[22px] left-1/2 h-[26px] w-[86px] -translate-x-1/2 rounded-full"
      />
    </div>
  );
}
