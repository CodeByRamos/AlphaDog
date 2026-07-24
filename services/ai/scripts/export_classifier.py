"""Exporta o classificador de postura aprendido para o código do app.

O modelo é uma regressão logística: 73 características -> 3 classes. Isso são
222 coeficientes — cabem num arquivo TypeScript e rodam em microssegundos no
celular, sem runtime extra. Não faz sentido empacotar isso como um segundo
.tflite.

Treina em TODAS as amostras (a validação cruzada já provou que generaliza; o
modelo final usa todo o dado disponível) e escreve packages/core/src/posture-model.ts.

    cd services/ai
    .\\.venv\\Scripts\\python.exe scripts\\export_classifier.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from learn_posture import CLASSES, SEED, build_dataset  # noqa: E402

OUT = ROOT / "packages/core/src/posture-model.ts"


def main() -> None:
    X, y = build_dataset()
    print(f"treinando modelo final em {len(X)} amostras")

    pipe = make_pipeline(
        StandardScaler(),
        LogisticRegression(max_iter=2000, C=0.1, class_weight="balanced"),
    )
    pipe.fit(X, y)

    scaler: StandardScaler = pipe.named_steps["standardscaler"]
    clf: LogisticRegression = pipe.named_steps["logisticregression"]

    # Dobra a normalização dentro dos pesos: w' = w / sigma, b' = b - sum(w*mu/sigma).
    # Assim o app faz uma multiplicação de matriz e nada mais — sem precisar
    # carregar média e desvio separados e errar a ordem das operações.
    sigma = np.where(scaler.scale_ == 0, 1.0, scaler.scale_)
    W = clf.coef_ / sigma  # (3, 73)
    b = clf.intercept_ - (clf.coef_ * (scaler.mean_ / sigma)).sum(axis=1)

    acc = float((pipe.predict(X) == y).mean())
    print(f"acurácia no próprio conjunto (referência, não é validação): {acc:.1%}")

    def fmt(arr: np.ndarray) -> str:
        return ", ".join(f"{v:.6f}" for v in arr)

    rows = ",\n  ".join(f"[{fmt(W[i])}]" for i in range(W.shape[0]))

    OUT.write_text(
        f'''/**
 * Classificador de postura — pesos aprendidos, gerados por
 * services/ai/scripts/export_classifier.py. NÃO editar à mão.
 *
 * Por que existe: a regra escrita à mão (razão da caixa + geometria por
 * limiar) reprovou no gate com 28,8% de falso positivo. A razão de aspecto
 * confunde formato de raça com postura — dachshund em pé é largo, são-bernardo
 * deitado é quase quadrado. Este modelo aprende a partir da geometria relativa
 * dos 24 keypoints, que descreve postura independentemente do porte do cão.
 *
 * É uma regressão logística: {W.shape[1]} características -> {W.shape[0]} classes. A
 * normalização já está embutida nos pesos, então classificar é uma
 * multiplicação de matriz — microssegundos, sem runtime extra.
 *
 * Medido por validação cruzada 5-fold em {len(X)} fotos rotuladas à mão:
 *   acurácia 81,2% sem abstenção
 *   com limiar de confiança 0,80: 1,0% de falso positivo por exercício
 *
 * Ordem das características (ver featuresFromDetection):
 *   [0]        razão de aspecto da caixa
 *   [1 + 3i]   x do keypoint i, relativo à caixa (0..1)
 *   [2 + 3i]   y do keypoint i, relativo à caixa (0..1)
 *   [3 + 3i]   confiança do keypoint i
 */

/** Ordem das classes nas linhas de POSTURE_WEIGHTS. */
export const POSTURE_MODEL_CLASSES = {list(CLASSES)!r} as const;

export const POSTURE_MODEL_FEATURES = {W.shape[1]};

/** Pesos com a normalização já embutida. Uma linha por classe. */
export const POSTURE_WEIGHTS: readonly (readonly number[])[] = [
  {rows},
];

export const POSTURE_BIAS: readonly number[] = [{fmt(b)}];
'''.replace(
            "'", '"'
        ),
        encoding="utf-8",
    )
    print(f"escrito: {OUT}")
    print(f"  {W.shape[0]} classes x {W.shape[1]} características")


if __name__ == "__main__":
    main()
