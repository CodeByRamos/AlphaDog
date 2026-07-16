"use client";

import {
  Check,
  ChevronRight,
  Flame,
  MessageCircle,
  Play,
  Sparkles,
} from "lucide-react";
import { heroCards } from "@/lib/content/marketing";
import { FloatingCard } from "./floating-card";
import { PhoneFrame } from "./phone-frame";
import { usePointerParallax } from "./use-pointer-parallax";

/**
 * Cena do hero: celular ao centro, cards flutuando ao redor.
 *
 * A cena inteira compartilha uma perspectiva, e o ponteiro inclina o palco em X
 * e Y. Cada card tem `depth` própria, então se deslocam em velocidades
 * diferentes — é a diferença de velocidade que cria a profundidade, não a
 * sombra.
 */
export function PhoneScene() {
  const sceneRef = usePointerParallax<HTMLDivElement>({ strength: 1, damping: 0.08 });

  return (
    /**
     * A cena tem largura fixa de 560px e é escalada por breakpoint, em vez de
     * reflowar. Os cards têm largura em px e posição em %: deixar o container
     * encolher engordaria os cards em relação ao celular e eles cobririam a
     * tela. Escalando o conjunto, a composição fica idêntica em qualquer
     * viewport.
     *
     * O wrapper carrega a altura porque `scale` não afeta layout — sem ele,
     * sobraria um buraco do tamanho da cena em escala 1.
     */
    <div
      ref={sceneRef}
      className="relative mx-auto h-[430px] w-full max-w-[560px] [perspective:1400px] sm:h-[560px] lg:h-[680px]"
    >
      {/* Halo atrás do aparelho. */}
      <div
        aria-hidden
        className="bg-trust-200/45 pointer-events-none absolute top-1/2 left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]"
      />

      {/* Centraliza e escala. Camada separada da rotação: as duas escrevem em
          `transform` e uma sobrescreveria a outra. */}
      <div className="absolute top-1/2 left-1/2 w-[560px] -translate-x-1/2 -translate-y-1/2 scale-[0.63] sm:scale-[0.82] lg:scale-100">
        {/* Inclinação do palco conforme o ponteiro. */}
        <div
          className="relative flex justify-center py-10"
          style={{
            transform:
              "rotateY(calc(var(--px, 0) * 5deg)) rotateX(calc(var(--py, 0) * -4deg))",
            transformStyle: "preserve-3d",
            willChange: "transform",
          }}
        >
          <div
            style={{
              animation: "ad-rise 800ms var(--ease-out-quart) both",
              animationDelay: "120ms",
              transform:
                "translate3d(calc(var(--px, 0) * 8px), calc(var(--py, 0) * 6px), 0) rotate(-3deg)",
            }}
          >
            <PhoneFrame />
          </div>

          {/* Comando dominado — topo esquerdo */}
          <FloatingCard
            className="top-[8%] -left-[2%] w-[190px] sm:left-[2%]"
            depth={0.95}
            tilt={-6}
            delay={520}
            floatDuration={6.4}
          >
            <div className="flex items-center gap-2.5">
              <span className="bg-alpha-50 flex size-11 shrink-0 items-center justify-center rounded-xl">
                <Sparkles className="text-alpha-600 size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-ink-400 text-[0.625rem] font-semibold tracking-wide uppercase">
                  {heroCards.command.title}
                </p>
                <p className="font-display text-base leading-tight font-extrabold">
                  {heroCards.command.name}
                </p>
              </div>
            </div>
            <span className="bg-sage-500 mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-bold text-white">
              <Check className="size-3" strokeWidth={3} />
              {heroCards.command.badge}
            </span>
          </FloatingCard>

          {/* Sequência — topo direito */}
          <FloatingCard
            className="top-[3%] right-[0%] w-[150px]"
            depth={0.75}
            tilt={5}
            delay={640}
            floatDuration={5.6}
          >
            <div className="flex items-center gap-2.5">
              <span className="bg-alpha-50 flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Flame className="text-alpha-600 size-5" />
              </span>
              <div>
                <p className="text-ink-400 text-[0.625rem] font-semibold">
                  {heroCards.streak.title}
                </p>
                <p className="font-display text-sm font-extrabold">
                  {heroCards.streak.value}
                </p>
              </div>
            </div>
          </FloatingCard>

          {/* Programa — meio esquerdo */}
          <FloatingCard
            className="top-[40%] -left-[4%] w-[200px]"
            depth={0.55}
            tilt={-4}
            delay={760}
            floatDuration={7.2}
          >
            <p className="mb-2 text-[0.6875rem] font-bold">{heroCards.program.title}</p>
            <ul className="space-y-1.5">
              {heroCards.program.rows.map((row, i) => (
                <li
                  key={row}
                  className="bg-ink-50 flex items-center gap-2 rounded-lg px-2 py-1.5"
                >
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
                      i === 0 ? "bg-sage-500" : "bg-ink-200"
                    }`}
                  >
                    {i === 0 && (
                      <Check className="size-2.5 text-white" strokeWidth={4} />
                    )}
                  </span>
                  <span className="text-ink-600 truncate text-[0.625rem]">{row}</span>
                </li>
              ))}
            </ul>
          </FloatingCard>

          {/* Especialistas — meio direito */}
          <FloatingCard
            className="top-[45%] -right-[3%] w-[180px]"
            depth={0.85}
            tilt={4}
            delay={880}
            floatDuration={6.8}
          >
            <p className="text-[0.6875rem] font-bold">{heroCards.experts.title}</p>
            <div className="bg-ink-900 mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5">
              <MessageCircle className="text-alpha-500 size-3.5" />
              <span className="text-[0.625rem] font-semibold text-white">
                {heroCards.experts.cta}
              </span>
            </div>
            <div className="mt-2 flex -space-x-2">
              {["bg-alpha-300", "bg-sage-300", "bg-trust-300", "bg-alpha-500"].map(
                (c) => (
                  <span
                    key={c}
                    className={`size-6 rounded-full ring-2 ring-white ${c}`}
                  />
                ),
              )}
            </div>
          </FloatingCard>

          {/* Vídeo-aula — baixo esquerdo */}
          <FloatingCard
            className="bottom-[6%] -left-[3%] w-[195px]"
            depth={1}
            tilt={-3}
            delay={1000}
            floatDuration={5.9}
          >
            <div className="flex items-center gap-2.5">
              <span className="bg-ink-900 flex size-11 shrink-0 items-center justify-center rounded-xl">
                <Play className="fill-alpha-500 text-alpha-500 size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-ink-400 text-[0.625rem] font-semibold">
                  {heroCards.lesson.title}
                </p>
                <p className="font-display truncate text-sm font-extrabold">
                  {heroCards.lesson.name}
                </p>
              </div>
              <span className="text-ink-400 ml-auto shrink-0 text-[0.625rem] font-bold">
                {heroCards.lesson.duration}
              </span>
            </div>
          </FloatingCard>

          {/* Dica — baixo direito. Fica fora da moldura para não cobrir o CTA
            do celular, que é o foco da cena. */}
          <FloatingCard
            className="-right-[4%] bottom-[16%] w-[175px]"
            depth={0.65}
            tilt={5}
            delay={1120}
            floatDuration={7.6}
          >
            <p className="text-[0.6875rem] font-bold">{heroCards.tip.title}</p>
            <p className="text-ink-500 mt-1 text-[0.625rem] leading-snug">
              {heroCards.tip.body}
            </p>
            <span className="text-alpha-700 mt-2 flex items-center justify-end gap-0.5 text-[0.625rem] font-bold">
              {heroCards.tip.cta}
              <ChevronRight className="size-3" />
            </span>
          </FloatingCard>
        </div>
      </div>
    </div>
  );
}
