/**
 * Sessão de treino: várias repetições de um exercício.
 *
 * Camada acima do RepTracker, que só sabe de uma repetição. Aqui mora a
 * contagem, o descanso entre repetições e o resultado final que vai ao banco.
 */

import type { Exercise, Feedback, FeedbackEvent } from "./exercise";
import { RepTracker } from "./exercise";
import type { PostureReading } from "./posture";

export type SessionPhase =
  /** Procurando o cão no quadro. */
  | "searching"
  /** Repetição em andamento. */
  | "active"
  /** Acertou; pausa curta para o tutor recompensar. */
  | "rewarding"
  /** Todas as repetições concluídas. */
  | "finished";

export type SessionState = {
  phase: SessionPhase;
  /** Repetição atual, 1-based. */
  currentRep: number;
  totalReps: number;
  successCount: number;
  feedback: Feedback;
  remainingSeconds: number;
  reason: string;
  elapsedSeconds: number;
};

export type SessionResult = {
  exerciseId: Exercise["id"];
  successCount: number;
  totalReps: number;
  durationSeconds: number;
  /** 0..1. Quantas repetições saíram do total tentado. */
  successRate: number;
};

/** Pausa após acerto, para o tutor recompensar antes da próxima repetição. */
const REWARD_SECONDS = 3;

export class TrainingSession {
  private tracker: RepTracker;
  private startedAt: number | null = null;
  private rewardUntil: number | null = null;

  private _currentRep = 1;
  private _successCount = 0;
  private _phase: SessionPhase = "searching";
  private _lastEvent: FeedbackEvent = {
    feedback: "waiting_for_dog",
    remainingSeconds: 0,
    reason: "",
  };

  constructor(private readonly exercise: Exercise) {
    this.tracker = new RepTracker(exercise.target, exercise.holdSeconds);
  }

  update(reading: PostureReading, timestamp: number): SessionState {
    if (this.startedAt === null) this.startedAt = timestamp;

    if (this._phase === "finished") return this.state(timestamp);

    // Janela de recompensa: não avaliamos nada, o tutor está entregando o
    // petisco e o cão vai se mexer de qualquer jeito.
    if (this._phase === "rewarding") {
      if (this.rewardUntil !== null && timestamp >= this.rewardUntil) {
        this.rewardUntil = null;
        if (this._currentRep >= this.exercise.reps) {
          this._phase = "finished";
        } else {
          this._currentRep += 1;
          this.tracker = new RepTracker(this.exercise.target, this.exercise.holdSeconds);
          this._phase = "searching";
        }
      }
      return this.state(timestamp);
    }

    const event = this.tracker.update(reading, timestamp);
    this._lastEvent = event;

    if (event.feedback === "success") {
      this._successCount += 1;
      this._phase = "rewarding";
      this.rewardUntil = timestamp + REWARD_SECONDS;
      return this.state(timestamp);
    }

    this._phase = event.feedback === "waiting_for_dog" ? "searching" : "active";
    return this.state(timestamp);
  }

  private state(timestamp: number): SessionState {
    return {
      phase: this._phase,
      currentRep: this._currentRep,
      totalReps: this.exercise.reps,
      successCount: this._successCount,
      feedback: this._phase === "rewarding" ? "success" : this._lastEvent.feedback,
      remainingSeconds: this._lastEvent.remainingSeconds,
      reason: this._lastEvent.reason,
      elapsedSeconds: this.startedAt === null ? 0 : timestamp - this.startedAt,
    };
  }

  /** Resultado para gravar. Pode ser chamado a qualquer momento — o tutor pode
   *  encerrar antes do fim, e a sessão parcial ainda vale progresso. */
  result(timestamp: number): SessionResult {
    const duration = this.startedAt === null ? 0 : timestamp - this.startedAt;
    // Denominador é o que foi tentado, não o total planejado: sair na
    // repetição 2 de 5 com 2 acertos é 100%, não 40%.
    const attempted = Math.max(this._currentRep - (this._phase === "finished" ? 0 : 1), 0);
    const denominator = this._phase === "finished" ? this.exercise.reps : attempted;

    return {
      exerciseId: this.exercise.id,
      successCount: this._successCount,
      totalReps: this.exercise.reps,
      durationSeconds: Math.round(duration),
      successRate: denominator > 0 ? this._successCount / denominator : 0,
    };
  }

  get finished(): boolean {
    return this._phase === "finished";
  }
}

/**
 * Copy do feedback, em pt-BR.
 *
 * Separado da máquina de estado: a lógica não deve saber de idioma, e trocar
 * palavra não deve exigir mexer em regra.
 */
export function feedbackText(state: SessionState, dogName: string): string {
  switch (state.feedback) {
    case "waiting_for_dog":
      return `Aponte a câmera para ${dogName}`;
    case "not_yet":
      return "Ainda não — continue guiando";
    case "hold":
      return state.remainingSeconds > 1
        ? `Segure mais ${Math.ceil(state.remainingSeconds)} segundos`
        : "Quase lá...";
    case "success":
      return "Isso! Recompense agora";
    case "broke_early":
      return "Levantou cedo — tente de novo";
    case "unclear_view":
      return `Não estou vendo ${dogName} direito`;
  }
}

/** Cor semântica do feedback. A UI mapeia para o token real. */
export function feedbackTone(feedback: Feedback): "neutral" | "progress" | "success" | "warn" {
  switch (feedback) {
    case "success":
      return "success";
    case "hold":
      return "progress";
    case "broke_early":
    case "unclear_view":
      return "warn";
    default:
      return "neutral";
  }
}
