"""Roda o modelo real contra as fotos rotuladas à mão e emite o veredito.

Este é o momento da verdade do projeto: mede se o dogpose.tflite acerta a
DECISÃO do produto (o cão está sentado?), não se acerta pixels. O critério
bloqueante é o falso positivo — um "Excelente!" quando o cão não sentou ensina
o tutor a recompensar o comportamento errado, e aí o app piora o treino.

    cd services/ai
    .\\.venv\\Scripts\\python.exe scripts\\run_gate.py

Saída: métricas por classe, matriz de confusão e PASSOU/REPROVOU.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from ai_edge_litert.interpreter import Interpreter
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "services/ai/src"))

from alphadog_ai.evaluation import Sample, evaluate_posture  # noqa: E402
from alphadog_ai.keypoints import BoundingBox, Detection, Keypoint  # noqa: E402
from alphadog_ai.posture import Posture, classify_posture  # noqa: E402

MODEL = ROOT / "apps/mobile/assets/models/dogpose.tflite"
LABELS = ROOT / "services/ai/data/posture_labels.json"
IMAGES = ROOT / "services/ai/data/yolo/images"

INPUT_SIZE = 640
NUM_KPTS = 24


def letterbox(img: Image.Image, size: int = INPUT_SIZE):
    """Redimensiona preservando proporção e preenche com cinza.

    É o mesmo pré-processamento do treino (ultralytics). Esticar a imagem
    mudaria a razão de aspecto da caixa — justamente o sinal mais importante
    para distinguir sentado de em pé.
    """
    w, h = img.size
    scale = min(size / w, size / h)
    nw, nh = int(round(w * scale)), int(round(h * scale))
    resized = img.resize((nw, nh), Image.BILINEAR)
    canvas = Image.new("RGB", (size, size), (114, 114, 114))
    dx, dy = (size - nw) // 2, (size - nh) // 2
    canvas.paste(resized, (dx, dy))
    return canvas, scale, dx, dy


def best_detection(output: np.ndarray, scale: float, dx: int, dy: int) -> Detection | None:
    """Decodifica a saída [1, 77, 8400] para a melhor detecção.

    Layout confirmado inspecionando o arquivo (scripts/inspect_model.py):
      canais 0..3   -> cx, cy, w, h  (pixels no espaço 640x640 da entrada)
      canal  4      -> confiança da classe (só existe 'dog')
      canais 5..76  -> 24 keypoints, (x, y, visibilidade) cada
    """
    preds = output[0].T  # (8400, 77) — canais-primeiro precisa transpor
    conf = preds[:, 4]
    idx = int(np.argmax(conf))
    best = preds[idx]
    confidence = float(best[4])

    if confidence <= 0:
        return None

    # Desfaz o letterbox: tira o padding e divide pela escala, voltando para
    # pixels da imagem original.
    cx, cy, w, h = (float(v) for v in best[:4])
    x = (cx - w / 2 - dx) / scale
    y = (cy - h / 2 - dy) / scale
    box = BoundingBox(
        x=x, y=y, width=w / scale, height=h / scale, confidence=confidence
    )

    kpts = []
    for i in range(NUM_KPTS):
        base = 5 + i * 3
        kx = (float(best[base]) - dx) / scale
        ky = (float(best[base + 1]) - dy) / scale
        kv = float(best[base + 2])
        kpts.append(Keypoint(x=kx, y=ky, confidence=kv))

    return Detection(box=box, keypoints=tuple(kpts))


def find_image(img_path: str) -> Path | None:
    """O conversor achatou 'raça/arquivo.jpg' em 'raça__arquivo.jpg'."""
    flat = img_path.replace("/", "__")
    for split in ("train", "val"):
        candidate = IMAGES / split / flat
        if candidate.exists():
            return candidate
    return None


def main() -> None:
    if not MODEL.exists():
        raise SystemExit(f"modelo não encontrado: {MODEL}")

    labels = json.loads(LABELS.read_text(encoding="utf-8"))
    print(f"rótulos: {len(labels)}")

    interpreter = Interpreter(model_path=str(MODEL))
    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()[0]
    out = interpreter.get_output_details()[0]

    samples: list[Sample] = []
    missing = 0

    for i, entry in enumerate(labels, 1):
        truth_raw = entry["label"]
        # "other" não é uma das três posturas do produto: sai da conta em vez de
        # virar rótulo forçado, que sujaria a métrica.
        if truth_raw == "other":
            continue

        path = find_image(entry["img_path"])
        if path is None:
            missing += 1
            continue

        img = Image.open(path).convert("RGB")
        canvas, scale, dx, dy = letterbox(img)

        arr = np.asarray(canvas, dtype=np.float32) / 255.0  # HWC 0..1
        arr = np.transpose(arr, (2, 0, 1))[None]  # -> NCHW, como o modelo pede

        interpreter.set_tensor(inp["index"], arr)
        interpreter.invoke()
        raw = interpreter.get_tensor(out["index"])

        detection = best_detection(raw, scale, dx, dy)
        reading = classify_posture(detection)
        samples.append(
            Sample(
                reading=reading,
                truth=Posture(truth_raw),
                is_mixed_breed=bool(entry.get("is_mixed_breed", False)),
            )
        )

        if i % 25 == 0:
            print(f"  {i}/{len(labels)}", flush=True)

    if missing:
        print(f"(imagens não encontradas: {missing})")

    metrics = evaluate_posture(samples)

    print("\n" + "=" * 52)
    print("GATE — modelo real contra fotos rotuladas à mão")
    print("=" * 52)
    print(f"amostras avaliadas : {metrics.total}")
    print(f"comprometeu-se em  : {metrics.committed}")
    print(f"absteve-se em      : {metrics.abstained}  ({metrics.abstention_rate:.1%})")
    print(f"acurácia           : {metrics.accuracy:.1%}   (mínimo 90%)")
    print(f"falso positivo     : {metrics.false_success_rate:.1%}   (máximo 2%)  <- bloqueante")

    print("\nmatriz de confusão (verdade -> previsto):")
    for (truth, pred), n in sorted(metrics.confusion.items(), key=lambda kv: -kv[1]):
        mark = "ok " if truth == pred else ("-- " if pred is Posture.UNKNOWN else "ERRO")
        print(f"  {mark} {str(truth):9s} -> {str(pred):9s} {n:4d}")

    print("\n" + ("PASSOU" if metrics.passes() else "REPROVOU"))
    if not metrics.passes():
        if metrics.accuracy < 0.90:
            print(f"  - acurácia {metrics.accuracy:.1%} abaixo de 90%")
        if metrics.false_success_rate > 0.02:
            print(f"  - falso positivo {metrics.false_success_rate:.1%} acima de 2%")
        if metrics.abstention_rate > 0.35:
            print(f"  - abstenção {metrics.abstention_rate:.1%} acima de 35%")


if __name__ == "__main__":
    main()
