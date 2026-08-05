"""Prova que a inferência funciona — e mede QUANTO ela funciona.

Existe porque "a IA não detecta nada" tem duas causas possíveis e opostas, e do
lado de fora elas são idênticas: uma tela sem caixa.

  (a) o modelo não reconhece nada do que recebe  -> confiança perto de zero
  (b) o limiar está apertado demais              -> confiança logo abaixo dele

Este script roda o `dogpose.tflite` contra fotos de cães de verdade, sem câmera
e sem aplicativo, e imprime a confiança bruta. É o teste que separa "modelo
ruim" de "pipeline ruim" — e roda em segundos, contra as builds de vinte minutos
que ele evita.

Compara os DOIS pré-processamentos que existem no projeto:

  letterbox     usado no gate de qualidade (mesmo do treino, com barras cinza)
  recorte       usado no aplicativo (quadrado central, via resize-plugin)

Se o letterbox detectar e o recorte não, o problema é o que o app faz com o
frame — não o modelo.

Uso:
    python services/ai/scripts/probe_pipeline.py [quantidade]
"""

from __future__ import annotations

import random
import sys
import time
from pathlib import Path

import numpy as np
from ai_edge_litert.interpreter import Interpreter
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
MODEL = ROOT / "apps/mobile/assets/models/dogpose.tflite"
IMAGES = ROOT / "services/ai/data/stanford_dogs/Images"

INPUT_SIZE = 640
# O mesmo limiar do aplicativo (packages/core/src/yolo-decode.ts).
MIN_CONFIDENCE = 0.5


def letterbox(img: Image.Image, size: int = INPUT_SIZE) -> Image.Image:
    """Encaixa preservando proporção, preenchendo com o cinza do treino."""
    w, h = img.size
    scale = min(size / w, size / h)
    nw, nh = int(round(w * scale)), int(round(h * scale))
    canvas = Image.new("RGB", (size, size), (114, 114, 114))
    canvas.paste(img.resize((nw, nh), Image.BILINEAR), ((size - nw) // 2, (size - nh) // 2))
    return canvas


def center_crop(img: Image.Image, size: int = INPUT_SIZE) -> Image.Image:
    """Recorta o maior quadrado central e escala — o que o app faz."""
    w, h = img.size
    side = min(w, h)
    left, top = (w - side) // 2, (h - side) // 2
    return img.crop((left, top, left + side, top + side)).resize(
        (size, size), Image.BILINEAR
    )


def to_tensor(canvas: Image.Image) -> np.ndarray:
    """RGB 0..1 em NCHW — o formato que o modelo declara."""
    arr = np.asarray(canvas, dtype=np.float32) / 255.0
    return np.transpose(arr, (2, 0, 1))[None]


def best_confidence(raw: np.ndarray) -> float:
    """Maior confiança entre as 8400 âncoras. Canal 4, como no app."""
    preds = raw[0].T  # (8400, 77)
    return float(np.max(preds[:, 4]))


def main() -> None:
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 40

    if not MODEL.exists():
        raise SystemExit(f"modelo não encontrado: {MODEL}")

    print(f"modelo : {MODEL.name} ({MODEL.stat().st_size:,} bytes)")

    interpreter = Interpreter(model_path=str(MODEL))
    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()[0]
    out = interpreter.get_output_details()[0]

    print(f"entrada: {inp['shape']} {inp['dtype'].__name__}")
    print(f"saída  : {out['shape']} {out['dtype'].__name__}")

    photos = sorted(IMAGES.rglob("*.jpg"))
    if not photos:
        raise SystemExit(f"nenhuma imagem em {IMAGES}")

    # Semente fixa: rodar de novo dá o mesmo conjunto, então uma queda de
    # métrica é mudança de verdade e não sorteio diferente.
    random.seed(42)
    sample = random.sample(photos, min(count, len(photos)))
    print(f"testando {len(sample)} fotos de cães\n")

    results: dict[str, list[float]] = {"letterbox": [], "recorte": []}
    elapsed: list[float] = []

    for path in sample:
        img = Image.open(path).convert("RGB")
        for name, prep in (("letterbox", letterbox), ("recorte", center_crop)):
            started = time.perf_counter()
            interpreter.set_tensor(inp["index"], to_tensor(prep(img)))
            interpreter.invoke()
            raw = interpreter.get_tensor(out["index"])
            elapsed.append((time.perf_counter() - started) * 1000)
            results[name].append(best_confidence(raw))

    print("=" * 58)
    print("CONFIANÇA BRUTA DO MODELO — sem câmera, sem aplicativo")
    print("=" * 58)

    for name, values in results.items():
        arr = np.array(values)
        detected = int((arr >= MIN_CONFIDENCE).sum())
        print(f"\n{name}:")
        print(f"  média            : {arr.mean():.3f}")
        print(f"  mediana          : {np.median(arr):.3f}")
        print(f"  mínimo / máximo  : {arr.min():.3f} / {arr.max():.3f}")
        print(f"  acima de {MIN_CONFIDENCE}     : {detected}/{len(arr)}  ({detected / len(arr):.0%})")

    print(f"\ninferência: {np.mean(elapsed):.0f}ms por frame (CPU deste computador)")

    letter = np.array(results["letterbox"])
    crop = np.array(results["recorte"])
    veredicto = (
        "O MODELO FUNCIONA."
        if (letter >= MIN_CONFIDENCE).mean() > 0.5
        else "O MODELO NÃO RECONHECE CÃES — o problema é o modelo, não o app."
    )
    print(f"\n>> {veredicto}")

    if (letter >= MIN_CONFIDENCE).mean() > 0.5 and (crop >= MIN_CONFIDENCE).mean() < 0.5:
        print(">> O RECORTE CENTRAL DERRUBA A DETECÇÃO. É o que o app faz.")


if __name__ == "__main__":
    main()
