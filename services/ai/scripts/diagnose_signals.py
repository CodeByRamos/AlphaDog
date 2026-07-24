"""Mede a distribuição real dos sinais por postura verdadeira.

Roda depois de um gate reprovado para responder a pergunta que decide o rumo:
o modelo não vê, ou os limiares do classificador estão calibrados errado?

Se as distribuições de razão de aspecto se sobrepõem totalmente entre deitado e
em pé, nenhum limiar salva — o sinal não existe e precisamos de outro. Se elas
se separam mas o corte está no lugar errado, é só recalibrar.

    cd services/ai
    .\\.venv\\Scripts\\python.exe scripts\\diagnose_signals.py
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from ai_edge_litert.interpreter import Interpreter
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "services/ai/src"))

from alphadog_ai.keypoints import KP, HIPS, SHOULDERS  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_gate import IMAGES, LABELS, MODEL, best_detection, find_image, letterbox  # noqa: E402


def pct(values: list[float], p: float) -> float:
    return float(np.percentile(values, p)) if values else float("nan")


def main() -> None:
    labels = json.loads(LABELS.read_text(encoding="utf-8"))

    interpreter = Interpreter(model_path=str(MODEL))
    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()[0]
    out = interpreter.get_output_details()[0]

    aspect: dict[str, list[float]] = defaultdict(list)
    box_conf: dict[str, list[float]] = defaultdict(list)
    kpt_conf: dict[str, list[float]] = defaultdict(list)
    hip_drop: dict[str, list[float]] = defaultdict(list)
    visible_kpts: dict[str, list[int]] = defaultdict(list)

    for i, entry in enumerate(labels, 1):
        truth = entry["label"]
        if truth == "other":
            continue
        path = find_image(entry["img_path"])
        if path is None:
            continue

        img = Image.open(path).convert("RGB")
        canvas, scale, dx, dy = letterbox(img)
        arr = np.asarray(canvas, dtype=np.float32) / 255.0
        arr = np.transpose(arr, (2, 0, 1))[None]

        interpreter.set_tensor(inp["index"], arr)
        interpreter.invoke()
        det = best_detection(interpreter.get_tensor(out["index"]), scale, dx, dy)
        if det is None:
            continue

        aspect[truth].append(det.box.aspect_ratio)
        box_conf[truth].append(det.box.confidence)
        kpt_conf[truth].extend(k.confidence for k in det.keypoints)
        visible_kpts[truth].append(sum(1 for k in det.keypoints if k.visible))

        # Queda do quadril em relação ao ombro, normalizada pela altura da caixa.
        # É o sinal geométrico que deveria separar sentado (quadril baixo) de em
        # pé (quadril na altura do ombro).
        hips = [det.get(k) for k in HIPS]
        shoulders = [det.get(k) for k in SHOULDERS]
        if hips and shoulders and det.box.height > 0:
            hy = float(np.mean([k.y for k in hips]))
            sy = float(np.mean([k.y for k in shoulders]))
            hip_drop[truth].append((hy - sy) / det.box.height)

        if i % 50 == 0:
            print(f"  {i}/{len(labels)}", flush=True)

    print("\n" + "=" * 68)
    print("DISTRIBUIÇÃO DOS SINAIS POR POSTURA VERDADEIRA")
    print("=" * 68)

    for name, data, fmt in [
        ("razão de aspecto (largura/altura)", aspect, "{:.2f}"),
        ("confiança da caixa", box_conf, "{:.2f}"),
        ("queda do quadril (norm. pela altura)", hip_drop, "{:.2f}"),
    ]:
        print(f"\n{name}:")
        print(f"  {'postura':10s} {'n':>4s} {'p10':>7s} {'p25':>7s} {'mediana':>8s} {'p75':>7s} {'p90':>7s}")
        for posture in ("standing", "sitting", "lying"):
            v = data.get(posture, [])
            if not v:
                continue
            row = "  {:10s} {:4d} " + " ".join([fmt.rjust(7)] * 5)
            print(
                row.format(
                    posture, len(v), pct(v, 10), pct(v, 25), pct(v, 50), pct(v, 75), pct(v, 90)
                )
            )

    print("\nkeypoints visíveis por foto (de 24), e confiança média dos pontos:")
    for posture in ("standing", "sitting", "lying"):
        vis = visible_kpts.get(posture, [])
        kc = kpt_conf.get(posture, [])
        if not vis:
            continue
        print(
            f"  {posture:10s} visíveis mediana={pct(vis, 50):.0f}  "
            f"confiança média={np.mean(kc):.2f}  p90={pct(kc, 90):.2f}"
        )

    print("\nLEITURA:")
    print("  Se as faixas p25..p75 de 'lying' e 'standing' se sobrepõem na razão de")
    print("  aspecto, esse sinal não separa os dois — nenhum limiar resolve.")
    print("  Se a confiança dos keypoints for baixa (< 0.5), a geometria não")
    print("  entra e o classificador fica cego ao segundo sinal.")


if __name__ == "__main__":
    main()
