import { funnelSteps } from "./funnel-config";
import { isQuestion, type Answers, type Step } from "./types";

/**
 * Regras de navegação do funil.
 *
 * Funções puras sobre (steps, answers) — sem estado, sem React. Isso mantém a
 * lógica testável isoladamente e reutilizável tanto no cliente quanto no
 * servidor.
 */

/** Passos visíveis para as respostas atuais (aplica `showWhen`). */
export function getVisibleSteps(
  answers: Answers,
  steps: readonly Step[] = funnelSteps,
) {
  return steps.filter((step) => !step.showWhen || step.showWhen(answers));
}

export function getStepByKey(key: string, steps: readonly Step[] = funnelSteps) {
  return steps.find((step) => step.key === key);
}

export function getFirstStepKey(steps: readonly Step[] = funnelSteps) {
  return steps[0].key;
}

/**
 * Próximo passo visível. Recalcula a visibilidade a cada navegação porque a
 * resposta que acabou de ser dada pode abrir ou fechar passos adiante.
 */
export function getNextStepKey(currentKey: string, answers: Answers): string | null {
  const visible = getVisibleSteps(answers);
  const index = visible.findIndex((step) => step.key === currentKey);
  if (index === -1 || index === visible.length - 1) return null;
  return visible[index + 1].key;
}

export function getPrevStepKey(currentKey: string, answers: Answers): string | null {
  const visible = getVisibleSteps(answers);
  const index = visible.findIndex((step) => step.key === currentKey);
  if (index <= 0) return null;
  return visible[index - 1].key;
}

/**
 * Progresso contado só sobre perguntas — interstícios não devem dar a impressão
 * de avanço que não existe.
 */
export function getProgress(currentKey: string, answers: Answers) {
  const questions = getVisibleSteps(answers).filter(isQuestion);
  const total = questions.length;

  const visible = getVisibleSteps(answers);
  const currentIndex = visible.findIndex((step) => step.key === currentKey);
  const answered = visible
    .slice(0, Math.max(currentIndex, 0))
    .filter(isQuestion).length;

  return {
    answered,
    total,
    percent: total === 0 ? 0 : Math.round((answered / total) * 100),
  };
}

/** Um passo só é respondível se produz valor; interstícios avançam direto. */
export function isAnswered(step: Step, answers: Answers) {
  if (!isQuestion(step)) return true;
  const value = answers[step.key];
  if (value === undefined) return false;
  return Array.isArray(value) ? value.length > 0 : value.trim().length > 0;
}

/**
 * Retomada: o passo mais avançado que o usuário pode ver sem pular pergunta não
 * respondida. Evita alguém cair no paywall via URL sem passar pelo funil.
 */
export function getResumeStepKey(answers: Answers): string {
  const visible = getVisibleSteps(answers);
  for (const step of visible) {
    if (!isAnswered(step, answers)) return step.key;
  }
  return visible[visible.length - 1].key;
}

/** Bloqueia navegação direta por URL para além do ponto legítimo. */
export function canAccessStep(key: string, answers: Answers): boolean {
  const visible = getVisibleSteps(answers);
  const target = visible.findIndex((step) => step.key === key);
  if (target === -1) return false;

  const resume = visible.findIndex((step) => step.key === getResumeStepKey(answers));
  return target <= resume;
}
