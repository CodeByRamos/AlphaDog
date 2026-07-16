import Link from "next/link";
import { Check } from "lucide-react";
import { AlphaDogMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Container, Section, SectionHeader } from "@/components/ui/section";
import { comparison } from "@/lib/content/marketing";
import { routes } from "@/lib/routes";

export function ComparisonTable() {
  return (
    <Section>
      <Container>
        <SectionHeader title={comparison.title} subtitle={comparison.subtitle} />

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-2">
          <div className="border-ink-100 rounded-card border bg-white p-8">
            <h3 className="text-ink-400 text-sm font-bold tracking-[0.12em] uppercase">
              Alternativas
            </h3>
            <dl className="divide-ink-100 mt-5 divide-y">
              {comparison.rows.map((row) => (
                <div
                  key={row.service}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-4"
                >
                  <dt className="text-ink-700">{row.service}</dt>
                  <dd className="text-ink-500 font-semibold">{row.price}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="border-alpha-300 bg-alpha-50 rounded-card shadow-lift border-2 p-8">
            <div className="flex items-center gap-3">
              <AlphaDogMark className="text-alpha-600 size-7" />
              <h3 className="text-ink-900 font-display text-sm font-bold tracking-[0.12em] uppercase">
                {comparison.alphadog.label}
              </h3>
            </div>

            <p className="font-display text-alpha-700 mt-5 text-4xl font-extrabold">
              {comparison.alphadog.price}
            </p>

            <ul className="mt-6 space-y-3">
              {comparison.alphadog.included.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="text-sage-600 mt-0.5 size-5 shrink-0" />
                  <span className="text-ink-700">{item}</span>
                </li>
              ))}
            </ul>

            <Button asChild size="lg" block className="mt-8">
              <Link href={routes.quiz}>Montar o plano do meu cão</Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
