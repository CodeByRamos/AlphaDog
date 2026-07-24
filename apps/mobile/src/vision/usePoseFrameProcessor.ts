import {
  YOLO_INPUT_SIZE,
  decodeYoloPose,
  letterboxFor,
  type Detection,
} from "@alphadog/core";
import { useMemo } from "react";
import { Worklets } from "react-native-worklets-core";
import { useFrameProcessor, type Frame } from "react-native-vision-camera";
import { useResizePlugin } from "vision-camera-resize-plugin";
import type { DetectorStatus } from "./detector";

/**
 * Processa cada frame da câmera e devolve a detecção para o JS.
 *
 * Roda em worklet, na thread da câmera: o buffer do frame nunca cruza a ponte,
 * só o resultado já decodificado. Copiar imagem 30 vezes por segundo para o JS
 * derrubaria o FPS bem antes de o modelo virar gargalo.
 *
 * Só processa 1 frame a cada FRAME_SKIP. O cão não muda de postura em 33ms, e o
 * classificador já exige acordo em 3 de 5 leituras — rodar em todo frame gastaria
 * bateria sem melhorar a decisão.
 */
const FRAME_SKIP = 3;

export function usePoseFrameProcessor(
  detector: DetectorStatus,
  onDetection: (detection: Detection | null, timestampSeconds: number) => void,
) {
  const { resize } = useResizePlugin();

  // A ponte worklet -> JS. Criada uma vez: recriar a cada render invalidaria o
  // frame processor e reiniciaria a câmera.
  const emit = useMemo(
    () => Worklets.createRunOnJS(onDetection),
    [onDetection],
  );

  const model = detector.kind === "ready" ? detector.model : null;

  return useFrameProcessor(
    (frame: Frame) => {
      "worklet";
      if (model == null) return;
      if (frame.timestamp % FRAME_SKIP !== 0) return;

      // O modelo pede [1, 3, 640, 640] float32 normalizado — NCHW, canais
      // primeiro. O plugin entrega exatamente nesse layout, então não há
      // transposição manual por frame.
      const resized = resize(frame, {
        scale: { width: YOLO_INPUT_SIZE, height: YOLO_INPUT_SIZE },
        pixelFormat: "rgb",
        dataType: "float32",
        rotation: "0deg",
      });

      // O plugin devolve um TypedArray; runSync espera o ArrayBuffer cru.
      const outputs = model.runSync([resized.buffer as ArrayBuffer]);
      const raw = new Float32Array(outputs[0]!);

      // Desfaz o encaixe no quadrado para as coordenadas voltarem ao frame.
      const letterbox = letterboxFor(frame.width, frame.height);
      const detection = decodeYoloPose(raw, letterbox);

      emit(detection, frame.timestamp / 1e9);
    },
    [model, resize, emit],
  );
}
