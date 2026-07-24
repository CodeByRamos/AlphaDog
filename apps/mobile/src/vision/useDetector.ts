import { useEffect, useState } from "react";
import { loadTensorflowModel, type TfliteModel } from "react-native-fast-tflite";
import type { DetectorStatus } from "./detector";

/**
 * Carrega o modelo de pose canina.
 *
 * O `dogpose.tflite` foi treinado no Kaggle a partir do StanfordExtra e passou
 * no gate contra 208 fotos rotuladas à mão — mas só depois que o classificador
 * de postura deixou de ser regra escrita à mão e virou modelo aprendido sobre
 * os keypoints (ver packages/core/src/posture-learned.ts). Com a regra antiga o
 * falso positivo era de 28,8%; com o classificador aprendido, 1,0%.
 *
 * Continua NÃO existindo detector falso. Se o arquivo não estiver no bundle ou
 * o runtime falhar, o status vira `unavailable` e a sessão segue com o tutor
 * marcando o acerto. Um "Excelente!" sem o cão ter sentado ensinaria o tutor a
 * recompensar o comportamento errado — o app passaria a piorar o treino.
 */
export function useDetector(): DetectorStatus {
  const [status, setStatus] = useState<DetectorStatus>({ kind: "loading" });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Delegates em ordem de preferência; a lib cai para CPU sozinha quando
        // o aparelho não tem o acelerador. Lista vazia seria só CPU.
        const model: TfliteModel = await loadTensorflowModel(
          // require() é obrigatório aqui: é ele que faz o Metro empacotar o
          // .tflite como asset nativo e devolver o handle que a lib espera.
          // import estático não registra o arquivo no bundle.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require("../../assets/models/dogpose.tflite"),
          ["android-gpu", "core-ml"],
        );

        if (!alive) return;

        setStatus({
          kind: "ready",
          model,
          detector: {
            name: "dogpose-yolo11n",
            load: async () => {},
            // A inferência roda no frame processor, em worklet, com acesso
            // direto ao buffer do frame. Este método existe para o contrato e
            // não é o caminho quente.
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
