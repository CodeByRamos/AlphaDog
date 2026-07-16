import { BREEDS } from "@/features/quiz/funnel-config";
import type { Answers } from "@/features/quiz/types";

/**
 * Traduz as respostas do funil na oferta personalizada.
 *
 * A promessa exibida no paywall tem que sair do que o tutor respondeu — senão é
 * só enfeite, e ele percebe. Cada número aqui é rastreável a uma resposta.
 */

const AGE_LABEL: Record<string, string> = {
  puppy: "filhote",
  adolescent: "adolescente",
  adult: "adulto",
  senior: "idoso",
};

const PROBLEM_LABEL: Record<string, string> = {
  barking: "latido excessivo",
  pulling: "puxar na guia",
  jumping: "pular nas pessoas",
  chewing: "destruir objetos",
  separation: "ansiedade de separação",
  aggression: "rosnar e avançar",
  digging: "cavar",
};

function asArray(value: Answers[string] | undefined): string[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function levelName(percent: number) {
  if (percent < 35) return "Baixa";
  if (percent < 65) return "Média";
  if (percent < 85) return "Boa";
  return "Alta";
}

export type OfferPersonalization = {
  dogName: string;
  /** "do" ou "da" conforme o sexo respondido — "o plano da Nina", "do Rex". */
  possessive: "do" | "da";
  breedLabel: string;
  ageLabel: string;
  focusAreas: string[];
  levels: { label: string; from: string; to: string; percent: number }[];
  weeks: number;
  minutesPerDay: string;
};

export function personalizeOffer(answers: Answers): OfferPersonalization {
  const dogName =
    typeof answers.petName === "string" && answers.petName.trim()
      ? answers.petName.trim()
      : "seu cão";

  const breedLabel =
    BREEDS.find((b) => b.value === answers.petBreed)?.label ?? "SRD (vira-lata)";

  const ageLabel = AGE_LABEL[String(answers.petAge)] ?? "adulto";

  const problems = asArray(answers.problems).filter((p) => p !== "none");
  const cues = asArray(answers.cues).filter((c) => c !== "none");

  const obedienceNow = Math.min(15 + cues.length * 12, 80);
  const behaviorNow = Math.max(75 - problems.length * 13, 15);
  const focusNow = answers.motivation_during_training === "long" ? 65 : 30;

  // Sem nome o fallback é "seu cão", que é masculino — daí o "do" por padrão.
  const named = dogName !== "seu cão";
  const possessive: "do" | "da" = named && answers.petGender === "female" ? "da" : "do";

  return {
    dogName,
    possessive,
    breedLabel,
    ageLabel,
    focusAreas: problems.map((p) => PROBLEM_LABEL[p] ?? p),
    weeks: 4,
    minutesPerDay:
      typeof answers.time_ready_to_spend === "string"
        ? answers.time_ready_to_spend
        : "10",
    levels: [
      {
        label: "Obediência",
        from: levelName(obedienceNow),
        to: levelName(Math.min(obedienceNow + 45, 95)),
        percent: obedienceNow,
      },
      {
        label: "Foco com distração",
        from: levelName(focusNow),
        to: levelName(Math.min(focusNow + 50, 92)),
        percent: focusNow,
      },
      {
        label: "Comportamento em casa",
        from: levelName(behaviorNow),
        to: levelName(Math.min(behaviorNow + 40, 96)),
        percent: behaviorNow,
      },
    ],
  };
}
