import { KP, NUM_KEYPOINTS, type BoundingBox, type Detection, type Keypoint } from "../src/posture";

const OCCLUDED: Keypoint = { x: 0, y: 0, confidence: 0.1 };

export function makeDetection(opts: {
  box: BoundingBox;
  points?: Partial<Record<number, [number, number]>>;
  confidence?: number;
}): Detection {
  const keypoints: Keypoint[] = Array.from({ length: NUM_KEYPOINTS }, () => ({ ...OCCLUDED }));
  for (const [index, xy] of Object.entries(opts.points ?? {})) {
    if (!xy) continue;
    keypoints[Number(index)] = { x: xy[0], y: xy[1], confidence: opts.confidence ?? 0.9 };
  }
  return { box: opts.box, keypoints };
}

/** Cão de perfil, em pé: caixa larga, cernelha e jarrete nivelados. */
export function standingDog(): Detection {
  return makeDetection({
    box: { x: 0, y: 0, width: 200, height: 140, confidence: 0.95 },
    points: {
      [KP.WITHERS]: [61, 50],
      [KP.LEFT_FRONT_ELBOW]: [60, 50],
      [KP.RIGHT_FRONT_ELBOW]: [62, 50],
      [KP.LEFT_BACK_HOCK]: [150, 52],
      [KP.RIGHT_BACK_HOCK]: [152, 52],
      [KP.LEFT_FRONT_PAW]: [58, 132],
      [KP.RIGHT_FRONT_PAW]: [66, 133],
      [KP.LEFT_BACK_PAW]: [150, 132],
      [KP.RIGHT_BACK_PAW]: [158, 133],
      [KP.LEFT_BACK_KNEE]: [150, 95],
      [KP.RIGHT_BACK_KNEE]: [156, 95],
      [KP.NOSE]: [18, 60],
    },
  });
}

/**
 * Cão sentado: caixa vertical, quadril no chão, traseiras auto-ocluídas.
 * O caso central do produto e o mais difícil segundo a literatura.
 */
export function sittingDog(): Detection {
  return makeDetection({
    box: { x: 0, y: 0, width: 110, height: 160, confidence: 0.93 },
    points: {
      [KP.WITHERS]: [56, 60],
      [KP.LEFT_FRONT_ELBOW]: [55, 60],
      [KP.RIGHT_FRONT_ELBOW]: [58, 60],
      [KP.LEFT_BACK_HOCK]: [78, 120],
      [KP.RIGHT_BACK_HOCK]: [80, 121],
      [KP.LEFT_FRONT_PAW]: [54, 152],
      [KP.RIGHT_FRONT_PAW]: [62, 153],
      [KP.NOSE]: [40, 28],
    },
  });
}

export function lyingDog(): Detection {
  return makeDetection({
    box: { x: 0, y: 0, width: 240, height: 80, confidence: 0.9 },
    points: {
      [KP.WITHERS]: [91, 40],
      [KP.LEFT_FRONT_ELBOW]: [90, 40],
      [KP.RIGHT_FRONT_ELBOW]: [92, 40],
      [KP.LEFT_BACK_HOCK]: [170, 22],
      [KP.RIGHT_BACK_HOCK]: [172, 22],
      [KP.LEFT_FRONT_PAW]: [60, 70],
      [KP.RIGHT_FRONT_PAW]: [68, 71],
      [KP.NOSE]: [20, 50],
    },
  });
}

/** Cão atrás de um móvel: caixa confiável, keypoints inúteis. */
export function occludedDog(): Detection {
  return makeDetection({
    box: { x: 0, y: 0, width: 110, height: 160, confidence: 0.85 },
    points: { [KP.NOSE]: [40, 30] },
  });
}

/** Caixa diz em pé, geometria diz sentado. Acontece com cão de frente. */
export function conflictingDog(): Detection {
  return makeDetection({
    box: { x: 0, y: 0, width: 200, height: 140, confidence: 0.9 },
    points: {
      [KP.WITHERS]: [61, 30],
      [KP.LEFT_FRONT_ELBOW]: [60, 30],
      [KP.RIGHT_FRONT_ELBOW]: [62, 30],
      [KP.LEFT_BACK_HOCK]: [150, 110],
      [KP.RIGHT_BACK_HOCK]: [152, 110],
      [KP.LEFT_FRONT_PAW]: [58, 132],
      [KP.RIGHT_FRONT_PAW]: [66, 133],
    },
  });
}
