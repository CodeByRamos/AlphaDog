import {
  YOLO_INPUT_SIZE,
  centerCropFor,
  decodeYoloPose,
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
 *    e desencaixotar dentro do worklet. Capturar o modelo direto, como estava
 *    aqui, derruba o app no primeiro frame — ou seja, no instante exato em que
 *    o tutor concede a câmera. O próprio README do fast-tflite diz isso.
 *
 * 2. `frame.toArrayBuffer()` no Android exige HardwareBuffer e devolve os bytes
 *    NO FORMATO DO FRAME, que por padrão é YUV 4:2:0 — não RGBA. O código
 *    anterior lia como RGBA, com passo de 4 bytes e ignorando `bytesPerRow`.
 *    Além de produzir entrada sem sentido para o modelo, a chamada atravessa
 *    JNI, e exceção Java ali vira exceção C++ dentro de uma host function JSI:
 *    aborta o processo, sem passar por nenhum try/catch de JavaScript.
 *
 * Por isso a conversão de pixels saiu do JavaScript e voltou para o
 * vision-camera-resize-plugin, que é a peça que o próprio fast-tflite indica.
 * Ele resolve YUV, stride, rotação e escala em nativo (libyuv) e entrega
 * float32 já normalizado em 0..1 — a faixa que o modelo espera.
 *
 * Ter removido esse plugin foi economia falsa: as linhas de laço de pixel que
 * ele evitava eram exatamente as que fechavam o aplicativo.
 */

/**
 * Um frame a cada três.
 *
 * O cão não muda de postura em 33ms, e o RepTracker já exige acordo em 3 de 5
 * leituras. Processar todo frame gastaria bateria sem melhorar a decisão.
 *
 * A contagem vem de um objeto capturado pelo worklet, e não de
 * `frame.timestamp % 3`: timestamp é nanossegundo de relógio monotônico, então
 * o resto era pseudoaleatório — descartava frames de forma irregular em vez de
 * um a cada três.
 */
const FRAME_SKIP = 3;

export function usePoseFrameProcessor(
  detector: DetectorStatus,
  /**
   * `frameWidth`/`frameHeight` acompanham a detecção porque a caixa vem em
   * pixels do frame, e a UI precisa convertê-la para a tela. Normalizar no
   * worklet seria tentador e errado: dividir x por largura e y por altura
   * distorce a razão de aspecto — a característica de maior peso no
   * classificador de postura.
   */
  onDetection: (
    detection: Detection | null,
    timestampSeconds: number,
    frameWidth: number,
    frameHeight: number,
  ) => void,
  /**
   * A trava de laço de crash liberou a análise nesta sessão?
   *
   * Vem de fora porque a decisão depende do disco, e o disco é assíncrono: ler
   * aqui dentro faria o primeiro render entregar um processor que talvez não
   * devesse existir.
   */
  allowed: boolean,
) {
  // O plugin lança se o módulo nativo não estiver no binário. Aqui isso vira
  // ausência de recurso, e não tela de erro: o treino segue com o tutor
  // marcando o acerto, que é como o app já se comporta sem modelo.
  const resize = useMemo(() => {
    try {
      return createResizePlugin().resize;
    } catch {
      return null;
    }
  }, []);

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

  // Contador de descarte. Vive num objeto porque o worklet captura a referência
  // uma vez e a mantém entre invocações — variável solta seria recopiada.
  const counter = useMemo(() => ({ n: 0 }), []);

  const enabled = allowed && boxedModel != null && resize != null;

  const processor = useFrameProcessor(
    (frame: Frame) => {
      "worklet";
      if (!enabled || boxedModel == null || resize == null) return;

      counter.n = (counter.n + 1) % FRAME_SKIP;
      if (counter.n !== 0) return;

      try {
        // Recorte central quadrado + escala para 640x640, em RGB float32
        // normalizado, tudo em nativo. Sem `crop` explícito o plugin corta o
        // maior quadrado central para casar a proporção 1:1 do alvo — que é
        // justamente o que preserva a razão de aspecto do cão.
        const resized = resize(frame, {
          scale: { width: YOLO_INPUT_SIZE, height: YOLO_INPUT_SIZE },
          pixelFormat: "rgb",
          dataType: "float32",
        });

        // O modelo declara NCHW; o plugin entrega HWC intercalado. A
        // transposição é o único trabalho por pixel que sobra em JavaScript.
        const plane = YOLO_INPUT_SIZE * YOLO_INPUT_SIZE;
        const input = new Float32Array(3 * plane);
        for (let p = 0, s = 0; p < plane; p++, s += 3) {
          input[p] = resized[s]!;
          input[plane + p] = resized[s + 1]!;
          input[2 * plane + p] = resized[s + 2]!;
        }

        const tflite = boxedModel.unbox();
        const outputs = tflite.runSync([input.buffer as ArrayBuffer]);
        const scores = new Float32Array(outputs[0]!);

        const detection = decodeYoloPose(
          scores,
          centerCropFor(frame.width, frame.height),
        );
        emit(detection, frame.timestamp / 1e9, frame.width, frame.height);
      } catch {
        // Frame ruim não derruba a sessão. Perder uma leitura custa uma
        // repetição; travar a câmera custa o treino inteiro.
      }
    },
    [enabled, boxedModel, resize, emit, counter],
  );

  // undefined quando não há modelo: entregar um processor à câmera sem ter o
  // que rodar só gastaria bateria copiando frames para lugar nenhum.
  return enabled ? processor : undefined;
}
