"""O que é alcançável com este modelo: fronteira de trade-off, honesta.

O gate de 3 classes reprovou e nenhuma calibragem de razão de aspecto respeita
2% de falso positivo. Antes de descartar a visão, resta a pergunta que o produto
realmente faz: durante o exercício de sentar, o app não precisa saber se o cão
está deitado ou em pé — precisa saber se ELE SENTOU.

Este script mede a versão binária, por exercício, e mostra a que custo de
abstenção cada nível de falso positivo é comprado.

    cd services/ai
    .\\.venv\\Scripts\\python.exe scripts\\feasibility.py
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

SEED = 1337
CACHE = ROOT / "services/ai/data/_aspect_cache.json"


def collect() -> list[tuple[str, float]]:
    if CACHE.exists():
        return [(t, r) for t, r in json.loads(CACHE.read_text())]

    labels = json.loads(LABELS.read_text(encoding="utf-8"))
    interpreter = Interpreter(model_path=str(MODEL))
    interpreter.allocate_tensors()
    inp = interpreter.get_input_details()[0]
    out = interpreter.get_output_details()[0]

    rows = []
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

    CACHE.write_text(json.dumps(rows))
    return rows


def binary_scan(rows, target: str, lower_is_target: bool):
    """Varre um corte único para 'é {target}?' e devolve a fronteira de Pareto.

    lower_is_target: True quando o alvo tem razão MENOR que os outros (sentado).
    """
    rng = np.random.default_rng(SEED)
    idx = rng.permutation(len(rows))
    cut = int(len(rows) * 0.6)
    train = [rows[i] for i in idx[:cut]]
    test = [rows[i] for i in idx[cut:]]

    results = []
    for thr in np.arange(0.55, 2.0, 0.01):
        for gap in np.arange(0.0, 0.30, 0.01):

            def evaluate(data):
                said_yes_right = said_yes_wrong = abstained = 0
                for truth, ratio in data:
                    is_target = truth == target
                    if lower_is_target:
                        yes = ratio < thr - gap
                        no = ratio > thr + gap
                    else:
                        yes = ratio > thr + gap
                        no = ratio < thr - gap

                    if yes:
                        if is_target:
                            said_yes_right += 1
                        else:
                            said_yes_wrong += 1
                    elif no:
                        pass  # disse "ainda não" — não é o erro que nos preocupa
                    else:
                        abstained += 1
                total = len(data)
                positives = sum(1 for t, _ in data if t == target)
                return {
                    # A métrica que mata o produto: dizer "sentou" quando não sentou.
                    "false_yes_rate": said_yes_wrong / total if total else 1.0,
                    # Quantos sentares reais o app consegue registrar.
                    "recall": said_yes_right / positives if positives else 0.0,
                    "abstention": abstained / total if total else 1.0,
                }

            m_train = evaluate(train)
            m_test = evaluate(test)
            results.append((float(thr), float(gap), m_train, m_test))

    return results


def report(rows, target: str, lower_is_target: bool, label: str):
    print("\n" + "=" * 64)
    print(f"{label}  —  pergunta binária: 'o cão está {target}?'")
    print("=" * 64)

    results = binary_scan(rows, target, lower_is_target)

    for ceiling in (0.02, 0.05, 0.10):
        # Melhor recall no treino respeitando o teto; depois olha o teste.
        viable = [r for r in results if r[2]["false_yes_rate"] <= ceiling]
        if not viable:
            print(f"\n  teto de falso 'sim' {ceiling:.0%}: impossível")
            continue
        thr, gap, m_train, m_test = max(viable, key=lambda r: r[2]["recall"])
        print(f"\n  teto de falso 'sim' {ceiling:.0%}:")
        op = "<" if lower_is_target else ">"
        edge = thr - gap if lower_is_target else thr + gap
        print(f"    regra: razão {op} {edge:.2f}")
        print(
            f"    treino -> falso sim {m_train['false_yes_rate']:.1%} | "
            f"pega {m_train['recall']:.0%} dos {target}"
        )
        print(
            f"    TESTE  -> falso sim {m_test['false_yes_rate']:.1%} | "
            f"pega {m_test['recall']:.0%} dos {target}"
        )


def main() -> None:
    print("coletando razões de aspecto (usa cache se existir)...")
    rows = collect()
    n = {t: sum(1 for x, _ in rows if x == t) for t in ("sitting", "standing", "lying")}
    print(f"amostras: {len(rows)}  {n}")

    report(rows, "sitting", True, "EXERCÍCIO SENTAR")
    report(rows, "lying", False, "EXERCÍCIO DEITAR")

    print("\n" + "=" * 64)
    print("COMO LER")
    print("=" * 64)
    print("  'falso sim' é o app dizer que o cão sentou quando ele não sentou —")
    print("  o erro que ensina o tutor a recompensar errado. É o número que manda.")
    print("  'pega X%' é quantas repetições reais o app conseguiria contar sozinho;")
    print("  o resto continua no botão do tutor, que já existe e funciona.")


if __name__ == "__main__":
    main()
