import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { finalCta } from "@/lib/content/marketing";
import { routes } from "@/lib/routes";

export function CtaBand() {
  return (
    <Section className="bg-white">
      <Container>
        <div className="rounded-card border-ink-100 bg-bone relative overflow-hidden border px-8 py-16 text-center sm:px-16">
          <div
            aria-hidden
            className="bg-alpha-200/40 pointer-events-none absolute bottom-[-12rem] left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full blur-3xl"
          />
          <div className="relative mx-auto max-w-xl space-y-6">
            <h2 className="text-3xl sm:text-4xl">{finalCta.title}</h2>
            <p className="text-ink-500 text-lg leading-relaxed">{finalCta.subtitle}</p>
            <Button asChild size="lg">
              <Link href={routes.quiz}>{finalCta.cta}</Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
