import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Brain, Clock, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Section, SectionHeader } from "@/components/ui/section";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Nosso método",
  description:
    "Reforço positivo, sessões curtas e ciência do comportamento animal. Sem coleira de choque, sem punição.",
  alternates: { canonical: "/metodo" },
};

const principles = [
  {
    icon: Brain,
    title: "O cão repete o que compensa",
    body: "Comportamento que gera algo bom se repete; o que não gera, some. Todo o método parte daí — em vez de punir o erro, tornamos o acerto vantajoso. É mais rápido, e não cobra o preço de um cão com medo de você.",
  },
  {
    icon: Clock,
    title: "Dez minutos valem mais que uma hora",
    body: "A atenção de um cão em treino dura poucos minutos. Sessão longa vira frustração para os dois. Sessões curtas e diárias consolidam o aprendizado — é assim que o cérebro dele fixa o que aprendeu.",
  },
  {
    icon: Repeat,
    title: "Constância bate intensidade",
    body: "Dez minutos por dia, seis dias por semana, ensinam mais que três horas no sábado. Por isso o plano é diário e curto: ele foi desenhado para você conseguir cumprir, não para impressionar.",
  },
  {
    icon: Ban,
    title: "Sem choque, sem enforcador, sem grito",
    body: "Punição suprime o comportamento na hora e cobra depois — em medo, em ansiedade e, às vezes, em agressividade. Não usamos, não ensinamos e não recomendamos. Nunca.",
  },
];

const steps = [
  {
    step: "01",
    title: "Diagnóstico",
    body: "O questionário mapeia raça, fase de vida, gatilhos de estresse, o que motiva seu cão e quanto tempo você tem. Nada de plano genérico.",
  },
  {
    step: "02",
    title: "Sequência",
    body: "Os exercícios entram numa ordem específica: cada um depende do anterior. É a ordem, mais que o exercício em si, que faz o treino pegar.",
  },
  {
    step: "03",
    title: "Generalização",
    body: "Sentar na cozinha não é sentar na rua. O plano leva cada comando de casa para o quintal, do quintal para a calçada, e da calçada para o mundo com distração.",
  },
  {
    step: "04",
    title: "Manutenção",
    body: "Comportamento não treinado enfraquece. A sequência diária e os desafios existem para manter o que já foi conquistado.",
  },
];

export default function MethodPage() {
  return (
    <>
      <Section className="bg-bone border-ink-100 border-b">
        <Container width="narrow">
          <p className="text-alpha-700 text-sm font-bold tracking-[0.12em] uppercase">
            Nosso método
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl">
            Cão não aprende apanhando. Aprende acertando.
          </h1>
          <p className="text-ink-500 mt-6 max-w-2xl text-lg leading-relaxed">
            O AlphaDog é construído sobre reforço positivo e ciência do comportamento
            animal — as mesmas bases usadas para treinar cães de detecção, de
            assistência e de resgate. Não é bondade: é o que funciona melhor.
          </p>
        </Container>
      </Section>

      <Section>
        <Container width="narrow">
          <SectionHeader align="left" title="Os quatro princípios" />
          <ul className="mt-12 space-y-5">
            {principles.map((p) => (
              <li
                key={p.title}
                className="border-ink-100 rounded-card flex gap-5 border bg-white p-7"
              >
                <span className="bg-alpha-50 text-alpha-700 flex size-12 shrink-0 items-center justify-center rounded-full">
                  <p.icon className="size-6" />
                </span>
                <div>
                  <h3 className="text-lg">{p.title}</h3>
                  <p className="text-ink-500 mt-2 leading-relaxed">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className="bg-white">
        <Container width="narrow">
          <SectionHeader
            align="left"
            title="Como o plano é montado"
            subtitle="Todo programa do AlphaDog segue estas quatro etapas, nesta ordem."
          />
          <ol className="mt-12 grid gap-8 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.step}>
                <span
                  aria-hidden
                  className="font-display text-alpha-200 block text-5xl font-extrabold"
                >
                  {s.step}
                </span>
                <h3 className="mt-2 text-lg">{s.title}</h3>
                <p className="text-ink-500 mt-2 leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section>
        <Container width="narrow">
          <div className="border-sage-200 bg-sage-50 rounded-card border-2 border-dashed p-8">
            <h2 className="text-xl">Uma ressalva honesta</h2>
            <p className="text-ink-600 mt-3 leading-relaxed">
              O AlphaDog é educação, não medicina veterinária. Cão com dor late, rosna e
              morde — e nenhum treino resolve dor. Se o comportamento mudou de repente,
              ou se há risco real de lesão a alguém, procure um médico-veterinário ou um
              profissional presencialmente antes de treinar.
            </p>
          </div>

          <div className="mt-12 text-center">
            <Button asChild size="lg">
              <Link href={routes.quiz}>Montar o plano do meu cão</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
