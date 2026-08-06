/**
 * Máquina de estado da sessão por foto.
 *
 * Substitui a sessão guiada por frames. A diferença não é de implementação, é
 * de natureza: a antiga precisava de histerese, permanência e acordo entre
 * leituras porque a detecção piscava trinta vezes por segundo. Aqui existe um
 * evento por repetição — o tutor tira a foto no momento em que o cão está
 * executando — e um evento discreto não pisca.
 *
 * Some, junto, toda a complexidade que existia só por causa do vídeo: janela de
 * concordância, contagem de permanência, feedback que ia e voltava. O que resta
 * é o que o produto sempre foi: contar repetições certas.
 *
 * Vive no core porque é lógica pura, sem câmera e sem rede — testável sem
 * aparelho, que é exatamente o tipo de erro que não dá crash e passa
 * despercebido: contar uma repetição a mais, ou nunca concluir a sessão.
 */

import type { AnalysisResult } from "./analysis";
import { countsAsRep } from "./analysis";
import type { Exercise } from "./exercise";
import type { SessionResult } from "./session";

export type PhotoSessionPhase =
  /** Esperando o tutor posicionar o cão e capturar. */
  | "ready"
  /** Foto enviada, aguardando a avaliação. */
  | "analyzing"
  /** Resultado na tela, aguardando o tutor seguir. */
  | "reviewing"
  /** Todas as repetições feitas. */
  | "finished";

export type PhotoSessionState = {
  phase: PhotoSessionPhase;
  /** Repetição atual, começando em 1. */
  currentRep: number;
  totalReps: number;
  /** Quantas repetições foram consideradas corretas. */
  successCount: number;
  /** Resultado da última análise, ou null antes da primeira. */
  lastResult: AnalysisResult | null;
  /** A última repetição foi marcada pelo tutor, sem IA? */
  lastWasManual: boolean;
  /** Quantos acertos vieram do botão, e não da análise. */
  manualCount: number;
  /** Epoch em ms do início da sessão, para medir a duração. */
  startedAt: number;
  exerciseId: Exercise["id"];
};

export function initialPhotoSession(
  exercise: Exercise,
  now = Date.now(),
): PhotoSessionState {
  return {
    phase: "ready",
    currentRep: 1,
    totalReps: exercise.reps,
    successCount: 0,
    lastResult: null,
    lastWasManual: false,
    manualCount: 0,
    startedAt: now,
    exerciseId: exercise.id,
  };
}

/** A foto foi enviada. */
export function startAnalyzing(state: PhotoSessionState): PhotoSessionState {
  if (state.phase !== "ready") return state;
  return { ...state, phase: "analyzing" };
}

/**
 * Chegou o resultado da análise.
 *
 * Uma repetição só conta com sucesso E confiança acima do limiar. Resultado
 * inconclusivo não conta nem como acerto nem como erro — o tutor decide se
 * repete a foto ou marca no botão. Contar um inconclusivo como erro puniria o
 * tutor por uma limitação nossa.
 */
export function applyAnalysis(
  state: PhotoSessionState,
  result: AnalysisResult,
): PhotoSessionState {
  if (state.phase !== "analyzing") return state;

  const counted = countsAsRep(result);

  return {
    ...state,
    phase: "reviewing",
    lastResult: result,
    lastWasManual: false,
    successCount: state.successCount + (counted ? 1 : 0),
  };
}

/**
 * O tutor marcou o acerto sem usar a IA.
 *
 * Continua existindo, e não como plano B: a pata sai do quadro, a luz muda, o
 * cão fica de costas. Quem está vendo o cão é quem decide — e a sessão vai ao
 * banco com o acerto registrado, em vez de ir com zero.
 */
export function markManualSuccess(state: PhotoSessionState): PhotoSessionState {
  if (state.phase === "finished") return state;

  return {
    ...state,
    phase: "reviewing",
    lastResult: null,
    lastWasManual: true,
    successCount: state.successCount + 1,
    manualCount: state.manualCount + 1,
  };
}

/**
 * Avança para a próxima repetição, ou encerra.
 *
 * Chamado depois que o tutor leu o resultado. O avanço é explícito, e não
 * automático por tempo: o feedback é o produto aqui — passar sozinho enquanto
 * a pessoa ainda lê transformaria a análise em enfeite.
 */
export function advance(state: PhotoSessionState): PhotoSessionState {
  if (state.phase === "finished") return state;

  if (state.currentRep >= state.totalReps) {
    return { ...state, phase: "finished" };
  }

  return {
    ...state,
    phase: "ready",
    currentRep: state.currentRep + 1,
    lastResult: null,
    lastWasManual: false,
  };
}

/** Repete a foto sem consumir a repetição — para foto ruim ou erro de rede. */
export function retryPhoto(state: PhotoSessionState): PhotoSessionState {
  if (state.phase !== "reviewing" && state.phase !== "analyzing") return state;
  return { ...state, phase: "ready", lastResult: null, lastWasManual: false };
}

/**
 * Resumo para gravar no banco.
 *
 * Devolve o MESMO formato que a sessão guiada por frames devolvia, de propósito:
 * o histórico do tutor não pode ter um antes e um depois. A taxa de acerto usa
 * as repetições TENTADAS como denominador, não o total planejado — quem encerra
 * no meio com 2 de 2 fez 100%, não 40%.
 */
export function summarize(
  state: PhotoSessionState,
  now = Date.now(),
): SessionResult {
  const attempted =
    state.phase === "finished" ? state.totalReps : Math.max(0, state.currentRep - 1);

  return {
    exerciseId: state.exerciseId,
    successCount: state.successCount,
    totalReps: state.totalReps,
    durationSeconds: Math.round((now - state.startedAt) / 1000),
    successRate: attempted > 0 ? state.successCount / attempted : 0,
    manualCount: state.manualCount,
  };
}
