import type { Metadata } from "next";
import { FunnelRunner } from "@/features/quiz/funnel-runner";

export const metadata: Metadata = {
  title: "Monte o plano do seu cão",
  description:
    "Responda algumas perguntas sobre a raça, a idade e o comportamento do seu cão e receba um programa de adestramento sob medida.",
  // O funil não deve competir com a landing na busca.
  robots: { index: false, follow: true },
};

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ utm_source?: string }>;
}) {
  const { utm_source } = await searchParams;

  return (
    <div className="bg-bone min-h-dvh">
      <FunnelRunner utmSource={utm_source} />
    </div>
  );
}
