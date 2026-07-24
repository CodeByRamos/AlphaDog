import {
  TrainingSession,
  classifyPostureLearned,
  type Detection,
  type Exercise,
  type SessionState,
} from "@alphadog/core";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";

/** Frequência do relógio quando não há detector, em ms. */
const TICK_MS = 200;

/**
 * Liga o fluxo de frames ao domínio.
 *
 * A TrainingSession é stateful e mutável (permanência é memória). Ela vive num
 * ref, não em estado: recriá-la a cada render perderia o progresso da
 * repetição. O estado do React guarda só o que a UI desenha.
 */
export function useTrainingSession(exercise: Exercise, hasDetector: boolean) {
  const sessionRef = useRef(new TrainingSession(exercise));
  const startedAt = useRef<number | null>(null);

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

  /** Segundos desde o início da sessão. Base única de tempo. */
  const now = useCallback(() => {
    if (startedAt.current === null) startedAt.current = Date.now();
    return (Date.now() - startedAt.current) / 1000;
  }, []);

  /**
   * Consome um frame do detector.
   *
   * `timestamp` em segundos, do relógio de captura. A permanência é medida com
   * ele, não com Date.now().
   */
  const pushFrame = useCallback((detection: Detection | null, timestamp: number) => {
    // Classificador aprendido, não a regra escrita à mão: aquela reprovou no
    // gate com 28,8% de falso positivo contra um teto de 2%. Ver
    // packages/core/src/posture-learned.ts.
    const reading = classifyPostureLearned(detection);
    const next = sessionRef.current.update(reading, timestamp);
    setState(next);
    return next;
  }, []);

  /**
   * Relógio para quando não há detector.
   *
   * A máquina de estado só avança quando alguém chama update(): é ela que fecha
   * a janela de recompensa e passa para a próxima repetição. Sem detector,
   * ninguém chamaria, e a sessão travaria na primeira repetição para sempre.
   *
   * Alimenta "unknown", que é a verdade: sem modelo, não sabemos a postura. O
   * classificador nunca produz sucesso a partir disso — só o tutor produz, pelo
   * botão.
   */
  useEffect(() => {
    if (hasDetector) return;

    const id = setInterval(() => {
      const next = sessionRef.current.update(
        { posture: "unknown", confidence: 0, reason: "sem modelo de visão" },
        now(),
      );
      setState(next);
    }, TICK_MS);

    return () => clearInterval(id);
  }, [hasDetector, now]);

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

  /**
   * O tutor marcou o acerto.
   *
   * Necessário enquanto não há modelo, e útil depois: a pata sai do quadro, o
   * cão fica de costas. Sem isto o tutor treinaria sem conseguir registrar, e a
   * sessão iria ao banco como zero acertos — dado errado é pior que ausente.
   */
  const markSuccess = useCallback(() => {
    const next = sessionRef.current.markManualSuccess(now());
    setState(next);
    return next;
  }, [now]);

  const result = useCallback(() => sessionRef.current.result(now()), [now]);

  const reset = useCallback(() => {
    sessionRef.current = new TrainingSession(exercise);
    startedAt.current = null;
    setState((s) => ({ ...s, phase: "searching", currentRep: 1, successCount: 0 }));
  }, [exercise]);

  return { state, pushFrame, markSuccess, reset, result };
}
