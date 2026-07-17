"""Confere o dataset convertido antes de gastar GPU.

Um label corrompido não aparece na loss — o treino roda, o número desce, e o
modelo sai errado depois de horas. Estas checagens custam segundos.

    python scripts/verify_dataset.py --data data/yolo
"""

from __future__ import annotations

import argparse
import random
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from alphadog_ai.keypoints import NUM_KEYPOINTS  # noqa: E402

EXPECTED_FIELDS = 5 + NUM_KEYPOINTS * 3


def check_split(root: Path, split: str) -> list[str]:
    problems: list[str] = []
    images = {p.stem for p in (root / "images" / split).glob("*.jpg")}
    labels = {p.stem for p in (root / "labels" / split).glob("*.txt")}

    if not images:
        problems.append(f"{split}: nenhuma imagem")
        return problems

    # Imagem sem label vira "fundo vazio" para o YOLO: ele aprende que ali não
    # há cão. Silencioso e caro.
    orphan_images = images - labels
    orphan_labels = labels - images
    if orphan_images:
        problems.append(f"{split}: {len(orphan_images)} imagens sem label")
    if orphan_labels:
        problems.append(f"{split}: {len(orphan_labels)} labels sem imagem")

    print(f"{split}: {len(images)} imagens, {len(labels)} labels")

    # Amostra: ler 12k arquivos custaria minutos e não acharia mais que uma
    # amostra bem espalhada.
    files = sorted((root / "labels" / split).glob("*.txt"))
    sample = random.Random(1337).sample(files, min(300, len(files)))

    field_counts: Counter[int] = Counter()
    out_of_range = 0
    visible_hist: Counter[int] = Counter()

    for path in sample:
        for line in path.read_text(encoding="utf-8").splitlines():
            parts = line.split()
            field_counts[len(parts)] += 1

            if len(parts) != EXPECTED_FIELDS:
                continue

            # Tudo normalizado tem de caber em [0,1]. Fora disso o YOLO não
            # reclama; ele simplesmente aprende coordenada errada.
            values = [float(v) for v in parts[1:5]]
            if any(v < 0 or v > 1 for v in values):
                out_of_range += 1

            visible = sum(1 for i in range(NUM_KEYPOINTS) if parts[7 + i * 3] == "2")
            visible_hist[visible] += 1

    if set(field_counts) != {EXPECTED_FIELDS}:
        problems.append(
            f"{split}: campos por linha inconsistentes {dict(field_counts)}, "
            f"esperado {EXPECTED_FIELDS}"
        )
    if out_of_range:
        problems.append(f"{split}: {out_of_range} linhas com valor fora de [0,1]")

    if visible_hist:
        total = sum(visible_hist.values())
        avg = sum(k * v for k, v in visible_hist.items()) / total
        empty = visible_hist.get(0, 0)
        print(f"  keypoints visíveis: média {avg:.1f} de {NUM_KEYPOINTS}")
        if empty:
            print(f"  {empty} instâncias sem nenhum keypoint visível")
        # Anotação sem ponto visível não ensina pose. Um punhado é normal;
        # muitos indicam conversão quebrada.
        if empty / total > 0.05:
            problems.append(
                f"{split}: {empty / total:.0%} das instâncias sem keypoint visível"
            )

    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data/yolo"))
    args = parser.parse_args()

    if not (args.data / "dogs.yaml").exists():
        print(f"erro: {args.data}/dogs.yaml não existe. Rode prepare_dataset.py.", file=sys.stderr)
        return 1

    problems: list[str] = []
    for split in ("train", "val"):
        problems += check_split(args.data, split)

    # Vazamento entre treino e validação infla a métrica sem ninguém notar.
    train = {p.stem for p in (args.data / "images/train").glob("*.jpg")}
    val = {p.stem for p in (args.data / "images/val").glob("*.jpg")}
    leak = train & val
    if leak:
        problems.append(f"{len(leak)} imagens em treino E validação")
    else:
        print("\nsem vazamento entre treino e validação")

    # O flip_idx é o erro que não aparece na loss: espelha e troca os lados.
    yaml = (args.data / "dogs.yaml").read_text(encoding="utf-8")
    line = next((l for l in yaml.splitlines() if l.startswith("flip_idx:")), None)
    if not line:
        problems.append("dogs.yaml sem flip_idx")
    else:
        import json

        flip = json.loads(line.split(":", 1)[1].strip())
        if sorted(flip) != list(range(NUM_KEYPOINTS)):
            problems.append("flip_idx não é permutação de 0..N-1")
        elif any(flip[flip[i]] != i for i in range(NUM_KEYPOINTS)):
            problems.append("flip_idx não é involução (espelhar 2x não volta)")
        else:
            print(f"flip_idx: permutação válida de {NUM_KEYPOINTS} pontos")

    if problems:
        print("\nPROBLEMAS:")
        for p in problems:
            print(f"  - {p}")
        return 1

    print("\nDataset OK — pronto para treinar.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
