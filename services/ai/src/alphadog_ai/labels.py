"""Conjunto de postura rotulado à mão.

Existe porque o StanfordExtra tem keypoints mas não tem rótulo de postura: ele
diz onde está a pata, não se o cão está sentado. Sem este conjunto o gate não
tem contra o que medir a decisão do produto.

Cem por classe parece pouco e basta: o gate mede *decisão*, não treina nada — o
modelo já aprendeu pose com as 12 mil imagens.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

from .posture import Posture

#: Rótulo para quem não é nenhuma das três. Cão correndo, pulando, de costas.
#: Precisa existir: forçar uma das três criaria rótulo errado, e rótulo errado
#: no conjunto de avaliação é pior que amostra menor.
OTHER = "other"

VALID_LABELS = (Posture.SITTING, Posture.STANDING, Posture.LYING, OTHER)


@dataclass(frozen=True)
class PostureLabel:
    """Uma imagem rotulada."""

    #: Caminho relativo dentro do dataset, ex.: "n02085620-Chihuahua/img.jpg".
    img_path: str
    label: str
    #: Raça, extraída do caminho. Guardada explícita para a segmentação por SRD
    #: não depender de parsing na hora de medir.
    breed: str
    #: True quando o rotulador marcou como vira-lata. O StanfordExtra é feito de
    #: raça pura, então isto só fica verdadeiro se você trouxer fotos próprias.
    is_mixed_breed: bool = False


def breed_from_path(img_path: str) -> str:
    """'n02085620-Chihuahua/foo.jpg' -> 'Chihuahua'."""
    head = img_path.split("/")[0]
    return head.split("-", 1)[1] if "-" in head else head


def load_labels(path: Path) -> list[PostureLabel]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        raw = json.load(f)
    return [PostureLabel(**entry) for entry in raw]


def save_labels(path: Path, labels: list[PostureLabel]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump([asdict(label) for label in labels], f, ensure_ascii=False, indent=2)


def label_summary(labels: list[PostureLabel]) -> dict[str, int]:
    counts: dict[str, int] = {str(label): 0 for label in VALID_LABELS}
    for label in labels:
        counts[label.label] = counts.get(label.label, 0) + 1
    return counts


#: Mínimo por classe para o gate ter significado estatístico.
#:
#: Com 50, um erro vale 2 pontos percentuais — e o critério de falso positivo é
#: 2%. A amostra precisa ser grande o bastante para o limiar distinguir sinal de
#: ruído.
MIN_PER_CLASS = 60


def is_ready_for_gate(labels: list[PostureLabel]) -> tuple[bool, str]:
    """O conjunto tem o suficiente para o gate significar algo?"""
    counts = label_summary(labels)
    missing = [
        f"{label} ({counts.get(str(label), 0)}/{MIN_PER_CLASS})"
        for label in (Posture.SITTING, Posture.STANDING, Posture.LYING)
        if counts.get(str(label), 0) < MIN_PER_CLASS
    ]
    if missing:
        return False, "faltam rótulos: " + ", ".join(missing)
    return True, "pronto"
