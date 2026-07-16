/**
 * Classificação de postura a partir de uma detecção.
 *
 * Porte de `services/ai/src/alphadog_ai/posture.py`. A lógica vive nos dois
 * lugares de propósito: o Python julga o modelo no spike (offline, contra
 * dataset rotulado); o TypeScript roda no celular, em tempo real. Os testes de
 * ambos usam os mesmos casos, então divergência aparece.
 *
 * Estratégia: NÃO depender só de keypoints.
 *
 * A literatura é clara — "existing methods focus on dogs in standing poses
 * because when they sit or lie down, their legs are self occluded and their
 * bodies deform". Sentar e deitar são exatamente os exercícios do MVP.
 *
 * Dois sinais independentes que precisam concordar:
 *   1. razão de aspecto da caixa — sobrevive à oclusão total das patas
 *   2. geometria dos keypoints — precisa quando visível, inútil quando ocluída
 *
 * Discordância vira UNKNOWN. Recusar responder é a decisão certa: um
 * "Excelente!" errado ensina o tutor a recompensar o comportamento errado, e o
 * produto passa a piorar o treino em vez de melhorar.
 */

/** Índice de cada keypoint. Ordem do StanfordExtra — não reordenar. */
export const KP = {
  LEFT_FRONT_PAW: 0,
  LEFT_FRONT_KNEE: 1,
  LEFT_FRONT_HIP: 2,
  LEFT_BACK_PAW: 3,
  LEFT_BACK_KNEE: 4,
  LEFT_BACK_HIP: 5,
  RIGHT_FRONT_PAW: 6,
  RIGHT_FRONT_KNEE: 7,
  RIGHT_FRONT_HIP: 8,
  RIGHT_BACK_PAW: 9,
  RIGHT_BACK_KNEE: 10,
  RIGHT_BACK_HIP: 11,
  TAIL_BASE: 12,
  TAIL_TIP: 13,
  LEFT_EAR_BASE: 14,
  RIGHT_EAR_BASE: 15,
  NOSE: 16,
  CHIN: 17,
  LEFT_EAR_TIP: 18,
  RIGHT_EAR_TIP: 19,
} as const;

export const NUM_KEYPOINTS = 20;

export type Keypoint = { x: number; y: number; confidence: number };

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

export type Detection = {
  box: BoundingBox;
  keypoints: Keypoint[];
};

export type Posture = "standing" | "sitting" | "lying" | "unknown";

export type PostureReading = {
  posture: Posture;
  confidence: number;
  /** Por que o classificador decidiu isso. Alimenta o modo debug. */
  reason: string;
};

/**
 * Confiança mínima para um keypoint ser usado.
 *
 * Quando o cão senta, as traseiras ficam ocluídas e o modelo ainda emite
 * posição — com confiança baixa. Tratar ponto de baixa confiança como verdade é
 * a origem mais provável de um falso positivo.
 */
export const MIN_KEYPOINT_CONFIDENCE = 0.5;
export const MIN_BOX_CONFIDENCE = 0.6;

// Limiares. Calibrar com dados reais quando o modelo existir.
const STANDING_ASPECT_MIN = 1.15;
const SITTING_ASPECT_MAX = 0.95;
const LYING_ASPECT_MIN = 1.7;
const SIT_SHOULDER_HIP_DROP = 0.18;

const SHOULDERS = [KP.LEFT_FRONT_HIP, KP.RIGHT_FRONT_HIP];
const HIPS = [KP.LEFT_BACK_HIP, KP.RIGHT_BACK_HIP];
const FRONT_PAWS = [KP.LEFT_FRONT_PAW, KP.RIGHT_FRONT_PAW];
const BACK_PAWS = [KP.LEFT_BACK_PAW, KP.RIGHT_BACK_PAW];
const BACK_KNEES = [KP.LEFT_BACK_KNEE, KP.RIGHT_BACK_KNEE];

function isVisible(kp: Keypoint | undefined): boolean {
  return kp !== undefined && kp.confidence >= MIN_KEYPOINT_CONFIDENCE;
}

function visibleCount(detection: Detection, group: readonly number[]): number {
  return group.filter((i) => isVisible(detection.keypoints[i])).length;
}

function meanY(detection: Detection, group: readonly number[]): number | null {
  const ys = group
    .map((i) => detection.keypoints[i])
    .filter(isVisible)
    .map((kp) => kp!.y);
  return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : null;
}

export function aspectRatio(box: BoundingBox): number {
  return box.height > 0 ? box.width / box.height : 0;
}

function fromAspect(ratio: number): [Posture, string] {
  if (ratio >= LYING_ASPECT_MIN) return ["lying", `caixa muito larga (r=${ratio.toFixed(2)})`];
  if (ratio >= STANDING_ASPECT_MIN) return ["standing", `caixa larga (r=${ratio.toFixed(2)})`];
  if (ratio <= SITTING_ASPECT_MAX) return ["sitting", `caixa vertical (r=${ratio.toFixed(2)})`];
  return ["unknown", `caixa ambígua (r=${ratio.toFixed(2)})`];
}

function fromGeometry(detection: Detection): [Posture, string] {
  const { box } = detection;
  if (box.height <= 0) return ["unknown", "caixa sem altura"];

  const shoulderY = meanY(detection, SHOULDERS);
  const hipY = meanY(detection, HIPS);
  if (shoulderY === null || hipY === null) return ["unknown", "ombro ou quadril ocluído"];

  // Eixo Y cresce para baixo: quadril mais baixo que ombro => drop positivo.
  const drop = (hipY - shoulderY) / box.height;
  const front = visibleCount(detection, FRONT_PAWS);
  const back = visibleCount(detection, BACK_PAWS);
  const knees = visibleCount(detection, BACK_KNEES);

  if (drop >= SIT_SHOULDER_HIP_DROP) {
    // Assinatura do sentado: quadril no chão, tronco erguido, traseiras somem.
    // A oclusão confirma, não atrapalha.
    const detail = back < front || knees === 0 ? ", traseiras ocluídas" : "";
    return ["sitting", `quadril baixo (drop=${drop.toFixed(2)})${detail}`];
  }

  if (Math.abs(drop) < SIT_SHOULDER_HIP_DROP && front + back >= 3) {
    return ["standing", `tronco nivelado (drop=${drop.toFixed(2)}), patas visíveis`];
  }

  if (drop <= -SIT_SHOULDER_HIP_DROP) {
    return ["lying", `tronco baixo (drop=${drop.toFixed(2)})`];
  }

  return ["unknown", `geometria inconclusiva (drop=${drop.toFixed(2)})`];
}

export function classifyPosture(detection: Detection | null): PostureReading {
  if (!detection) return { posture: "unknown", confidence: 0, reason: "nenhum cão detectado" };

  if (detection.box.confidence < MIN_BOX_CONFIDENCE) {
    return {
      posture: "unknown",
      confidence: detection.box.confidence,
      reason: `detecção fraca (${detection.box.confidence.toFixed(2)})`,
    };
  }

  const [byAspect, aspectReason] = fromAspect(aspectRatio(detection.box));
  const [byGeometry, geometryReason] = fromGeometry(detection);

  if (byAspect === byGeometry && byAspect !== "unknown") {
    return {
      posture: byAspect,
      confidence: detection.box.confidence,
      reason: `acordo: ${aspectReason} + ${geometryReason}`,
    };
  }

  // Keypoints ocluídos, caixa clara. Aceita com confiança reduzida: é o caso
  // comum de sentar/deitar, e recusar todos inviabilizaria o produto.
  if (byGeometry === "unknown" && byAspect !== "unknown") {
    return {
      posture: byAspect,
      confidence: detection.box.confidence * 0.7,
      reason: `só caixa: ${aspectReason} (${geometryReason})`,
    };
  }

  // Caixa ambígua, geometria clara: ângulo de câmera atípico.
  if (byAspect === "unknown" && byGeometry !== "unknown") {
    return {
      posture: byGeometry,
      confidence: detection.box.confidence * 0.7,
      reason: `só geometria: ${geometryReason} (${aspectReason})`,
    };
  }

  return {
    posture: "unknown",
    confidence: 0,
    reason: `conflito: caixa diz ${byAspect}, geometria diz ${byGeometry}`,
  };
}
