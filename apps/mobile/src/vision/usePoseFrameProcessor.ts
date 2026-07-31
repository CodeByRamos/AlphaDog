import {
  YOLO_INPUT_SIZE,
  decodeYoloPose,
  letterboxFor,
  type Detection,
} from "@alphadog/core";
import { useMemo } from "react";
import { useFrameProcessor, type Frame } from "react-native-vision-camera";
import type { DetectorStatus } from "./detector";

/**
 * Processa cada frame da câmera e devolve a detecção para o JS.
 *
 * Roda em worklet, na thread da câmera: o buffer do frame nunca cruza a ponte,
 * só o resultado já decodificado. Copiar imagem 30 vezes por segundo para o JS
 * derrubaria o FPS antes de o modelo virar gargalo.
 *
 * O redimensionamento é feito à mão, e não com vision-camera-resize-plugin —
 * uma dependência a menos numa pilha que já tem runtime nativo demais.
 */

/**
 * Runtime de worklet da VisionCamera, carregado com proteção.
 *
 * A VisionCamera exige `react-native-worklets-core` para frame processors, e
 * LANÇA ao receber um frameProcessor sem ele — matando o app no instante em que
 * a câmera fica pronta. Foi exatamente o que aconteceu:
 *
 *   Frame Processors are not available, react-native-worklets-core is not installed!
 *   FATAL EXCEPTION: mqt_v_native
 *
 * Resolver aqui, uma vez, permite decidir ANTES de entregar o processor à
 * câmera. Sem o runtime, a sessão roda sem análise automática — o tutor marca o
 * acerto no botão, como sempre pôde. Recurso ausente vira funcionalidade a
 * menos, nunca aplicativo fechando.
 */
type WorkletsModule = {
  Worklets: { createRunOnJS: <T extends (...args: never[]) => void>(fn: T) => T };
};

const workletsCore: WorkletsModule | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-worklets-core") as WorkletsModule;
    return typeof mod?.Worklets?.createRunOnJS === "function" ? mod : null;
  } catch {
    return null;
  }
})();

/** Frame processors funcionam neste build? A câmera consulta antes de usar. */
export const frameProcessorsAvailable = workletsCore !== null;

/**
 * Um frame a cada três.
 *
 * O cão não muda de postura em 33ms, e o RepTracker já exige acordo em 3 de 5
 * leituras. Processar todo frame gastaria bateria sem melhorar a decisão — e
 * aqui, com o redimensionamento em JavaScript, também sobraria menos tempo por
 * quadro.
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
) {
  // A ponte worklet -> JS precisa vir do MESMO runtime que executa o worklet.
  // Misturar com o runOnJS do Reanimated cruzaria dois runtimes distintos.
  const emit = useMemo(
    () => (workletsCore ? workletsCore.Worklets.createRunOnJS(onDetection) : null),
    [onDetection],
  );

  const model = detector.kind === "ready" ? detector.model : null;
  const enabled = model != null && emit != null;

  const processor = useFrameProcessor(
    (frame: Frame) => {
      "worklet";
      if (!enabled) return;
      if (frame.timestamp % FRAME_SKIP !== 0) return;

      try {
        // Pixels crus do frame. VisionCamera entrega RGBA de 8 bits por canal.
        const raw = frame.toArrayBuffer();
        const pixels = new Uint8Array(raw);

        const fw = frame.width;
        const fh = frame.height;
        const size = YOLO_INPUT_SIZE;

        // Encaixe proporcional com barras cinza — o mesmo pré-processamento do
        // treino. Esticar mudaria a razão de aspecto da caixa, justamente o
        // sinal que separa sentado de em pé.
        const scale = Math.min(size / fw, size / fh);
        const drawW = Math.round(fw * scale);
        const drawH = Math.round(fh * scale);
        const padX = Math.floor((size - drawW) / 2);
        const padY = Math.floor((size - drawH) / 2);

        // NCHW normalizado, o formato que o modelo declara.
        const input = new Float32Array(3 * size * size);
        const plane = size * size;
        // 114/255: o cinza de preenchimento usado no treino.
        input.fill(114 / 255);

        for (let y = 0; y < drawH; y++) {
          // Vizinho mais próximo: interpolar custaria três vezes mais por pixel,
          // e o modelo foi treinado com imagens redimensionadas, não com
          // qualidade fotográfica.
          const srcY = Math.min(fh - 1, Math.floor(y / scale));
          const rowOut = (y + padY) * size + padX;
          const rowIn = srcY * fw;

          for (let x = 0; x < drawW; x++) {
            const srcX = Math.min(fw - 1, Math.floor(x / scale));
            const i = (rowIn + srcX) * 4; // RGBA
            const o = rowOut + x;
            input[o] = pixels[i]! / 255;
            input[plane + o] = pixels[i + 1]! / 255;
            input[2 * plane + o] = pixels[i + 2]! / 255;
          }
        }

        const outputs = model!.runSync([input.buffer as ArrayBuffer]);
        const scores = new Float32Array(outputs[0]!);

        const detection = decodeYoloPose(scores, letterboxFor(fw, fh));
        emit!(detection, frame.timestamp / 1e9, fw, fh);
      } catch {
        // Frame ruim não derruba a sessão. Perder uma leitura custa uma
        // repetição; travar a câmera custa o treino inteiro.
      }
    },
    [enabled, model, emit],
  );

  // undefined quando não há o que processar: entregar um processor à câmera sem
  // o runtime nativo é o que a fazia lançar e fechar o aplicativo.
  return enabled ? processor : undefined;
}
