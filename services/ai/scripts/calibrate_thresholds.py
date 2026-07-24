"""Calibra os limiares de razão de aspecto contra a saída real do modelo.

Os valores originais em posture.py foram estimados antes de existir modelo
treinado — e o gate mostrou que estão errados: sentado até 0,95 engole boa parte
do "em pé", e deitado só a partir de 1,7 deixa 85% dos deitados virarem "em pé".

Aqui a gente varre combinações de corte e escolhe a que maximiza acurácia
respeitando o teto de falso positivo. Com divisão treino/teste: ajustar corte
nas mesmas amostras em que se mede é como colar na prova.

    cd services/ai
    .\\.venv\\Scripts\\python.exe scripts\\calibrate_thresholds.py
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
sys.path.insert(0, str(Path(__file__).resolve().parent))

from run_gate import LABELS, MODEL, best_detection, find_image, letterbox  # noqa: E402

MAX_FALSE_POSITIVE = 0.02
SEED = 1337


def collect() -> list[tuple[str, float]]:
    """(postura verdadeira, razão de aspecto) para cada foto rotulada."""
    labels = json.loads(LABELS.read_text(encoding="utf-8"))
    interpreter = Interpreter(model_path=str(MODEL))
    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()[0]
    out = interpreter.get_output_details()[0]

    rows: list[tuple[str, float]] = []
    for i, entry in enumerate(labels, 1):
        truth = entry["label"]
        if truth == "other":
            continue
        path = find_image(entry["img_path"])
        if path is None:
            continue

        img = Image.open(path).convert("RGB")
        canvas, scale, dx, dy = letterbox(img)
        arr = np.transpose(np.asarray(canvas, dtype=np.float32) / 255.0, (2, 0, 1))[None]
        interpreter.set_tensor(inp["index"], arr)
        interpreter.invoke()
        det = best_detection(interpreter.get_tensor(out["index"]), scale, dx, dy)
        if det is None:
            continue
        rows.append((truth, det.box.aspect_ratio))
        if i % 50 == 0:
            print(f"  {i}/{len(labels)}", flush=True)
    return rows


def predict(ratio: float, sit_max: float, stand_max: float, gap: float) -> str:
    """Classifica por faixa, com zona morta `gap` em cada fronteira.

    A zona morta é o que compra o falso positivo baixo: perto da fronteira o
    sinal não decide, e responder "não sei" custa uma repetição — responder
    errado custa o treino do cão.
    """
    if ratio < sit_max - gap:
        return "sitting"
    if sit_max + gap < ratio < stand_max - gap:
        return "standing"
    if ratio > stand_max + gap:
        return "lying"
    return "unknown"


def score(rows: list[tuple[str, float]], sit_max: float, stand_max: float, gap: float):
    correct = wrong = abstained = 0
    for truth, ratio in rows:
        pred = predict(ratio, sit_max, stand_max, gap)
        if pred == "unknown":
            abstained += 1
        elif pred == truth:
            correct += 1
        else:
            wrong += 1
    total = len(rows)
    committed = correct + wrong
    return {
        "accuracy": correct / committed if committed else 0.0,
        "false_positive": wrong / total if total else 1.0,
        "abstention": abstained / total if total else 1.0,
        "committed": committed,
    }


def main() -> None:
    print("rodando o modelo em todas as fotos rotuladas...")
    rows = collect()
    print(f"amostras com detecção: {len(rows)}\n")

    rng = np.random.default_rng(SEED)
    idx = rng.permutation(len(rows))
    cut = int(len(rows) * 0.6)
    train = [rows[i] for i in idx[:cut]]
    test = [rows[i] for i in idx[cut:]]
    print(f"treino {len(train)} / teste {len(test)}\n")

    best = None
    for sit_max in np.arange(0.62, 0.95, 0.01):
        for stand_max in np.arange(1.00, 1.45, 0.01):
            for gap in np.arange(0.0, 0.16, 0.01):
                m = score(train, sit_max, stand_max, gap)
                if m["false_positive"] > MAX_FALSE_POSITIVE:
                    continue
                # Entre os que respeitam o teto, o melhor é o que se compromete
                # mais vezes acertando — abstenção alta demais inviabiliza o uso.
                key = (m["committed"], m["accuracy"])
                if best is None or key > best[0]:
                    best = (key, float(sit_max), float(stand_max), float(gap), m)

    if best is None:
        print("NENHUMA combinação respeitou o teto de 2% de falso positivo no treino.")
        print("O sinal de razão de aspecto sozinho não sustenta o gate.")
        return

    _, sit_max, stand_max, gap, m_train = best
    m_test = score(test, sit_max, stand_max, gap)

    print("=" * 60)
    print("MELHOR CALIBRAGEM (escolhida no treino)")
    print("=" * 60)
    print(f"  sentado  : razão < {sit_max - gap:.2f}")
    print(f"  em pé    : {sit_max + gap:.2f} < razão < {stand_max - gap:.2f}")
    print(f"  deitado  : razão > {stand_max + gap:.2f}")
    print(f"  zona morta (gap) : ±{gap:.2f}")
    print(f"\n  constantes para posture.py:")
    print(f"    SITTING_ASPECT_MAX  = {sit_max:.2f}")
    print(f"    STANDING_ASPECT_MIN = {sit_max:.2f}   # mesma fronteira")
    print(f"    LYING_ASPECT_MIN    = {stand_max:.2f}")
    print(f"    ASPECT_DEAD_ZONE    = {gap:.2f}")

    for name, m in (("TREINO", m_train), ("TESTE (não visto)", m_test)):
        print(f"\n  {name}:")
        print(f"    acurácia       : {m['accuracy']:.1%}")
        print(f"    falso positivo : {m['false_positive']:.1%}")
        print(f"    abstenção      : {m['abstention']:.1%}")

    print("\n  O que vale é a linha do TESTE: é a única que não viu esses cortes.")


if __name__ == "__main__":
    main()
