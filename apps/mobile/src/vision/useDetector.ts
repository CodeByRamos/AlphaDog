import { useEffect, useState } from "react";
import { Platform } from "react-native";
import type { DetectorStatus } from "./detector";
import { getTfliteRuntime } from "./tflite";

/**
 * Aceleradores a tentar, EM ORDEM, até um funcionar.
 *
 * A lista é uma cadeia de tentativas, e não uma escolha única. O motivo é
 * concreto: o delegate de GPU do TFLite exige OpenCL ou OpenGL ES 3.1 e não
 * cobre bem modelos quantizados. Num aparelho de entrada — um Moto G05, por
 * exemplo — `createModel` com `android-gpu` falha, e a versão anterior deste
 * arquivo tratava isso como "sem modelo de visão". O aplicativo então mostrava
 * a tela de marcação manual, com o modelo intacto dentro do APK e o motor
 * nativo funcionando: um recurso pronto, desligado por um acelerador opcional.
 *
 * A CPU entra por último e sempre existe. Ela é mais lenta, e mais lenta é
 * incomparavelmente melhor que ausente — ainda mais com um frame a cada três.
 */
const DELEGATE_CHAIN: string[][] = Platform.select({
  ios: [["core-ml"], []],
  android: [["android-gpu"], []],
  default: [[]],
}) as string[][];

/** Nome legível do acelerador, para o log do aparelho e para a UI. */
function delegateLabel(delegates: string[]): string {
  return delegates.length > 0 ? delegates.join("+") : "cpu";
}

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

      // require() é obrigatório: é ele que faz o Metro empacotar o .tflite como
      // asset nativo. import estático não registra o arquivo.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const source = require("../../assets/models/dogpose.tflite");

      let lastError = "";

      for (const delegates of DELEGATE_CHAIN) {
        const label = delegateLabel(delegates);
        try {
          const model = await runtime.loadTensorflowModel(source, delegates);
          if (!alive) return;

          // Log deliberado, e mantido em produção. Quando o reconhecimento
          // some no aparelho de alguém, esta linha é a diferença entre saber e
          // adivinhar — e adivinhar já custou várias builds neste projeto.
          console.log(`[AlphaDog] modelo de visão carregado — acelerador: ${label}`);

          setStatus({
            kind: "ready",
            accelerator: label,
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
          return;
        } catch (error) {
          if (!alive) return;
          lastError = error instanceof Error ? error.message : String(error);
          console.log(`[AlphaDog] acelerador ${label} recusou o modelo: ${lastError}`);
        }
      }

      console.log(`[AlphaDog] nenhum acelerador carregou o modelo: ${lastError}`);
      setStatus({
        kind: "unavailable",
        reason: lastError.toLowerCase().includes("not found")
          ? "O arquivo do modelo não veio neste build."
          : `O motor de visão recusou o modelo neste aparelho (${lastError}).`,
      });
    })();

    return () => {
      alive = false;
    };
  }, []);

  return status;
}
