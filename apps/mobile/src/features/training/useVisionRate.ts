import { useCallback, useEffect, useRef, useState } from "react";
import type { FrameStats } from "../../vision/usePoseFrameProcessor";

/**
 * Reúne o que a IA está realmente fazendo, e publica uma vez por segundo.
 *
 * Não é enfeite: é a evidência, na tela, de que o modelo está trabalhando
 * quando não há cão no quadro. Sem cão não há caixa desenhada, e sem caixa a
 * tela de um app com IA funcionando é idêntica à de um app sem IA nenhuma.
 *
 * A confiança bruta é o número que separa dois diagnósticos opostos: 0,00
 * significa que a entrada chega errada ao modelo; 0,45 significa que o limiar
 * é que está apertado. Sem ele, os dois casos são "a IA não detecta nada".
 *
 * `failed` e `lastError` são o que impede uma exceção por frame de passar por
 * "está analisando": se todo frame estoura, o contador de análises fica parado
 * e a mensagem aparece na tela.
 *
 * Tudo vive em refs e publica uma vez por segundo. Guardar cada frame em estado
 * dispararia um render a cada análise — o app gastaria mais tempo redesenhando
 * o contador do que rodando o modelo.
 */
const WINDOW_MS = 1000;

export type VisionTelemetry = {
  /** Frames analisados no último segundo. */
  fps: number;
  /** Maior confiança do último segundo, ou null se nada foi analisado. */
  bestConfidence: number | null;
  /** Tempos da última análise, em ms. */
  resizeMs: number;
  prepMs: number;
  inferMs: number;
  decodeMs: number;
  /** Totais desde o início da sessão. */
  seen: number;
  analyzed: number;
  failed: number;
  lastError: string | null;
};

const EMPTY: VisionTelemetry = {
  fps: 0,
  bestConfidence: null,
  resizeMs: 0,
  prepMs: 0,
  inferMs: 0,
  decodeMs: 0,
  seen: 0,
  analyzed: 0,
  failed: 0,
  lastError: null,
};

export function useVisionRate() {
  const [telemetry, setTelemetry] = useState<VisionTelemetry>(EMPTY);

  const frames = useRef(0);
  const best = useRef(0);
  const last = useRef<FrameStats | null>(null);

  const tick = useCallback((stats: FrameStats) => {
    frames.current += 1;
    // Máximo da janela, não da última leitura: o cão entra e sai do quadro, e
    // um pico isolado some antes de o tutor conseguir ler o número.
    if (stats.confidence > best.current) best.current = stats.confidence;
    last.current = stats;
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const n = frames.current;
      const stats = last.current;

      setTelemetry({
        fps: n,
        bestConfidence: n > 0 ? best.current : null,
        resizeMs: stats?.resizeMs ?? 0,
        prepMs: stats?.prepMs ?? 0,
        inferMs: stats?.inferMs ?? 0,
        decodeMs: stats?.decodeMs ?? 0,
        seen: stats?.seen ?? 0,
        analyzed: stats?.analyzed ?? 0,
        failed: stats?.failed ?? 0,
        lastError: stats?.lastError ?? null,
      });

      frames.current = 0;
      best.current = 0;
    }, WINDOW_MS);

    return () => clearInterval(id);
  }, []);

  return { telemetry, tick };
}
