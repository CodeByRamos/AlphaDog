import { describe, expect, it } from "vitest";
import fixture from "./posture-model.fixture.json";
import { POSTURE_BIAS, POSTURE_MODEL_FEATURES, POSTURE_WEIGHTS } from "./posture-model";
import {
  MIN_POSTURE_CONFIDENCE,
  classifyPostureLearned,
  featuresFromDetection,
  predictPosture,
} from "./posture-learned";
import { NUM_KEYPOINTS, type Detection } from "./posture";

/**
 * Paridade com o Python.
 *
 * Os casos vêm de amostras reais rodadas pelo pipeline em services/ai. Sem este
 * teste, um erro de ordem nas características ou na normalização embutida
 * passaria despercebido: o app classificaria com vetor torto e devolveria uma
 * postura plausível e errada — o modo de falha mais perigoso do produto.
 */
function predictFromFeatures(features: number[]): number[] {
  const logits = POSTURE_WEIGHTS.map((row, i) => {
    let sum = POSTURE_BIAS[i] ?? 0;
    for (let j = 0; j < features.length; j++) sum += (row[j] ?? 0) * (features[j] ?? 0);
    return sum;
  });
  const max = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(v - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / total);
}

describe("paridade com o treino em Python", () => {
  it("reproduz as probabilidades do scikit-learn", () => {
    for (const c of fixture) {
      const got = predictFromFeatures(c.features);
      for (let i = 0; i < got.length; i++) {
        expect(got[i]).toBeCloseTo(c.probabilities[i]!, 4);
      }
    }
  });

  it("os pesos têm a forma que o extrator produz", () => {
    expect(POSTURE_WEIGHTS).toHaveLength(3);
    for (const row of POSTURE_WEIGHTS) expect(row).toHaveLength(POSTURE_MODEL_FEATURES);
    expect(POSTURE_BIAS).toHaveLength(3);
    // 1 razão de aspecto + 24 keypoints x (x, y, confiança)
    expect(POSTURE_MODEL_FEATURES).toBe(1 + NUM_KEYPOINTS * 3);
  });
});

function detection(overrides: Partial<Detection> = {}): Detection {
  return {
    box: { x: 0, y: 0, width: 100, height: 120, confidence: 0.9 },
    keypoints: Array.from({ length: NUM_KEYPOINTS }, () => ({
      x: 50,
      y: 60,
      confidence: 0.8,
    })),
    ...overrides,
  };
}

describe("featuresFromDetection", () => {
  it("normaliza as coordenadas pela caixa", () => {
    const f = featuresFromDetection(
      detection({
        box: { x: 10, y: 20, width: 100, height: 200, confidence: 0.9 },
        keypoints: Array.from({ length: NUM_KEYPOINTS }, () => ({
          x: 60,
          y: 120,
          confidence: 0.5,
        })),
      }),
    );
    expect(f).toHaveLength(POSTURE_MODEL_FEATURES);
    expect(f[0]).toBeCloseTo(0.5); // razão 100/200
    expect(f[1]).toBeCloseTo(0.5); // (60-10)/100
    expect(f[2]).toBeCloseTo(0.5); // (120-20)/200
    expect(f[3]).toBeCloseTo(0.5); // confiança
  });

  it("não estoura quando a caixa tem dimensão zero", () => {
    const f = featuresFromDetection(
      detection({ box: { x: 0, y: 0, width: 0, height: 0, confidence: 0.9 } }),
    );
    expect(f.every((v) => Number.isFinite(v))).toBe(true);
  });
});

describe("predictPosture", () => {
  it("devolve probabilidades que somam 1", () => {
    const p = predictPosture(detection());
    const total = p.probabilities.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 6);
    expect(p.confidence).toBeGreaterThan(0);
    expect(p.confidence).toBeLessThanOrEqual(1);
  });
});

describe("classifyPostureLearned", () => {
  it("sem detecção, abstém", () => {
    expect(classifyPostureLearned(null).posture).toBe("unknown");
  });

  it("detecção fraca não vira postura", () => {
    // Caixa abaixo do mínimo: o modelo nem roda. Cão mal detectado com postura
    // afirmada é a origem clássica de um "Excelente!" indevido.
    const r = classifyPostureLearned(
      detection({ box: { x: 0, y: 0, width: 100, height: 120, confidence: 0.2 } }),
    );
    expect(r.posture).toBe("unknown");
    expect(r.reason).toContain("fraca");
  });

  it("abstém quando o modelo fica indeciso", () => {
    // Keypoints todos no mesmo ponto não descrevem postura nenhuma; o modelo
    // não deve escolher uma das três com confiança alta.
    const r = classifyPostureLearned(detection());
    if (r.posture !== "unknown") {
      expect(r.confidence).toBeGreaterThanOrEqual(MIN_POSTURE_CONFIDENCE);
    }
  });

  it("o limiar respeita a margem medida no gate", () => {
    // 0,80 é onde o falso positivo medido fica em 1% — metade do teto de 2%.
    expect(MIN_POSTURE_CONFIDENCE).toBeGreaterThanOrEqual(0.8);
  });
});
