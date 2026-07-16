/**
 * Contrato do classificador. Espelha services/ai/tests/test_posture.py — se um
 * lado divergir do outro, o app e o gate discordariam sobre o mesmo cão.
 *
 * O teste que mais importa não é "acerta sentado", é "não afirma sentado quando
 * não sabe".
 */

import { describe, expect, it } from "vitest";
import { classifyPosture } from "../src/posture";
import {
  conflictingDog,
  lyingDog,
  makeDetection,
  occludedDog,
  sittingDog,
  standingDog,
} from "./factories";

describe("caminho feliz", () => {
  it("reconhece em pé", () => {
    const reading = classifyPosture(standingDog());
    expect(reading.posture).toBe("standing");
    expect(reading.confidence).toBeGreaterThan(0.8);
  });

  it("reconhece sentado mesmo com traseiras ocluídas", () => {
    // Caso central: sentar SEMPRE oclui as patas traseiras.
    const reading = classifyPosture(sittingDog());
    expect(reading.posture).toBe("sitting");
    expect(reading.confidence).toBeGreaterThan(0.8);
  });

  it("reconhece deitado", () => {
    expect(classifyPosture(lyingDog()).posture).toBe("lying");
  });
});

describe("recusa adivinhar", () => {
  it("sem detecção", () => {
    const reading = classifyPosture(null);
    expect(reading.posture).toBe("unknown");
    expect(reading.confidence).toBe(0);
  });

  it("detecção fraca é rejeitada", () => {
    const detection = makeDetection({
      box: { x: 0, y: 0, width: 110, height: 160, confidence: 0.3 },
    });
    expect(classifyPosture(detection).posture).toBe("unknown");
  });

  it("sinais em conflito viram unknown", () => {
    const reading = classifyPosture(conflictingDog());
    expect(reading.posture).toBe("unknown");
    expect(reading.reason).toContain("conflito");
  });

  it("caixa ambígua sem geometria vira unknown", () => {
    const detection = makeDetection({
      box: { x: 0, y: 0, width: 105, height: 100, confidence: 0.9 },
    });
    expect(classifyPosture(detection).posture).toBe("unknown");
  });
});

describe("degrada com elegância", () => {
  it("keypoints ocluídos caem para a caixa, com menos confiança", () => {
    // Cão atrás do sofá ainda precisa ser classificado.
    const reading = classifyPosture(occludedDog());
    expect(reading.posture).toBe("sitting");
    expect(reading.confidence).toBeLessThan(classifyPosture(sittingDog()).confidence);
    expect(reading.reason).toContain("só caixa");
  });

  it("sempre explica a decisão", () => {
    for (const d of [standingDog(), sittingDog(), conflictingDog(), null]) {
      expect(classifyPosture(d).reason).toBeTruthy();
    }
  });
});
