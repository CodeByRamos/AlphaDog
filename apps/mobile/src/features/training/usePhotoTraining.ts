import {
  advance,
  applyAnalysis,
  initialPhotoSession,
  markManualSuccess,
  retryPhoto,
  startAnalyzing,
  summarize,
  type Exercise,
  type PhotoSessionState,
} from "@alphadog/core";
import * as Haptics from "expo-haptics";
import { useCallback, useRef, useState } from "react";
import { analyzePhoto } from "./analyze";

/**
 * Liga a captura de foto à máquina de sessão.
 *
 * A máquina vive no core e é pura; este hook é só a ponte com a câmera, a rede
 * e o retorno tátil. A separação existe para a regra de "quando uma repetição
 * conta" ser testável sem aparelho — é o tipo de erro que não dá crash e
 * portanto passa despercebido.
 */
export function usePhotoTraining(exercise: Exercise) {
  const [state, setState] = useState<PhotoSessionState>(() =>
    initialPhotoSession(exercise),
  );

  /**
   * Trava contra envio duplo.
   *
   * O botão fica desabilitado durante a análise, mas toque duplo rápido dispara
   * duas vezes antes do primeiro render — e cada envio é uma chamada paga ao
   * modelo. A trava é um ref porque precisa valer no mesmo instante, sem
   * esperar o ciclo de render.
   */
  const busy = useRef(false);

  const submitPhoto = useCallback(
    async (imageBase64: string) => {
      if (busy.current) return;
      busy.current = true;

      setState(startAnalyzing);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await analyzePhoto({
        exerciseId: exercise.id,
        imageBase64,
      });

      setState((current) => applyAnalysis(current, result));

      // O retorno tátil chega antes de o tutor ler — ele está olhando para o
      // cão, não para a tela.
      void Haptics.notificationAsync(
        result.success
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );

      busy.current = false;
    },
    [exercise.id],
  );

  const markSuccess = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setState(markManualSuccess);
  }, []);

  const next = useCallback(() => setState(advance), []);
  const retry = useCallback(() => setState(retryPhoto), []);

  const result = useCallback(() => summarize(state), [state]);

  return { state, submitPhoto, markSuccess, next, retry, result };
}
