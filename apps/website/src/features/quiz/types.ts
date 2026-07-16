/**
 * Tipos do funil.
 *
 * O funil é orientado a configuração: cada passo é um dado, não um componente.
 * `type` resolve num componente do step registry, e a união discriminada garante
 * que cada tipo só aceite a configuração que sabe renderizar — um passo `list`
 * exige `options`, um `text` exige `placeholder`, e o compilador cobra isso.
 *
 * Adicionar um passo = adicionar uma entrada em `funnel-config.ts`.
 */

export type AnswerValue = string | string[];

export type Answers = Record<string, AnswerValue>;

export type Option = {
  value: string;
  label: string;
  /** Linha de apoio abaixo do label. */
  hint?: string;
  /** Emoji ou glifo curto exibido à esquerda. */
  icon?: string;
};

type BaseStep = {
  key: string;
  /** Só renderiza o passo quando a condição bate — ex.: perguntas só de filhote. */
  showWhen?: (answers: Answers) => boolean;
};

type QuestionBase = BaseStep & {
  title: string;
  subtitle?: string;
};

export type ListStep = QuestionBase & {
  type: "list";
  options: readonly Option[];
  /** Seleção múltipla exige confirmação explícita; a única avança sozinha. */
  multiple?: boolean;
};

export type DropdownStep = QuestionBase & {
  type: "dropdown";
  options: readonly Option[];
  placeholder: string;
};

/** Escala de concordância — o "statement-relation" da referência. */
export type StatementStep = QuestionBase & {
  type: "statement";
  statement: string;
};

export type TextStep = QuestionBase & {
  type: "text";
  placeholder: string;
  maxLength?: number;
};

export type EmailStep = QuestionBase & {
  type: "email";
  placeholder: string;
  cta: string;
  disclaimer: string;
};

export type ConfirmStep = QuestionBase & {
  type: "confirm";
  cta: string;
  declineLabel: string;
};

/** Interstício de prova social — não coleta resposta. */
export type StaticStep = BaseStep & {
  type: "static";
  title: string;
  body: string;
  cta: string;
  variant: "social-proof" | "science" | "reviewed" | "support" | "almost-ready";
  bullets?: readonly string[];
};

export type LoadingStep = BaseStep & {
  type: "loading";
  title: string;
  /** Etapas exibidas em sequência enquanto o plano é "montado". */
  phases: readonly string[];
};

export type ProfileStep = BaseStep & {
  type: "profile";
  title: string;
  cta: string;
};

export type ScratchCardStep = BaseStep & {
  type: "scratch-card";
  title: string;
  subtitle: string;
  cta: string;
};

export type Step =
  | ListStep
  | DropdownStep
  | StatementStep
  | TextStep
  | EmailStep
  | ConfirmStep
  | StaticStep
  | LoadingStep
  | ProfileStep
  | ScratchCardStep;

export type StepType = Step["type"];

/** Passos que coletam resposta — usados para calcular o progresso real. */
const QUESTION_TYPES: readonly StepType[] = [
  "list",
  "dropdown",
  "statement",
  "text",
  "email",
  "confirm",
];

export function isQuestion(step: Step): boolean {
  return QUESTION_TYPES.includes(step.type);
}

export type QuizSession = {
  id: string;
  funnelSlug: string;
  answers: Answers;
  utmSource?: string;
  startedAt: string;
  completedAt?: string;
};
