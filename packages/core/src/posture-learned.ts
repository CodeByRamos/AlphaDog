/**
 * Classificação de postura pelo modelo aprendido.
 *
 * Substitui a regra escrita à mão, que reprovou no gate com 28,8% de falso
 * positivo. O motivo da falha era estrutural, não de ajuste: a razão da caixa
 * mistura formato de raça com postura — dachshund em pé é largo, são-bernardo
 * deitado é quase quadrado. Nenhum limiar separa as duas coisas.
 *
 * Aqui a decisão sai da geometria relativa dos 24 keypoints, normalizada pela
 * caixa. O modelo é uma regressão logística de 73 características (pesos em
 * posture-model.ts, gerados pelo pipeline em services/ai): classificar é uma
 * multiplicação de matriz, roda em microssegundos dentro do frame processor.
 *
 * Medido por validação cruzada 5-fold em 208 fotos rotuladas à mão:
 *   sem abstenção          -> 81,2% de acurácia
 *   com limiar 0,80        -> 1,0% de falso positivo por exercício
 */

import {
  POSTURE_BIAS,
  POSTURE_MODEL_CLASSES,
  POSTURE_MODEL_FEATURES,
  POSTURE_WEIGHTS,
} from "./posture-model";
import {
  MIN_BOX_CONFIDENCE,
  aspectRatio,
  type Detection,
  type Posture,
  type PostureReading,
} from "./posture";

/**
 * Confiança mínima para o app afirmar uma postura.
 *
 * Escolhido na curva medida, não no chute: em 0,80 o falso positivo fica em
 * 1,0% por exercício (teto do produto é 2%) e o app ainda consegue confirmar
 * cerca de metade das repetições sozinho. Subir para 0,90 zera o falso positivo
 * mas derruba a cobertura para ~1/3 — o que sobra continua no botão do tutor,
 * que não vai embora.
 */
export const MIN_POSTURE_CONFIDENCE = 0.8;

/**
 * Vetor de características, na ordem exata em que o modelo foi treinado.
 *
 * Coordenadas relativas à caixa (0..1) tornam a leitura invariante ao tamanho
 * do cão no quadro e à distância da câmera. A confiança de cada ponto entra
 * como característica em vez de virar filtro: o modelo aprendeu sozinho quanto
 * desconfiar de ponto ocluído, o que é mais fino que um corte fixo.
 */
export function featuresFromDetection(detection: Detection): number[] {
  const { box } = detection;
  const w = box.width > 0 ? box.width : 1;
  const h = box.height > 0 ? box.height : 1;

  const features: number[] = [aspectRatio(box)];
  for (const kp of detection.keypoints) {
    features.push((kp.x - box.x) / w);
    features.push((kp.y - box.y) / h);
    features.push(kp.confidence);
  }
  return features;
}

/** Softmax estável: subtrai o máximo antes de exponenciar para não estourar. */
function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

export type PosturePrediction = {
  posture: Posture;
  confidence: number;
  /** Probabilidade de cada classe, na ordem de POSTURE_MODEL_CLASSES. */
  probabilities: number[];
};

/** Roda o modelo. Não aplica limiar — quem decide abster é quem chama. */
export function predictPosture(detection: Detection): PosturePrediction {
  const features = featuresFromDetection(detection);

  if (features.length !== POSTURE_MODEL_FEATURES) {
    // Descompasso entre o extrator e os pesos exportados. Falhar alto aqui é
    // melhor que classificar com vetor torto e devolver postura plausível.
    throw new Error(
      `esperadas ${POSTURE_MODEL_FEATURES} características, recebidas ${features.length}`,
    );
  }

  const logits = POSTURE_WEIGHTS.map((row, i) => {
    let sum = POSTURE_BIAS[i] ?? 0;
    for (let j = 0; j < features.length; j++) sum += (row[j] ?? 0) * (features[j] ?? 0);
    return sum;
  });

  const probabilities = softmax(logits);
  let best = 0;
  for (let i = 1; i < probabilities.length; i++) {
    if ((probabilities[i] ?? 0) > (probabilities[best] ?? 0)) best = i;
  }

  return {
    posture: POSTURE_MODEL_CLASSES[best] as Posture,
    confidence: probabilities[best] ?? 0,
    probabilities,
  };
}

/**
 * Leitura de postura para a sessão de treino.
 *
 * Mesma assinatura do classificador antigo, então nada acima precisa mudar.
 * Abstém-se em três casos, e cada um é deliberado: sem cão no quadro, detecção
 * fraca demais, ou modelo indeciso. Abster custa uma repetição; afirmar errado
 * custa o treino do cão.
 */
export function classifyPostureLearned(detection: Detection | null): PostureReading {
  if (!detection) {
    return { posture: "unknown", confidence: 0, reason: "nenhum cão detectado" };
  }

  if (detection.box.confidence < MIN_BOX_CONFIDENCE) {
    return {
      posture: "unknown",
      confidence: detection.box.confidence,
      reason: `detecção fraca (${detection.box.confidence.toFixed(2)})`,
    };
  }

  const prediction = predictPosture(detection);

  if (prediction.confidence < MIN_POSTURE_CONFIDENCE) {
    return {
      posture: "unknown",
      confidence: prediction.confidence,
      reason: `indeciso (${prediction.posture} a ${(prediction.confidence * 100).toFixed(0)}%)`,
    };
  }

  return {
    posture: prediction.posture,
    confidence: prediction.confidence,
    reason: `modelo: ${prediction.posture} a ${(prediction.confidence * 100).toFixed(0)}%`,
  };
}
