import Link from "next/link";
import { Clock, GraduationCap, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { hero } from "@/lib/content/marketing";
import { routes } from "@/lib/routes";
import { PhoneScene } from "./phone-scene";

/** Ícones das features, resolvidos pela chave que vem do conteúdo. */
const FEATURE_ICON = {
  paw: PawPrint,
  cap: GraduationCap,
  clock: Clock,
} as const;

/** Escada de entrada — cada bloco entra 90ms depois do anterior. */
const rise = (delay: number) => ({
  animation: "ad-rise 700ms var(--ease-out-quart) both",
  animationDelay: `${delay}ms`,
});

/**
 * Hero.
 *
 * A ordem muda entre mobile e desktop:
 *   mobile  — eyebrow, título, selo, celular, botões, features
 *   desktop — coluna de texto à esquerda, cena à direita
 *
 * Para isso o wrapper de texto usa `display: contents` no mobile: seus filhos
 * viram itens diretos do flex e podem ser ordenados ao redor da cena. A partir
 * de `lg` ele volta a ser uma caixa e assume a coluna esquerda do grid. Sem
 * isso, os botões ficariam presos dentro do bloco de texto e o celular nunca
 * cairia entre o título e o CTA.
 *
 * Só a cena é client component — texto e LCP ficam fora do bundle.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <Container width="wide">
        <div className="flex flex-col items-center py-10 lg:grid lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-8 lg:py-16">
          <div className="contents lg:flex lg:flex-col lg:items-start">
            <p
              style={rise(0)}
              className="border-alpha-200 bg-alpha-50/60 order-3 mt-7 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 lg:order-1 lg:mt-0"
            >
              <span className="font-display text-alpha-700 text-[0.625rem] font-extrabold tracking-[0.1em] uppercase">
                {hero.badge.label}
              </span>
              <span className="text-ink-600 text-xs font-semibold">
                {hero.badge.text}
              </span>
            </p>

            <p
              style={rise(90)}
              className="text-trust-500 order-1 text-center text-sm font-semibold tracking-[0.14em] uppercase lg:order-2 lg:mt-8 lg:text-left"
            >
              {hero.eyebrow}
            </p>

            <h1
              style={rise(180)}
              className="order-2 mt-2 text-center text-[2.25rem] leading-[1.05] sm:text-5xl lg:order-3 lg:text-left lg:text-[3.75rem]"
            >
              {hero.title}
            </h1>

            <p
              style={rise(225)}
              className="text-ink-500 order-2 mt-4 max-w-xl text-center text-base leading-relaxed lg:order-3 lg:text-left lg:text-lg"
            >
              {hero.subtitle}
            </p>

            <div
              style={rise(270)}
              className="order-5 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center lg:order-4 lg:mt-8 lg:max-w-none lg:justify-start"
            >
              <Button asChild size="lg">
                <Link href={routes.quiz}>{hero.ctaPrimary}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={routes.method}>{hero.ctaSecondary}</Link>
              </Button>
            </div>

            <div
              style={rise(360)}
              className="border-ink-100 order-6 mt-7 w-full border-t pt-6 lg:order-5"
            >
              <ul className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-7 lg:justify-start">
                {hero.features.map((feature) => {
                  const Icon = FEATURE_ICON[feature.icon];
                  return (
                    <li
                      key={feature.label}
                      className="text-trust-500 flex items-center gap-2 text-sm font-semibold"
                    >
                      <Icon aria-hidden className="text-ink-900 size-4 shrink-0" />
                      {feature.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="order-4 w-full scale-[0.86] sm:scale-95 lg:order-none lg:scale-100">
            <PhoneScene />
          </div>
        </div>
      </Container>
    </section>
  );
}
