import { useEffect, useState } from "react";
import type { DetectorStatus } from "./detector";

/**
 * Carrega o detector, se houver um.
 *
 * Hoje sempre devolve `unavailable`: o modelo depende do dataset Stanford e do
 * treino no Colab, e nenhum dos dois terminou.
 *
 * Este é o único ponto do app que muda quando o `.tflite` chegar:
 *
 *   const detector = new TFLiteDogDetector(require("../../assets/dogpose.tflite"));
 *   await detector.load();
 *   setStatus({ kind: "ready", detector });
 *
 * Nada nas telas precisa mudar.
 *
 * Deliberadamente NÃO existe um detector falso que devolve postura aleatória ou
 * roteirizada. Seria trivial escrever e faria a demo parecer pronta — e é
 * exatamente por isso que não existe. Um "Excelente!" sem o cão ter sentado
 * ensina o tutor a recompensar o comportamento errado: o app passaria a piorar
 * o treino do cão. Melhor uma tela honesta que diz "sem modelo" do que uma
 * mentira convincente.
 */
export function useDetector(): DetectorStatus {
  const [status, setStatus] = useState<DetectorStatus>({ kind: "loading" });

  useEffect(() => {
    let alive = true;

    (async () => {
      // Quando o modelo existir, a checagem do asset entra aqui.
      const available = false;

      if (!alive) return;

      if (!available) {
        setStatus({
          kind: "unavailable",
          reason: "O modelo de visão ainda está em treinamento.",
        });
        return;
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return status;
}
