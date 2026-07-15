import Link from "next/link";
import { Check } from "lucide-react";
import { AlphaDogMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { hero } from "@/lib/content/marketing";
import { routes } from "@/lib/routes";

export function Hero() {
  return (
    <section className="bg-ink-900 text-bone relative overflow-hidden">
      {/* Halo âmbar decorativo — puramente visual. */}
      <div
        aria-hidden
        className="bg-alpha-500/15 pointer-events-none absolute top-[-18rem] right-[-14rem] h-[38rem] w-[38rem] rounded-full blur-3xl"
      />
      <Container className="relative py-20 sm:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-8">
            <p className="border-ink-700 text-alpha-500 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-[0.12em] uppercase">
              {hero.eyebrow}
            </p>

            <h1 className="text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">
              {hero.title}
            </h1>

            <p className="text-ink-300 max-w-xl text-lg leading-relaxed">
              {hero.subtitle}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href={routes.quiz}>{hero.ctaPrimary}</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="text-ink-300 hover:bg-ink-800 hover:text-bone"
              >
                <Link href={routes.signIn}>{hero.ctaSecondary}</Link>
              </Button>
            </div>

            <p className="text-ink-400 text-sm">{hero.disclaimer}</p>
          </div>

          <ul className="space-y-3">
            {hero.pillars.map((pillar) => (
              <li
                key={pillar.title}
                className="border-ink-700 bg-ink-800/60 rounded-card flex items-center gap-4 border p-5"
              >
                <span className="bg-alpha-500/12 text-alpha-500 flex size-11 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-5" />
                </span>
                <span>
                  <span className="font-display block font-bold">{pillar.title}</span>
                  <span className="text-ink-400 text-sm">{pillar.description}</span>
                </span>
              </li>
            ))}
            <li className="flex items-center justify-center gap-3 pt-4">
              <AlphaDogMark className="text-ink-600 size-6" />
              <span className="text-ink-500 text-xs tracking-wide uppercase">
                Método positivo · Sem punição
              </span>
            </li>
          </ul>
        </div>
      </Container>
    </section>
  );
}
