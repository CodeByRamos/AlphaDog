import { cn } from "@/lib/utils";

/**
 * Card flutuante do hero.
 *
 * `depth` governa a profundidade inteira de uma vez: o quanto o card reage ao
 * ponteiro (parallax) e quão difusa é a sombra. Um número só mantém a cena
 * coerente.
 *
 * As camadas são separadas de propósito — parallax, flutuação, inclinação e
 * hover animam `transform`, e empilhá-las no mesmo elemento faria uma
 * sobrescrever a outra.
 */
export type FloatingCardProps = {
  children: React.ReactNode;
  /** Posicionamento absoluto dentro da cena. */
  className?: string;
  /** 0 = colado ao celular, 1 = bem à frente. */
  depth?: number;
  /** Inclinação de repouso, em graus. */
  tilt?: number;
  /** Atraso de entrada, em ms. */
  delay?: number;
  /** Duração do loop de flutuação, em segundos. */
  floatDuration?: number;
};

export function FloatingCard({
  children,
  className,
  depth = 0.5,
  tilt = 0,
  delay = 0,
  floatDuration = 6,
}: FloatingCardProps) {
  return (
    <div className={cn("absolute", className)}>
      {/* 1. parallax do ponteiro */}
      <div
        style={{
          transform: `translate3d(calc(var(--px, 0) * ${(depth * 26).toFixed(1)}px), calc(var(--py, 0) * ${(depth * 22).toFixed(1)}px), 0)`,
          willChange: "transform",
        }}
      >
        {/* 2. entrada */}
        <div
          style={{
            animation: "ad-pop 620ms var(--ease-out-back) both",
            animationDelay: `${delay}ms`,
          }}
        >
          {/* 3. flutuação contínua */}
          <div
            style={{
              animation: `ad-float ${floatDuration}s ease-in-out infinite`,
              animationDelay: `${delay + 400}ms`,
            }}
          >
            {/* 4. inclinação de repouso */}
            <div style={{ transform: `rotate(${tilt}deg)` }}>
              {/* 5. hover */}
              <div className="shadow-float hover:shadow-float-hover ring-ink-900/5 rounded-2xl bg-white p-3 ring-1 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-1">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
