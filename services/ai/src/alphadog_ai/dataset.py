"""Conversão do StanfordExtra para o formato de pose do YOLO.

O StanfordExtra distribui um JSON único com keypoints e máscaras, referenciando
imagens do Stanford Dogs. O Ultralytics quer um `.txt` por imagem, normalizado,
mais um YAML descrevendo o dataset. Este módulo faz a ponte.

Formato de destino, por linha (uma linha por instância):

    class cx cy w h  px1 py1 v1  px2 py2 v2  ...

Tudo normalizado por largura/altura da imagem. `v` é visibilidade: 0 ausente,
1 ocluído, 2 visível.

A distinção 1 vs 2 importa mais aqui do que em pose humana: quando o cão senta,
as patas traseiras ficam ocluídas mas continuam existindo. Marcar como ausente
ensinaria o modelo que o membro sumiu; marcar como visível ensinaria a alucinar
posição. É a diferença entre um modelo que sabe que não sabe e um que inventa.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path

from .keypoints import NUM_KEYPOINTS

#: Uma classe só: "cão". Raça é problema do classificador, não do detector.
DOG_CLASS = 0

#: Visibilidade no padrão COCO/Ultralytics.
V_ABSENT = 0
V_OCCLUDED = 1
V_VISIBLE = 2


@dataclass(frozen=True)
class RawSample:
    """Uma entrada do StanfordExtra_v12.json, já lida."""

    img_path: str
    img_width: int
    img_height: int
    #: 20 triplas (x, y, visibility) em pixels absolutos.
    joints: list[list[float]]
    #: [x, y, w, h] em pixels absolutos.
    img_bbox: list[float]

    @property
    def breed(self) -> str:
        """Raça, extraída do caminho: 'n02085620-Chihuahua/foo.jpg'.

        Usada para o split estratificado — e, no futuro, para medir se alguma
        raça específica puxa a acurácia para baixo.
        """
        head = self.img_path.split("/")[0]
        return head.split("-", 1)[1] if "-" in head else head


def _clamp01(value: float) -> float:
    return min(max(value, 0.0), 1.0)


def to_yolo_line(sample: RawSample) -> str:
    """Converte uma amostra para uma linha de label do YOLO.

    Levanta se a imagem tiver dimensão inválida: normalizar por zero produziria
    labels silenciosamente corrompidos, e um dataset ruim é bem mais caro de
    descobrir depois do treino.
    """
    if sample.img_width <= 0 or sample.img_height <= 0:
        raise ValueError(f"dimensão inválida em {sample.img_path}")
    if len(sample.joints) != NUM_KEYPOINTS:
        raise ValueError(
            f"{sample.img_path}: esperados {NUM_KEYPOINTS} joints, "
            f"recebidos {len(sample.joints)}"
        )

    w, h = float(sample.img_width), float(sample.img_height)
    bx, by, bw, bh = sample.img_bbox

    # YOLO quer centro da caixa, não canto.
    cx = _clamp01((bx + bw / 2) / w)
    cy = _clamp01((by + bh / 2) / h)
    nw = _clamp01(bw / w)
    nh = _clamp01(bh / h)

    parts = [str(DOG_CLASS), f"{cx:.6f}", f"{cy:.6f}", f"{nw:.6f}", f"{nh:.6f}"]

    for joint in sample.joints:
        x, y, visible = joint[0], joint[1], joint[2]
        if not visible:
            # Ponto ausente: zera coordenada. O Ultralytics ignora v=0 na loss.
            parts.extend(["0.000000", "0.000000", str(V_ABSENT)])
            continue

        nx, ny = x / w, y / h
        # Ponto anotado mas fora do quadro é dado sujo: trata como ausente em
        # vez de fixar na borda, que ensinaria uma posição errada.
        if not (0.0 <= nx <= 1.0 and 0.0 <= ny <= 1.0):
            parts.extend(["0.000000", "0.000000", str(V_ABSENT)])
            continue

        parts.extend([f"{nx:.6f}", f"{ny:.6f}", str(V_VISIBLE)])

    return " ".join(parts)


def load_stanford_extra(json_path: Path) -> list[RawSample]:
    """Lê o StanfordExtra_v12.json."""
    with json_path.open(encoding="utf-8") as f:
        raw = json.load(f)

    return [
        RawSample(
            img_path=entry["img_path"],
            img_width=entry["img_width"],
            img_height=entry["img_height"],
            joints=entry["joints"],
            img_bbox=entry["img_bbox"],
        )
        for entry in raw
    ]


def stratified_split(
    samples: list[RawSample],
    *,
    val_fraction: float = 0.15,
    seed: int = 1337,
) -> tuple[list[RawSample], list[RawSample]]:
    """Divide treino/validação estratificando por raça.

    Split aleatório puro deixaria raças inteiras fora da validação — e aí a
    métrica não diria nada sobre elas. Como já sabemos que generalização entre
    raças é o ponto fraco deste dataset (só raça pura), estratificar é o mínimo.

    `seed` fixo: o split precisa ser reproduzível entre execuções, senão
    comparar dois treinos não significa nada.
    """
    by_breed: dict[str, list[RawSample]] = {}
    for sample in samples:
        by_breed.setdefault(sample.breed, []).append(sample)

    rng = random.Random(seed)
    train: list[RawSample] = []
    val: list[RawSample] = []

    for breed in sorted(by_breed):
        group = sorted(by_breed[breed], key=lambda s: s.img_path)
        rng.shuffle(group)
        cut = max(1, round(len(group) * val_fraction)) if len(group) > 1 else 0
        val.extend(group[:cut])
        train.extend(group[cut:])

    return train, val


def dataset_yaml(root: Path) -> str:
    """YAML do dataset para o Ultralytics.

    `flip_idx` é obrigatório e fácil de errar: ao espelhar a imagem, a pata
    esquerda vira direita. Sem este mapa o augment de flip treinaria o modelo
    com lados trocados — um bug que não aparece na loss, só na inferência.
    """
    # Ver KP em keypoints.py. Ao espelhar, tudo que tem lado troca de par; o que
    # está no eixo do corpo (nariz, queixo, cauda, cernelha, garganta) aponta
    # para si mesmo.
    flip_idx = [
        6, 7, 8, 9, 10, 11,   # pernas esquerdas -> direitas
        0, 1, 2, 3, 4, 5,     # pernas direitas -> esquerdas
        12, 13,               # cauda: no eixo
        15, 14,               # bases de orelha trocam
        16, 17,               # nariz e queixo: no eixo
        19, 18,               # pontas de orelha trocam
        21, 20,               # olhos trocam
        22, 23,               # cernelha e garganta: no eixo
    ]
    return f"""# Gerado por alphadog_ai.dataset — não editar à mão.
path: {root.as_posix()}
train: images/train
val: images/val

kpt_shape: [{NUM_KEYPOINTS}, 3]
flip_idx: {flip_idx}

names:
  {DOG_CLASS}: dog
"""
