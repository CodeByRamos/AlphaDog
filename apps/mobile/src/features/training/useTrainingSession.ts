import {
  TrainingSession,
  classifyPosture,
  type Detection,
  type Exercise,
  type SessionState,
} from "@alphadog/core";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Liga o fluxo de frames ao domínio.
 *
 * A TrainingSession é stateful e mutável (permanência é memória). Ela vive num
 * ref, não em estado: recriá-la a cada render perderia o progresso da
 * repetição. O estado do React guarda só o que a UI desenha.
 */
export function useTrainingSession(exercise: Exercise) {
  const sessionRef = useRef(new TrainingSession(exercise));
  const [state, setState] = useState<SessionState>({
    phase: "searching",
    currentRep: 1,
    totalReps: exercise.reps,
    successCount: 0,
    feedback: "waiting_for_dog",
    remainingSeconds: 0,
    reason: "",
    elapsedSeconds: 0,
  });

  const lastFeedback = useRef(state.feedback);

  /**
   * Consome um frame.
   *
   * `timestamp` em segundos, do relógio de captura. Estável entre chamadas: a
   * permanência é medida com ele, não com Date.now().
   */
  const pushFrame = useCallback((detection: Detection | null, timestamp: number) => {
    const reading = classifyPosture(detection);
    const next = sessionRef.current.update(reading, timestamp);
    setState(next);
    return next;
  }, []);

  // Háptico na transição, não a cada frame. O tutor está olhando para o cão,
  // não para a tela — o feedback precisa chegar pela mão.
  useEffect(() => {
    if (state.feedback === lastFeedback.current) return;
    lastFeedback.current = state.feedback;

    if (state.feedback === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (state.feedback === "broke_early") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [state.feedback]);

  const reset = useCallback(() => {
    sessionRef.current = new TrainingSession(exercise);
    setState((s) => ({ ...s, phase: "searching", currentRep: 1, successCount: 0 }));
  }, [exercise]);

  const result = useCallback(
    (timestamp: number) => sessionRef.current.result(timestamp),
    [],
  );

  return { state, pushFrame, reset, result, finished: sessionRef.current.finished };
}
