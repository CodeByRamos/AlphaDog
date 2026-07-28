import {
  YOLO_INPUT_SIZE,
  decodeYoloPose,
  letterboxFor,
  type Detection,
} from "@alphadog/core";
import { useCallback } from "react";
import { runOnJS } from "react-native-reanimated";
import { useFrameProcessor, type Frame } from "react-native-vision-camera";
import type { DetectorStatus } from "./detector";

/**
 * Processa cada frame da câmera e devolve a detecção para o JS.
 *
 * Roda em worklet, na thread da câmera: o buffer do frame nunca cruza a ponte,
 * só o resultado já decodificado. Copiar imagem 30 vezes por segundo para o JS
 * derrubaria o FPS antes de o modelo virar gargalo.
 *
 * O redimensionamento é feito à mão, e não com vision-camera-resize-plugin.
 * O motivo é grave: aquele plugin exige `react-native-worklets-core`, enquanto o
 * Reanimated 4 exige `react-native-worklets`. Os dois instalam runtime de
 * worklet nativo no início do processo e não convivem — com ambos presentes o
 * aplicativo travava na tela de abertura, antes de executar uma linha de
 * JavaScript. Sem log, sem erro. Uma dependência a menos vale mais que a
 * conveniência de uma função pronta.
 *
 * `runOnJS` vem do Reanimated, que já é dependência obrigatória — não de um
 * segundo pacote de worklets.
 */

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
  // Estável entre renders: recriar invalidaria o frame processor e reiniciaria
  // a câmera a cada tick da sessão.
  const emit = useCallback(onDetection, [onDetection]);

  const model = detector.kind === "ready" ? detector.model : null;

  return useFrameProcessor(
    (frame: Frame) => {
      "worklet";
      if (model == null) return;
      if (frame.timestamp % FRAME_SKIP !== 0) return;

      try {
        // Pixels crus do frame. VisionCamera entrega RGBA de 8 bits por canal.
        const raw = frame.toArrayBuffer();
        const pixels = new Uint8Array(raw);

        const fw = frame.width;
        const fh = frame.height;
        const size = YOLO_INPUT_SIZE;

        // Encaixe proporcional dentro do quadrado, com barras cinza — o mesmo
        // pré-processamento do treino. Esticar mudaria a razão de aspecto da
        // caixa, que é justamente o sinal que separa sentado de em pé.
        const scale = Math.min(size / fw, size / fh);
        const drawW = Math.round(fw * scale);
        const drawH = Math.round(fh * scale);
        const padX = Math.floor((size - drawW) / 2);
        const padY = Math.floor((size - drawH) / 2);

        // NCHW normalizado, que é o formato que o modelo declara.
        const input = new Float32Array(3 * size * size);
        const plane = size * size;
        // 114/255: o cinza de preenchimento usado no treino.
        const padValue = 114 / 255;
        input.fill(padValue);

        for (let y = 0; y < drawH; y++) {
          // Vizinho mais próximo: interpolar custaria três vezes mais por pixel
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

        const outputs = model.runSync([input.buffer as ArrayBuffer]);
        const scores = new Float32Array(outputs[0]!);

        const detection = decodeYoloPose(scores, letterboxFor(fw, fh));
        runOnJS(emit)(detection, frame.timestamp / 1e9, fw, fh);
      } catch {
        // Frame ruim não derruba a sessão. Perder uma leitura custa uma
        // repetição; travar a câmera custa o treino inteiro.
      }
    },
    [model, emit],
  );
}
