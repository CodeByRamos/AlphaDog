"""Converte o StanfordExtra para o layout que o Ultralytics espera.

Uso:

    python scripts/prepare_dataset.py \
        --json data/StanfordExtra_v12.json \
        --images data/stanford_dogs/Images \
        --out data/yolo

Não baixa nada: o StanfordExtra exige aceitar os termos por formulário, e o
Stanford Dogs é um tar de 750 MB. Ver README para os links.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from alphadog_ai.dataset import (  # noqa: E402
    dataset_yaml,
    load_stanford_extra,
    stratified_split,
    to_yolo_line,
)


def write_split(
    samples, images_root: Path, out: Path, split: str, *, link: bool
) -> tuple[int, int]:
    """Escreve imagens e labels de um split. Devolve (escritos, pulados)."""
    img_dir = out / "images" / split
    lbl_dir = out / "labels" / split
    img_dir.mkdir(parents=True, exist_ok=True)
    lbl_dir.mkdir(parents=True, exist_ok=True)

    written = 0
    skipped = 0

    for sample in samples:
        src = images_root / sample.img_path
        if not src.exists():
            # Anotação sem imagem correspondente: comum quando o Stanford Dogs
            # foi extraído parcialmente. Pular é melhor que abortar o dataset
            # inteiro, mas o total precisa aparecer no relatório.
            skipped += 1
            continue

        try:
            line = to_yolo_line(sample)
        except ValueError as exc:
            print(f"  label inválido, pulando: {exc}", file=sys.stderr)
            skipped += 1
            continue

        # Nome achatado: o YOLO espera imagem e label lado a lado, e o
        # StanfordExtra tem uma pasta por raça.
        flat = sample.img_path.replace("/", "__")
        dst = img_dir / flat

        if not dst.exists():
            if link:
                try:
                    dst.hardlink_to(src)
                except OSError:
                    # Volume diferente ou FS sem suporte: copia.
                    shutil.copy2(src, dst)
            else:
                shutil.copy2(src, dst)

        (lbl_dir / f"{Path(flat).stem}.txt").write_text(line + "\n", encoding="utf-8")
        written += 1

    return written, skipped


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", type=Path, required=True)
    parser.add_argument("--images", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--val-fraction", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument(
        "--copy",
        action="store_true",
        help="Copiar em vez de hardlink (hardlink poupa ~750MB).",
    )
    args = parser.parse_args()

    if not args.json.exists():
        print(f"erro: {args.json} não existe. Ver README.", file=sys.stderr)
        return 1
    if not args.images.is_dir():
        print(f"erro: {args.images} não é diretório. Ver README.", file=sys.stderr)
        return 1

    print(f"lendo {args.json}...")
    samples = load_stanford_extra(args.json)
    breeds = Counter(s.breed for s in samples)
    print(f"  {len(samples)} anotações, {len(breeds)} raças")

    train, val = stratified_split(
        samples, val_fraction=args.val_fraction, seed=args.seed
    )
    print(f"  split estratificado: {len(train)} treino / {len(val)} validação")

    tw, ts = write_split(train, args.images, args.out, "train", link=not args.copy)
    vw, vs = write_split(val, args.images, args.out, "val", link=not args.copy)

    yaml_path = args.out / "dogs.yaml"
    yaml_path.write_text(dataset_yaml(args.out.resolve()), encoding="utf-8")

    print(f"\nescritos: {tw} treino, {vw} validação")
    if ts or vs:
        print(f"pulados: {ts + vs} (imagem ausente ou label inválido)")
    print(f"yaml: {yaml_path}")

    if tw == 0:
        print("\nerro: nenhuma imagem escrita — confira --images", file=sys.stderr)
        return 1

    # Aviso permanente: o dataset é de raça pura, e nosso mercado não é.
    print(
        "\nNOTA: StanfordExtra são 120 raças puras. Este dataset não valida\n"
        "      desempenho em SRD — o gate PRODUCTION seguirá bloqueado."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
