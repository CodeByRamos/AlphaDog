import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Mede quantos frames por segundo a IA está realmente analisando.
 *
 * Não é enfeite: é a única evidência, na tela, de que o modelo está trabalhando
 * quando não há cão no quadro. Sem cão não há caixa desenhada, e sem caixa a
 * tela de um app com IA funcionando é idêntica à de um app sem IA nenhuma.
 *
 * A contagem vive em refs e só publica uma vez por segundo. Guardar o timestamp
 * de cada frame em estado dispararia um render a cada análise — o app gastaria
 * mais tempo redesenhando o contador do que rodando o modelo.
 */
const WINDOW_MS = 1000;

export function useVisionRate() {
  const [fps, setFps] = useState(0);
  const counter = useRef(0);

  const tick = useCallback(() => {
    counter.current += 1;
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      // Só chama setState quando o número muda: parado em zero, ou estável em
      // 10, não há nada para redesenhar.
      setFps((current) => (current === counter.current ? current : counter.current));
      counter.current = 0;
    }, WINDOW_MS);

    return () => clearInterval(id);
  }, []);

  return { fps, tick };
}
