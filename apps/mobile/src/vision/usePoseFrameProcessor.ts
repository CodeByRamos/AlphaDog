import {
  YOLO_INPUT_SIZE,
  decodeYoloPose,
  letterboxFor,
  type Detection,
} from "@alphadog/core";
import { useMemo } from "react";
import { useFrameProcessor, type Frame } from "react-native-vision-camera";
import { Worklets } from "react-native-worklets-core";
import type { DetectorStatus } from "./detector";

/**
 * Processa cada frame da câmera e devolve a detecção para o JS.
 *
 * Roda em worklet, na thread da câmera: o buffer do frame nunca cruza a ponte,
 * só o resultado já decodificado. Copiar imagem 30 vezes por segundo para o JS
 * derrubaria o FPS antes de o modelo virar gargalo.
 *
 * Só processa 1 frame a cada FRAME_SKIP. O cão não muda de postura em 33ms, e o
 * RepTracker já exige acordo em 3 de 5 leituras.
 */
const FRAME_SKIP = 3;

/**
 * Plugin de redimensionamento, carregado com proteção.
 *
 * Módulo nativo: num APK gerado antes de a dependência entrar, o require lança.
 * Resolver aqui, uma vez, mantém a ordem dos hooks estável durante toda a vida
 * do app — o resultado nunca muda entre renders.
 */
const resizeModule: { useResizePlugin?: () => { resize: unknown } } | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("vision-camera-resize-plugin");
  } catch {
    return null;
  }
})();

export function usePoseFrameProcessor(
  detector: DetectorStatus,
  /**
   * `frameWidth`/`frameHeight` acompanham a detecção porque a caixa vem em
   * pixels do frame, e a UI precisa convertê-la para a tela. Normalizar aqui
   * seria tentador e errado: dividir x por largura e y por altura distorce a
   * razão de aspecto — que é justamente a característica mais pesada do
   * classificador de postura.
   */
  onDetection: (
    detection: Detection | null,
    timestampSeconds: number,
    frameWidth: number,
    frameHeight: number,
  ) => void,
) {
  // Chamada condicional só na aparência: `resizeModule` é constante do módulo,
  // então o mesmo caminho roda em todos os renders.
  const resizeApi = resizeModule?.useResizePlugin?.() ?? null;
  const resize = resizeApi?.resize ?? null;

  // A ponte worklet -> JS. Criada uma vez: recriar a cada render invalidaria o
  // frame processor e reiniciaria a câmera.
  const emit = useMemo(() => Worklets.createRunOnJS(onDetection), [onDetection]);

  const model = detector.kind === "ready" ? detector.model : null;
  const enabled = model != null && resize != null;

  const processor = useFrameProcessor(
    (frame: Frame) => {
      "worklet";
      if (!enabled) return;
      if (frame.timestamp % FRAME_SKIP !== 0) return;

      try {
        // O modelo pede [1, 3, 640, 640] float32 — NCHW, canais primeiro. O
        // plugin entrega nesse layout, sem transposição manual por frame.
        const resized = (resize as (f: Frame, o: unknown) => { buffer: ArrayBufferLike })(
          frame,
          {
            scale: { width: YOLO_INPUT_SIZE, height: YOLO_INPUT_SIZE },
            pixelFormat: "rgb",
            dataType: "float32",
            rotation: "0deg",
          },
        );

        const outputs = model!.runSync([resized.buffer as ArrayBuffer]);
        const raw = new Float32Array(outputs[0]!);

        // Desfaz o encaixe no quadrado para as coordenadas voltarem ao frame.
        const detection = decodeYoloPose(raw, letterboxFor(frame.width, frame.height));
        emit(detection, frame.timestamp / 1e9, frame.width, frame.height);
      } catch {
        // Frame ruim não derruba a sessão. Perder uma leitura custa uma
        // repetição; travar a câmera custa o treino inteiro.
      }
    },
    [enabled, model, resize, emit],
  );

  // Sem runtime nativo, nenhum processor: a câmera roda como espelho e o tutor
  // marca o acerto no botão. É o modo que sempre funcionou.
  return enabled ? processor : undefined;
}
