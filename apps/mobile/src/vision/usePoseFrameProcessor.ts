import {
  YOLO_INPUT_SIZE,
  centerCropFor,
  decodeYoloPoseDetailed,
  type Detection,
} from "@alphadog/core";
import { useMemo } from "react";
import type { TfliteModel } from "react-native-fast-tflite";
import { NitroModules, type BoxedHybridObject } from "react-native-nitro-modules";
import { useFrameProcessor, type Frame } from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import { createResizePlugin } from "vision-camera-resize-plugin";
import type { DetectorStatus } from "./detector";

/**
 * Processa cada frame da câmera e devolve a detecção para o JS.
 *
 * Roda em worklet, na thread da câmera: o buffer do frame nunca cruza a ponte,
 * só o resultado já decodificado.
 *
 * DUAS REGRAS DA VISIONCAMERA v4 GOVERNAM ESTE ARQUIVO, e violar qualquer uma
 * delas não dá exceção de JavaScript — dá processo morto:
 *
 * 1. O modelo do react-native-fast-tflite é um HybridObject do Nitro, apoiado
 *    em `jsi::NativeState`. O runtime de worklet da VisionCamera v4 NÃO acessa
 *    NativeState. É preciso encaixotar com `NitroModules.box()` na thread de JS
 *    e desencaixotar dentro do worklet.
 *
 * 2. `frame.toArrayBuffer()` no Android exige HardwareBuffer e devolve os bytes
 *    no formato do frame, que por padrão é YUV — não RGBA. Por isso a conversão
 *    de pixels é feita pelo vision-camera-resize-plugin, em nativo (libyuv),
 *    que entrega float32 já normalizado em 0..1.
 *
 * NENHUM ERRO É ENGOLIDO AQUI, e isso não é preferência de estilo.
 *
 * A versão anterior tinha `catch {}` vazio em volta do frame inteiro. Com ele,
 * uma exceção acontecendo em TODO frame — resize recusando o formato, o modelo
 * recusando o tensor, o unbox falhando — produzia exatamente a mesma tela que
 * "a IA está olhando e não achou o cão": scanner girando, nada detectado, nada
 * no log. Erro invisível é erro que sobrevive a builds.
 *
 * Agora toda falha é contada, a mensagem sobe para o JavaScript e aparece na
 * tela. Um frame ruim continua não derrubando a sessão — mas passa a deixar
 * rastro.
 */

/**
 * Um frame a cada três.
 *
 * O cão não muda de postura em 33ms, e o RepTracker já exige acordo em 3 de 5
 * leituras. Processar todo frame gastaria bateria sem melhorar a decisão.
 */
const FRAME_SKIP = 3;

/**
 * Quanto girar o frame, no sentido horário, para ficar de pé.
 *
 * O buffer do Android vem na orientação do sensor, deitada, enquanto o telefone
 * é segurado em pé. A VisionCamera informa isso em `frame.orientation`.
 *
 * MEDIDO, e o resultado corrige uma suposição anterior: este modelo é
 * TOLERANTE a rotação. Rodando o `dogpose.tflite` contra 30 fotos giradas
 * (services/ai/scripts/probe_pipeline.py):
 *
 *   de pé  93% detectado (média 0,85)
 *   90°    90% (0,80)
 *   180°   97% (0,78)
 *   270°   93% (0,78)
 *
 * Ou seja: girar ajuda um pouco, mas NÃO é o que decide entre detectar e não
 * detectar. O giro fica porque é barato e correto — a caixa precisa sair no
 * mesmo espaço que o tutor vê na tela — e não porque resolve falta de detecção.
 */
type Rotation = "0deg" | "90deg" | "180deg" | "270deg";

const UPRIGHT_ROTATION: Record<string, Rotation> = {
  portrait: "0deg",
  "landscape-left": "90deg",
  "portrait-upside-down": "180deg",
  "landscape-right": "270deg",
};

/** Uma amostra a cada ~30 segundos de análise: diagnóstico sem inundar o log. */
const LOG_EVERY = 100;

/**
 * Telemetria de um frame analisado.
 *
 * Sobe inteira para o JavaScript porque é ela que responde "em que etapa
 * travou" sem exigir cabo, adb e um computador por perto.
 */
export type FrameStats = {
  /** Confiança da melhor âncora, mesmo abaixo do limiar. */
  confidence: number;
  /** Conversão de pixels, em ms. */
  resizeMs: number;
  /** Transposição HWC->NCHW, em ms. */
  prepMs: number;
  /** Inferência do modelo, em ms. */
  inferMs: number;
  /** Decodificação da saída, em ms. */
  decodeMs: number;
  /** Frames que chegaram ao processor desde o início da sessão. */
  seen: number;
  /** Frames analisados com sucesso. */
  analyzed: number;
  /** Frames que levantaram exceção. */
  failed: number;
  /** Mensagem da última exceção, ou null. */
  lastError: string | null;
  /** Dimensões do frame já girado. */
  frameWidth: number;
  frameHeight: number;
};

export function usePoseFrameProcessor(
  detector: DetectorStatus,
  onDetection: (detection: Detection | null, timestampSeconds: number, stats: FrameStats) => void,
  /**
   * A trava de laço de crash liberou a análise nesta sessão?
   *
   * Vem de fora porque a decisão depende do disco, e o disco é assíncrono.
   */
  allowed: boolean,
) {
  /**
   * O plugin lança se o módulo nativo não estiver no binário.
   *
   * O erro é GUARDADO, e não descartado: sem ele, um build sem o plugin ficaria
   * indistinguível de um build com o plugin que simplesmente não detecta nada.
   */
  const resizePlugin = useMemo(() => {
    try {
      return { resize: createResizePlugin().resize, error: null as string | null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[AlphaDog] resize-plugin indisponível:", message);
      return { resize: null, error: message };
    }
  }, []);

  const resize = resizePlugin.resize;
  const model = detector.kind === "ready" ? detector.model : null;

  // Regra 1: encaixotar na thread de JS, desencaixotar dentro do worklet.
  const boxedModel = useMemo<BoxedHybridObject<TfliteModel> | null>(
    () => (model ? NitroModules.box(model) : null),
    [model],
  );

  // A ponte worklet -> JS vem do runtime da VisionCamera, que é o mesmo que
  // executa este worklet. Misturar com o runOnJS do Reanimated cruzaria dois
  // runtimes distintos.
  const emit = useMemo(() => Worklets.createRunOnJS(onDetection), [onDetection]);

  // `console.log` dentro do worklet não chega ao logcat: o runtime da câmera é
  // outro, sem o console da ponte do React Native.
  const log = useMemo(
    () => Worklets.createRunOnJS((message: string) => console.log(message)),
    [],
  );

  // Contadores. Vivem num objeto porque o worklet captura a referência uma vez
  // e a mantém entre invocações — variável solta seria recopiada a cada frame.
  const counter = useMemo(
    () => ({ n: 0, logs: 0, seen: 0, analyzed: 0, failed: 0, lastError: null as string | null }),
    [],
  );

  const enabled = allowed && boxedModel != null && resize != null;

  const processor = useFrameProcessor(
    (frame: Frame) => {
      "worklet";
      if (!enabled || boxedModel == null || resize == null) return;

      counter.seen += 1;
      counter.n = (counter.n + 1) % FRAME_SKIP;
      if (counter.n !== 0) return;

      const clock = (globalThis as { performance?: { now?: () => number } }).performance;
      const now = () => (clock && clock.now ? clock.now() : 0);

      // `stage` diz em QUE etapa a exceção aconteceu. Sem isso, "Cannot read
      // property of undefined" não distingue conversão de pixels de inferência.
      let stage = "resize";
      const t0 = now();

      try {
        const rotation = UPRIGHT_ROTATION[frame.orientation] ?? "0deg";

        // Recorte central quadrado + escala + giro, tudo em nativo. Sem `crop`
        // explícito o plugin corta o maior quadrado central para casar a
        // proporção 1:1 do alvo — o que preserva a razão de aspecto do cão.
        const resized = resize(frame, {
          scale: { width: YOLO_INPUT_SIZE, height: YOLO_INPUT_SIZE },
          rotation,
          pixelFormat: "rgb",
          dataType: "float32",
        });

        const t1 = now();
        stage = "preparo";

        // O modelo declara NCHW; o plugin entrega HWC intercalado.
        const plane = YOLO_INPUT_SIZE * YOLO_INPUT_SIZE;
        const expected = plane * 3;
        if (resized.length < expected) {
          throw new Error(
            `resize devolveu ${resized.length} valores, esperado ${expected}`,
          );
        }

        const input = new Float32Array(expected);
        for (let p = 0, s = 0; p < plane; p++, s += 3) {
          input[p] = resized[s]!;
          input[plane + p] = resized[s + 1]!;
          input[2 * plane + p] = resized[s + 2]!;
        }

        const t2 = now();
        stage = "inferência";

        const tflite = boxedModel.unbox();
        const outputs = tflite.runSync([input.buffer as ArrayBuffer]);
        if (!outputs || outputs.length === 0) {
          throw new Error("runSync devolveu saída vazia");
        }
        const scores = new Float32Array(outputs[0]!);

        const t3 = now();
        stage = "decodificação";

        // Dimensões do frame JÁ GIRADO — é nesse espaço que a caixa precisa
        // sair, porque é o que corresponde ao que o tutor vê na tela.
        const swaps = rotation === "90deg" || rotation === "270deg";
        const uprightW = swaps ? frame.height : frame.width;
        const uprightH = swaps ? frame.width : frame.height;

        const result = decodeYoloPoseDetailed(scores, centerCropFor(uprightW, uprightH));
        const t4 = now();

        counter.analyzed += 1;

        counter.logs = (counter.logs + 1) % LOG_EVERY;
        if (counter.logs === 1) {
          log(
            `[AlphaDog] frame ${frame.width}x${frame.height} ${frame.orientation} ` +
              `gira=${rotation} | resize ${Math.round(t1 - t0)}ms · preparo ${Math.round(t2 - t1)}ms · ` +
              `inferência ${Math.round(t3 - t2)}ms · decode ${Math.round(t4 - t3)}ms | ` +
              `confiança ${result.confidence.toFixed(3)} ${result.detection ? "COM cão" : "sem cão"} | ` +
              `vistos ${counter.seen} analisados ${counter.analyzed} falhas ${counter.failed}`,
          );
        }

        emit(result.detection, frame.timestamp / 1e9, {
          confidence: result.confidence,
          resizeMs: Math.round(t1 - t0),
          prepMs: Math.round(t2 - t1),
          inferMs: Math.round(t3 - t2),
          decodeMs: Math.round(t4 - t3),
          seen: counter.seen,
          analyzed: counter.analyzed,
          failed: counter.failed,
          lastError: counter.lastError,
          frameWidth: uprightW,
          frameHeight: uprightH,
        });
      } catch (error) {
        // O frame ruim não derruba a sessão — mas DEIXA RASTRO. Perder uma
        // leitura custa uma repetição; esconder a causa custou várias builds.
        counter.failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        counter.lastError = `${stage}: ${message}`;

        // Primeira falha sempre registrada; depois, uma a cada LOG_EVERY, para
        // uma exceção por frame não inundar o log a 10 por segundo.
        if (counter.failed === 1 || counter.failed % LOG_EVERY === 0) {
          log(`[AlphaDog] FALHA na etapa "${stage}" (${counter.failed}x): ${message}`);
        }

        emit(null, frame.timestamp / 1e9, {
          confidence: 0,
          resizeMs: 0,
          prepMs: 0,
          inferMs: 0,
          decodeMs: 0,
          seen: counter.seen,
          analyzed: counter.analyzed,
          failed: counter.failed,
          lastError: counter.lastError,
          frameWidth: frame.width,
          frameHeight: frame.height,
        });
      }
    },
    [enabled, boxedModel, resize, emit, log, counter],
  );

  return {
    /** undefined quando não há o que rodar: a câmera não recebe processor. */
    processor: enabled ? processor : undefined,
    /** Por que a análise não está ligada, quando não está. */
    unavailableReason: resizePlugin.error,
  };
}
