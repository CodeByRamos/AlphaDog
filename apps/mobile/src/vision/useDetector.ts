import { Asset } from "expo-asset";
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
 * Primeira linha do erro, curta o bastante para caber numa tela.
 *
 * A mensagem completa de uma exceção do Kotlin traz a pilha inteira, e ela foi
 * parar na tela de treino: dezenas de linhas de `at kotlinx.coroutines...`
 * cobrindo as instruções do exercício. Diagnóstico pertence ao log; a tela
 * recebe a causa, uma linha.
 */
function headline(message: string): string {
  const first = message.split("\n")[0]?.trim() ?? message;
  return first.length > 140 ? `${first.slice(0, 140)}…` : first;
}

/**
 * Endereço do arquivo do modelo, com protocolo.
 *
 * O carregador nativo do fast-tflite faz literalmente `URL(path).readBytes()`.
 * Ele precisa de um endereço COM esquema, e é aí que estava a falha:
 *
 *   java.net.MalformedURLException: no protocol: assets_models_dogpose
 *     at com.margelo.nitro.tflite.HybridAssetLoader.loadAsset
 *
 * Passar o `require()` direto funciona em desenvolvimento porque o Metro serve
 * o arquivo por HTTP e `Image.resolveAssetSource()` devolve
 * `http://10.0.2.2:8081/assets/...`. No APK de produção não há servidor: o
 * arquivo vira RECURSO do Android e a mesma chamada devolve só o nome dele,
 * `assets_models_dogpose`, sem esquema nenhum. O `URL()` recusa, e o app dizia
 * que o motor de visão tinha recusado o modelo — quando na verdade nunca
 * chegou a ler o arquivo.
 *
 * O expo-asset resolve nos dois mundos: `downloadAsync()` copia o recurso
 * embutido para o cache do aplicativo e devolve um `file://` de verdade. Em
 * desenvolvimento, baixa do Metro e devolve `file://` também.
 */
async function resolveModelUrl(): Promise<string> {
  const asset = Asset.fromModule(
    // require() é obrigatório: é ele que faz o Metro empacotar o .tflite como
    // asset nativo. import estático não registra o arquivo.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../assets/models/dogpose.tflite"),
  );

  if (!asset.localUri) await asset.downloadAsync();

  const uri = asset.localUri ?? asset.uri;

  // Verificação explícita em vez de confiança: se um dia o expo-asset devolver
  // um caminho sem esquema, quero a mensagem aqui e não uma pilha de Java na
  // tela do tutor.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(uri)) {
    throw new Error(`endereço sem protocolo: ${uri}`);
  }

  console.log(`[AlphaDog] arquivo do modelo em ${uri}`);
  return uri;
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

      let source: { url: string };
      try {
        source = { url: await resolveModelUrl() };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[AlphaDog] não consegui localizar o arquivo do modelo: ${message}`);
        setStatus({
          kind: "unavailable",
          reason: "Não foi possível abrir o arquivo do modelo neste aparelho.",
        });
        return;
      }

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

          // AUTOTESTE. Roda o modelo uma vez com um tensor sintético, na
          // thread de JS, antes de qualquer frame de câmera.
          //
          // Existe porque "carregou" e "executa" são coisas diferentes: o
          // TFLite aceita o arquivo, aloca os tensores e só falha na primeira
          // inferência — que aconteceria dentro do worklet, onde o erro é mais
          // difícil de ver. Aqui a falha aparece no log antes de a câmera abrir,
          // e o detector fica indisponível com motivo, em vez de ficar "pronto"
          // e nunca detectar nada.
          try {
            const probe = new Float32Array(3 * 640 * 640);
            const started = Date.now();
            const outputs = model.runSync([probe.buffer as ArrayBuffer]);
            const values = new Float32Array(outputs[0]!);
            console.log(
              `[AlphaDog] autoteste de inferência OK — ${Date.now() - started}ms, ` +
                `saída com ${values.length} valores (esperado ${77 * 8400})`,
            );

            if (values.length < 77 * 8400) {
              throw new Error(
                `saída menor que o esperado: ${values.length} < ${77 * 8400}`,
              );
            }
          } catch (probeError) {
            const message =
              probeError instanceof Error ? probeError.message : String(probeError);
            console.log(`[AlphaDog] AUTOTESTE DE INFERÊNCIA FALHOU: ${message}`);
            setStatus({
              kind: "unavailable",
              reason: `O modelo carregou mas não executa neste aparelho: ${headline(message)}`,
            });
            return;
          }

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
          : `O motor de visão recusou o modelo neste aparelho: ${headline(lastError)}`,
      });
    })();

    return () => {
      alive = false;
    };
  }, []);

  return status;
}
