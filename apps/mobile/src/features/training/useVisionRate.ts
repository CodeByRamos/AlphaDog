import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Mede o que a IA está realmente fazendo, por segundo.
 *
 * Não é enfeite: é a evidência, na tela, de que o modelo está trabalhando
 * quando não há cão no quadro. Sem cão não há caixa desenhada, e sem caixa a
 * tela de um app com IA funcionando é idêntica à de um app sem IA nenhuma.
 *
 * Publica três números:
 *
 * - `fps`      quantos frames a inferência processou no último segundo;
 * - `bestConfidence` a maior confiança vista, mesmo abaixo do limiar;
 * - `inferenceMs`   quanto tempo o modelo levou no último frame.
 *
 * A confiança bruta é o número que separa dois diagnósticos opostos que, de
 * fora, têm a mesma aparência: 0,00 significa que a entrada chega errada ao
 * modelo; 0,45 significa que o limiar é que está apertado. Sem ele, os dois
 * casos são "a IA não detecta nada".
 *
 * Tudo vive em refs e publica uma vez por segundo. Guardar cada frame em estado
 * dispararia um render a cada análise — o app gastaria mais tempo redesenhando
 * o contador do que rodando o modelo.
 */
const WINDOW_MS = 1000;

export function useVisionRate() {
  const [fps, setFps] = useState(0);
  const [bestConfidence, setBestConfidence] = useState<number | null>(null);
  const [inferenceMs, setInferenceMs] = useState(0);

  const frames = useRef(0);
  const best = useRef(0);
  const lastMs = useRef(0);

  const tick = useCallback((confidence: number, ms: number) => {
    frames.current += 1;
    // Máximo da janela, não da última leitura: o cão entra e sai do quadro, e
    // um pico isolado some antes de o tutor conseguir ler o número.
    if (confidence > best.current) best.current = confidence;
    lastMs.current = ms;
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const n = frames.current;
      setFps((current) => (current === n ? current : n));
      setInferenceMs((current) => (current === lastMs.current ? current : lastMs.current));
      setBestConfidence(n > 0 ? best.current : null);

      frames.current = 0;
      best.current = 0;
    }, WINDOW_MS);

    return () => clearInterval(id);
  }, []);

  return { fps, bestConfidence, inferenceMs, tick };
}
