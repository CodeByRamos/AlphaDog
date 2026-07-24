/**
 * Decodifica a saída bruta do dogpose.tflite em uma Detection.
 *
 * Formato confirmado lendo o arquivo (services/ai/scripts/inspect_model.py),
 * não suposto:
 *   entrada [1, 3, 640, 640] float32, NCHW, valores 0..1
 *   saída   [1, 77, 8400] float32 — canais primeiro, 8400 âncoras
 *
 * Os 77 canais são: 4 de caixa (cx, cy, w, h) + 1 de confiança + 24 keypoints
 * de 3 valores (x, y, visibilidade). Tudo em pixels do espaço 640x640 da
 * entrada, o que exige desfazer o letterbox para voltar às coordenadas do frame
 * original.
 *
 * Vive no core, e não no app, porque é lógica pura: assim dá para testar sem
 * device e sem câmera. Erro aqui não daria crash — daria postura plausível e
 * errada, que é o pior tipo de bug deste produto.
 */

import { NUM_KEYPOINTS, type Detection } from "./posture";

/** Canais por keypoint: x, y, visibilidade. */
const KP_STRIDE = 3;
/** cx, cy, w, h, confiança. */
const BOX_CHANNELS = 5;

export const YOLO_INPUT_SIZE = 640;
export const YOLO_CHANNELS = BOX_CHANNELS + NUM_KEYPOINTS * KP_STRIDE; // 77

/**
 * Como o frame foi encaixado no quadrado de 640: escala aplicada e as barras
 * adicionadas. Sem isso as coordenadas voltam deslocadas, e a caixa fica com a
 * proporção errada — justamente a entrada mais pesada do classificador.
 */
export type Letterbox = {
  scale: number;
  padX: number;
  padY: number;
};

/** Calcula o letterbox que preserva a proporção do frame dentro do quadrado. */
export function letterboxFor(
  frameWidth: number,
  frameHeight: number,
  size = YOLO_INPUT_SIZE,
): Letterbox {
  if (frameWidth <= 0 || frameHeight <= 0) return { scale: 1, padX: 0, padY: 0 };
  const scale = Math.min(size / frameWidth, size / frameHeight);
  return {
    scale,
    padX: Math.round((size - frameWidth * scale) / 2),
    padY: Math.round((size - frameHeight * scale) / 2),
  };
}

/**
 * Confiança mínima para considerar que há um cão no quadro.
 *
 * Abaixo disso devolvemos null: "não vi cão" é resposta honesta e o
 * classificador nem chega a rodar.
 */
export const MIN_DETECTION_CONFIDENCE = 0.5;

/**
 * Escolhe a âncora de maior confiança e converte para Detection.
 *
 * Uma âncora só, sem NMS: o produto trata um cão por vez — o do tutor, que
 * ocupa o quadro. Rodar supressão para depois usar só a melhor seria custo por
 * frame sem ganho.
 *
 * `output` é o tensor achatado em ordem canais-primeiro: o valor do canal c na
 * âncora a está em `output[c * anchors + a]`.
 */
export function decodeYoloPose(
  output: ArrayLike<number>,
  letterbox: Letterbox,
  anchors = 8400,
): Detection | null {
  const expected = YOLO_CHANNELS * anchors;
  if (output.length < expected) {
    throw new Error(
      `saída menor que o esperado: ${output.length} < ${expected} (${YOLO_CHANNELS}x${anchors})`,
    );
  }

  // Canal 4 é a confiança da classe — só existe 'dog'.
  const confOffset = 4 * anchors;
  let best = 0;
  let bestConf = output[confOffset] ?? 0;
  for (let a = 1; a < anchors; a++) {
    const c = output[confOffset + a] ?? 0;
    if (c > bestConf) {
      bestConf = c;
      best = a;
    }
  }

  if (bestConf < MIN_DETECTION_CONFIDENCE) return null;

  const { scale, padX, padY } = letterbox;
  const safeScale = scale > 0 ? scale : 1;
  const at = (channel: number) => output[channel * anchors + best] ?? 0;

  // O modelo entrega o centro; a caixa do domínio usa o canto superior esquerdo.
  const cx = at(0);
  const cy = at(1);
  const w = at(2);
  const h = at(3);

  const box = {
    x: (cx - w / 2 - padX) / safeScale,
    y: (cy - h / 2 - padY) / safeScale,
    width: w / safeScale,
    height: h / safeScale,
    confidence: bestConf,
  };

  const keypoints = [];
  for (let i = 0; i < NUM_KEYPOINTS; i++) {
    const base = BOX_CHANNELS + i * KP_STRIDE;
    keypoints.push({
      x: (at(base) - padX) / safeScale,
      y: (at(base + 1) - padY) / safeScale,
      confidence: at(base + 2),
    });
  }

  return { box, keypoints };
}
