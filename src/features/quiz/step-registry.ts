import type { ComponentType } from "react";
import {
  LoadingStepView,
  ProfileStepView,
  ScratchCardStepView,
  StaticStepView,
} from "./steps/interstitial-steps";
import {
  ConfirmStepView,
  DropdownStepView,
  EmailStepView,
  ListStepView,
  StatementStepView,
  TextStepView,
} from "./steps/question-steps";
import type { StepProps } from "./steps/shell";
import type { StepType } from "./types";

/**
 * O step registry.
 *
 * Único ponto que liga `type` (dado) a componente (código). O `Record` sobre
 * `StepType` é exaustivo: criar um novo tipo em `types.ts` sem registrar o
 * componente aqui quebra o build — de propósito.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cada view estreita o próprio Step; a exaustividade é garantida pela chave.
export const stepRegistry: Record<StepType, ComponentType<StepProps<any>>> = {
  list: ListStepView,
  dropdown: DropdownStepView,
  statement: StatementStepView,
  text: TextStepView,
  email: EmailStepView,
  confirm: ConfirmStepView,
  static: StaticStepView,
  loading: LoadingStepView,
  profile: ProfileStepView,
  "scratch-card": ScratchCardStepView,
};
