import { useEffect, useState } from "react";
import { Platform } from "react-native";
import type { DetectorStatus } from "./detector";
import { getTfliteRuntime } from "./tflite";

/**
 * Acelerador por plataforma.
 *
 * Passar `android-gpu` no iPhone (ou `core-ml` no Android) faz o runtime tentar
 * um delegate que não existe naquele sistema. Cada plataforma recebe só o que
 * ela tem; sem delegate disponível, a lib usa a CPU sozinha.
 */
const DELEGATES = Platform.select({
  ios: ["core-ml"],
  android: ["android-gpu"],
  default: [] as string[],
});

/**
 * Carrega o modelo de pose canina, se este build tiver o runtime nativo.
 *
 * O `dogpose.tflite` foi treinado no Kaggle a partir do StanfordExtra e passou
 * no gate contra 208 fotos rotuladas à mão — mas só depois que o classificador
 * de postura deixou de ser regra escrita à mão e virou modelo aprendido sobre
 * os keypoints (ver packages/core/src/posture-learned.ts). Com a regra antiga o
 * falso positivo era de 28,8%; com o classificador aprendido, 1,0%.
 *
 * Toda falha vira `unavailable`, nunca exceção: um APK gerado antes das
 * dependências nativas entrarem não pode derrubar a tela de treino. A visão é
 * melhoria; o treino com o tutor marcando o acerto é o produto.
 *
 * Continua NÃO existindo detector falso. Um "Excelente!" sem o cão ter sentado
 * ensinaria o tutor a recompensar o comportamento errado.
 */
export function useDetector(): DetectorStatus {
  const [status, setStatus] = useState<DetectorStatus>({ kind: "loading" });

  useEffect(() => {
    let alive = true;

    (async () => {
      const runtime = getTfliteRuntime();

      if (!runtime) {
        setStatus({
          kind: "unavailable",
          reason: "Este build do app não inclui o motor de visão.",
        });
        return;
      }

      try {
        const model = await runtime.loadTensorflowModel(
          // require() é obrigatório: é ele que faz o Metro empacotar o .tflite
          // como asset nativo. import estático não registra o arquivo.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require("../../assets/models/dogpose.tflite"),
          DELEGATES,
        );

        if (!alive) return;

        setStatus({
          kind: "ready",
          model,
          detector: {
            name: "dogpose-yolo11n",
            load: async () => {},
            // A inferência roda no frame processor, em worklet, com acesso
            // direto ao buffer do frame. Este método existe para o contrato.
            detect: () => null,
            dispose: () => {},
          },
        });
      } catch (error) {
        if (!alive) return;
        const message = error instanceof Error ? error.message : String(error);
        setStatus({
          kind: "unavailable",
          reason: message.toLowerCase().includes("not found")
            ? "O modelo de visão não está neste build do app."
            : "Não foi possível carregar o modelo de visão neste aparelho.",
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return status;
}
