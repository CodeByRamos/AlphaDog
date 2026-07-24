import { describe, expect, it } from "vitest";
import { NUM_KEYPOINTS } from "./posture";
import {
  MIN_DETECTION_CONFIDENCE,
  YOLO_CHANNELS,
  YOLO_INPUT_SIZE,
  decodeYoloPose,
  letterboxFor,
} from "./yolo-decode";

const ANCHORS = 16; // pequeno, para o teste ficar legível

/** Monta um tensor canais-primeiro com uma âncora "vencedora" plantada. */
function buildOutput(
  winner: number,
  values: { cx: number; cy: number; w: number; h: number; conf: number },
  kpt: (i: number) => { x: number; y: number; c: number } = (i) => ({
    x: i * 2,
    y: i * 3,
    c: 0.9,
  }),
  anchors = ANCHORS,
): Float32Array {
  const out = new Float32Array(YOLO_CHANNELS * anchors);
  const set = (channel: number, anchor: number, v: number) => {
    out[channel * anchors + anchor] = v;
  };

  // Ruído de fundo com confiança baixa em todas as outras âncoras.
  for (let a = 0; a < anchors; a++) set(4, a, 0.01);

  set(0, winner, values.cx);
  set(1, winner, values.cy);
  set(2, winner, values.w);
  set(3, winner, values.h);
  set(4, winner, values.conf);

  for (let i = 0; i < NUM_KEYPOINTS; i++) {
    const base = 5 + i * 3;
    const k = kpt(i);
    set(base, winner, k.x);
    set(base + 1, winner, k.y);
    set(base + 2, winner, k.c);
  }
  return out;
}

describe("letterboxFor", () => {
  it("frame quadrado não ganha barra", () => {
    const lb = letterboxFor(640, 640);
    expect(lb.scale).toBe(1);
    expect(lb.padX).toBe(0);
    expect(lb.padY).toBe(0);
  });

  it("frame deitado ganha barra em cima e embaixo", () => {
    // 1280x720 -> escala 0.5, altura vira 360, sobra 280 dividido em dois.
    const lb = letterboxFor(1280, 720);
    expect(lb.scale).toBeCloseTo(0.5);
    expect(lb.padX).toBe(0);
    expect(lb.padY).toBe(140);
  });

  it("frame em pé ganha barra dos lados", () => {
    const lb = letterboxFor(720, 1280);
    expect(lb.scale).toBeCloseTo(0.5);
    expect(lb.padY).toBe(0);
    expect(lb.padX).toBe(140);
  });

  it("dimensão zero não gera NaN", () => {
    const lb = letterboxFor(0, 0);
    expect(Number.isFinite(lb.scale)).toBe(true);
  });
});

describe("decodeYoloPose", () => {
  it("converte centro+tamanho em canto superior esquerdo", () => {
    const out = buildOutput(3, { cx: 320, cy: 320, w: 100, h: 200, conf: 0.9 });
    const det = decodeYoloPose(out, { scale: 1, padX: 0, padY: 0 }, ANCHORS)!;

    expect(det).not.toBeNull();
    expect(det.box.x).toBeCloseTo(270); // 320 - 100/2
    expect(det.box.y).toBeCloseTo(220); // 320 - 200/2
    expect(det.box.width).toBeCloseTo(100);
    expect(det.box.height).toBeCloseTo(200);
    expect(det.box.confidence).toBeCloseTo(0.9);
  });

  it("desfaz o letterbox nas coordenadas", () => {
    // Frame 1280x720: escala 0.5 e 140px de barra em cima.
    const lb = letterboxFor(1280, 720);
    const out = buildOutput(0, { cx: 320, cy: 320, w: 100, h: 100, conf: 0.8 });
    const det = decodeYoloPose(out, lb, ANCHORS)!;

    // (320 - 50 - 0) / 0.5 = 540 ; (320 - 50 - 140) / 0.5 = 260
    expect(det.box.x).toBeCloseTo(540);
    expect(det.box.y).toBeCloseTo(260);
    expect(det.box.width).toBeCloseTo(200);
  });

  it("escolhe a âncora de maior confiança, não a primeira", () => {
    const out = buildOutput(11, { cx: 100, cy: 100, w: 50, h: 50, conf: 0.95 });
    // Planta um distrator mais fraco em outra âncora.
    out[4 * ANCHORS + 2] = 0.6;
    const det = decodeYoloPose(out, { scale: 1, padX: 0, padY: 0 }, ANCHORS)!;
    expect(det.box.confidence).toBeCloseTo(0.95);
    expect(det.box.width).toBeCloseTo(50);
  });

  it("devolve os 24 keypoints na ordem certa", () => {
    const out = buildOutput(
      5,
      { cx: 320, cy: 320, w: 100, h: 100, conf: 0.9 },
      (i) => ({ x: 10 + i, y: 100 + i, c: i / 100 }),
    );
    const det = decodeYoloPose(out, { scale: 1, padX: 0, padY: 0 }, ANCHORS)!;

    expect(det.keypoints).toHaveLength(NUM_KEYPOINTS);
    expect(det.keypoints[0]!.x).toBeCloseTo(10);
    expect(det.keypoints[0]!.y).toBeCloseTo(100);
    expect(det.keypoints[23]!.x).toBeCloseTo(33);
    expect(det.keypoints[23]!.confidence).toBeCloseTo(0.23);
  });

  it("sem cão confiante devolve null em vez de inventar", () => {
    const out = buildOutput(0, {
      cx: 320,
      cy: 320,
      w: 100,
      h: 100,
      conf: MIN_DETECTION_CONFIDENCE - 0.01,
    });
    expect(decodeYoloPose(out, { scale: 1, padX: 0, padY: 0 }, ANCHORS)).toBeNull();
  });

  it("tensor curto demais falha alto", () => {
    // Melhor estourar do que decodificar lixo e devolver postura plausível.
    const curto = new Float32Array(10);
    expect(() => decodeYoloPose(curto, { scale: 1, padX: 0, padY: 0 }, ANCHORS)).toThrow();
  });

  it("o formato bate com o modelo real", () => {
    expect(YOLO_CHANNELS).toBe(77);
    expect(YOLO_INPUT_SIZE).toBe(640);
  });
});
