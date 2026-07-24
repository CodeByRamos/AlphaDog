"""Aprende a postura a partir dos keypoints, em vez de regra escrita à mão.

Por que isto depois do gate reprovado: a razão de aspecto confunde formato de
raça com postura — dachshund em pé é largo, são-bernardo deitado é quase
quadrado. Regra de limiar não tem como separar as duas coisas. Já a geometria
relativa dos 24 pontos (onde está o quadril em relação ao ombro, onde estão as
patas) descreve a POSTURA independentemente do tamanho do cão.

Os pontos são normalizados pela caixa, então o modelo vê forma, não escala.

Validação por k-fold estratificado: com ~200 amostras, medir na mesma partição
em que se ajusta é auto-engano. O número que vale é o de validação cruzada.

    cd services/ai
    .\\.venv\\Scripts\\python.exe scripts\\learn_posture.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from ai_edge_litert.interpreter import Interpreter
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "services/ai/src"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from run_gate import LABELS, MODEL, best_detection, find_image, letterbox  # noqa: E402

CLASSES = ("sitting", "standing", "lying")
FEATURE_CACHE = ROOT / "services/ai/data/_posture_features.npz"
SEED = 1337


def features_from(det) -> np.ndarray:
    """Vetor de características invariante a escala e posição.

    Cada keypoint vira (x, y) relativo à caixa — 0..1 — mais a confiança. Ponto
    de baixa confiança não é descartado aqui: a confiança entra como coluna, e o
    classificador aprende sozinho a desconfiar dela.
    """
    box = det.box
    w = box.width if box.width > 0 else 1.0
    h = box.height if box.height > 0 else 1.0

    feats: list[float] = [box.aspect_ratio]
    for kp in det.keypoints:
        feats.append((kp.x - box.x) / w)
        feats.append((kp.y - box.y) / h)
        feats.append(kp.confidence)
    return np.asarray(feats, dtype=np.float32)


def build_dataset():
    if FEATURE_CACHE.exists():
        d = np.load(FEATURE_CACHE)
        return d["X"], d["y"]

    labels = json.loads(LABELS.read_text(encoding="utf-8"))
    interpreter = Interpreter(model_path=str(MODEL))
    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()[0]
    out = interpreter.get_output_details()[0]

    X, y = [], []
    for i, entry in enumerate(labels, 1):
        truth = entry["label"]
        if truth not in CLASSES:
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

        X.append(features_from(det))
        y.append(CLASSES.index(truth))
        if i % 50 == 0:
            print(f"  {i}/{len(labels)}", flush=True)

    X = np.stack(X)
    y = np.asarray(y)
    np.savez(FEATURE_CACHE, X=X, y=y)
    return X, y


def main() -> None:
    print("extraindo características (usa cache se existir)...")
    X, y = build_dataset()
    print(f"amostras: {len(X)}  características: {X.shape[1]}")
    for i, name in enumerate(CLASSES):
        print(f"  {name:9s}: {int((y == i).sum())}")

    # C baixo = regularização forte. Com 200 amostras e 73 colunas, é o que
    # impede o modelo de decorar em vez de generalizar.
    model = make_pipeline(
        StandardScaler(),
        LogisticRegression(max_iter=2000, C=0.1, class_weight="balanced"),
    )

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    probs = np.zeros((len(X), len(CLASSES)))
    for train_idx, test_idx in skf.split(X, y):
        model.fit(X[train_idx], y[train_idx])
        probs[test_idx] = model.predict_proba(X[test_idx])

    preds = probs.argmax(axis=1)
    acc = float((preds == y).mean())
    print(f"\nacurácia em validação cruzada (sem abstenção): {acc:.1%}")

    print("\nmatriz de confusão (linha = verdade, coluna = previsto):")
    cm = confusion_matrix(y, preds)
    print("            " + "".join(f"{c:>10s}" for c in CLASSES))
    for i, name in enumerate(CLASSES):
        print(f"  {name:10s}" + "".join(f"{v:10d}" for v in cm[i]))

    # O produto não precisa responder sempre. Abstendo quando a confiança é
    # baixa, o falso positivo cai — é exatamente o trade-off do gate.
    print("\n" + "=" * 64)
    print("COM ABSTENÇÃO — quanto o falso positivo cai ao exigir confiança")
    print("=" * 64)
    print(f"  {'limiar':>7s} {'responde':>9s} {'acurácia':>9s} {'falso positivo':>15s}")
    for thr in (0.5, 0.6, 0.7, 0.8, 0.9, 0.95):
        conf = probs.max(axis=1)
        mask = conf >= thr
        n = int(mask.sum())
        if n == 0:
            continue
        correct = int((preds[mask] == y[mask]).sum())
        wrong = n - correct
        print(
            f"  {thr:7.2f} {n / len(X):8.0%} {correct / n:9.1%} {wrong / len(X):15.1%}"
        )

    print("\n  'falso positivo' = fração do TOTAL de frames em que o app")
    print("  afirmaria uma postura errada. O teto do produto é 2%.")

    # Binário por exercício: a pergunta que o app realmente faz.
    print("\n" + "=" * 64)
    print("POR EXERCÍCIO — 'o cão está nesta postura?'")
    print("=" * 64)
    for i, name in enumerate(CLASSES):
        print(f"\n  {name}:")
        print(f"    {'limiar':>7s} {'pega':>7s} {'falso sim':>11s}")
        for thr in (0.5, 0.7, 0.8, 0.9, 0.95):
            said_yes = (preds == i) & (probs.max(axis=1) >= thr)
            n_yes = int(said_yes.sum())
            if n_yes == 0:
                print(f"    {thr:7.2f} {'0%':>7s} {'—':>11s}")
                continue
            right = int((y[said_yes] == i).sum())
            wrong = n_yes - right
            positives = int((y == i).sum())
            print(
                f"    {thr:7.2f} {right / positives:6.0%} {wrong / len(X):11.1%}"
            )


if __name__ == "__main__":
    main()
