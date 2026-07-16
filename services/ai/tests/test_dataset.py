"""O contrato da conversão de dataset.

Erro aqui é caro: um label corrompido não aparece na loss, só na inferência,
depois de horas de GPU. Cada teste aqui é uma hora economizada.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from alphadog_ai.dataset import (
    DOG_CLASS,
    V_ABSENT,
    V_VISIBLE,
    RawSample,
    dataset_yaml,
    stratified_split,
    to_yolo_line,
)
from alphadog_ai.keypoints import KP, NUM_KEYPOINTS


def make_sample(
    *,
    path: str = "n02085620-Chihuahua/img_0.jpg",
    width: int = 200,
    height: int = 100,
    joints: list[list[float]] | None = None,
    bbox: list[float] | None = None,
) -> RawSample:
    return RawSample(
        img_path=path,
        img_width=width,
        img_height=height,
        joints=joints or [[10.0, 20.0, 1.0]] * NUM_KEYPOINTS,
        img_bbox=bbox or [0.0, 0.0, 200.0, 100.0],
    )


class TestYoloLine:
    def test_box_is_converted_to_center_form(self) -> None:
        # Caixa 100x50 no canto -> centro (50,25) -> normalizado (0.25, 0.25).
        sample = make_sample(bbox=[0.0, 0.0, 100.0, 50.0])
        parts = to_yolo_line(sample).split()
        assert parts[0] == str(DOG_CLASS)
        assert float(parts[1]) == pytest.approx(0.25)
        assert float(parts[2]) == pytest.approx(0.25)
        assert float(parts[3]) == pytest.approx(0.5)
        assert float(parts[4]) == pytest.approx(0.5)

    def test_line_has_one_triplet_per_keypoint(self) -> None:
        parts = to_yolo_line(make_sample()).split()
        # 1 classe + 4 da caixa + 3 por keypoint.
        assert len(parts) == 5 + NUM_KEYPOINTS * 3

    def test_keypoints_are_normalized(self) -> None:
        joints = [[100.0, 50.0, 1.0]] * NUM_KEYPOINTS
        parts = to_yolo_line(make_sample(joints=joints)).split()
        assert float(parts[5]) == pytest.approx(0.5)
        assert float(parts[6]) == pytest.approx(0.5)
        assert parts[7] == str(V_VISIBLE)

    def test_invisible_joint_becomes_absent(self) -> None:
        joints = [[10.0, 20.0, 1.0]] * NUM_KEYPOINTS
        joints[int(KP.LEFT_BACK_PAW)] = [10.0, 20.0, 0.0]
        parts = to_yolo_line(make_sample(joints=joints)).split()

        offset = 5 + int(KP.LEFT_BACK_PAW) * 3
        assert parts[offset] == "0.000000"
        assert parts[offset + 1] == "0.000000"
        assert parts[offset + 2] == str(V_ABSENT)

    def test_out_of_frame_joint_is_dropped_not_clamped(self) -> None:
        """Ponto fora do quadro é dado sujo.

        Fixar na borda ensinaria uma posição errada; melhor tratar como ausente
        e deixar o modelo aprender que ali não há informação.
        """
        joints = [[10.0, 20.0, 1.0]] * NUM_KEYPOINTS
        joints[int(KP.NOSE)] = [500.0, 20.0, 1.0]  # x > width
        parts = to_yolo_line(make_sample(joints=joints)).split()

        offset = 5 + int(KP.NOSE) * 3
        assert parts[offset + 2] == str(V_ABSENT)

    def test_box_is_clamped_to_frame(self) -> None:
        # Caixa maior que a imagem: normalizado não pode passar de 1.
        sample = make_sample(bbox=[0.0, 0.0, 400.0, 300.0])
        parts = to_yolo_line(sample).split()
        assert float(parts[3]) <= 1.0
        assert float(parts[4]) <= 1.0


class TestYoloLineRejectsBadData:
    def test_zero_dimension_raises(self) -> None:
        # Normalizar por zero produziria label corrompido em silêncio.
        with pytest.raises(ValueError, match="dimensão inválida"):
            to_yolo_line(make_sample(width=0))

    def test_wrong_joint_count_raises(self) -> None:
        with pytest.raises(ValueError, match="joints"):
            to_yolo_line(make_sample(joints=[[1.0, 2.0, 1.0]] * 5))


class TestStratifiedSplit:
    def test_every_breed_appears_in_validation(self) -> None:
        """Split aleatório deixaria raças inteiras fora da validação."""
        samples = [
            make_sample(path=f"n0000{b}-Breed{b}/img_{i}.jpg")
            for b in range(5)
            for i in range(20)
        ]
        train, val = stratified_split(samples, val_fraction=0.2)

        assert {s.breed for s in val} == {f"Breed{b}" for b in range(5)}
        assert {s.breed for s in train} == {f"Breed{b}" for b in range(5)}

    def test_no_sample_appears_in_both_sides(self) -> None:
        # Vazamento treino/val inflaria a métrica sem ninguém notar.
        samples = [
            make_sample(path=f"n1-Breed/img_{i}.jpg") for i in range(50)
        ]
        train, val = stratified_split(samples)
        assert not {s.img_path for s in train} & {s.img_path for s in val}
        assert len(train) + len(val) == 50

    def test_split_is_reproducible(self) -> None:
        samples = [make_sample(path=f"n1-Breed/img_{i}.jpg") for i in range(50)]
        first = stratified_split(samples, seed=7)[1]
        second = stratified_split(samples, seed=7)[1]
        assert [s.img_path for s in first] == [s.img_path for s in second]

    def test_singleton_breed_stays_in_train(self) -> None:
        # Raça com uma imagem só: manter no treino é melhor que esvaziar o
        # treino dela para preencher a validação.
        samples = [make_sample(path="n1-Rare/only.jpg")]
        train, val = stratified_split(samples)
        assert len(train) == 1
        assert val == []


def parse_flip_idx() -> list[int]:
    """Extrai flip_idx do YAML gerado."""
    text = dataset_yaml(Path("/data/dogs"))
    line = next(l for l in text.splitlines() if l.startswith("flip_idx:"))
    return json.loads(line.split(":", 1)[1].strip())


class TestDatasetYaml:
    def test_flip_idx_swaps_left_and_right(self) -> None:
        """O erro mais fácil de não perceber.

        Ao espelhar a imagem, a pata esquerda vira direita. Sem este mapa o
        augment de flip treina o modelo com os lados trocados — e isso não
        aparece na loss, só na inferência.
        """
        flip = parse_flip_idx()
        assert len(flip) == NUM_KEYPOINTS
        assert flip[int(KP.LEFT_FRONT_PAW)] == int(KP.RIGHT_FRONT_PAW)
        assert flip[int(KP.RIGHT_FRONT_PAW)] == int(KP.LEFT_FRONT_PAW)
        assert flip[int(KP.LEFT_BACK_KNEE)] == int(KP.RIGHT_BACK_KNEE)
        assert flip[int(KP.LEFT_EAR_TIP)] == int(KP.RIGHT_EAR_TIP)

    def test_flip_idx_is_an_involution(self) -> None:
        """Espelhar duas vezes tem que voltar ao original."""
        flip = parse_flip_idx()
        for i in range(NUM_KEYPOINTS):
            assert flip[flip[i]] == i, f"keypoint {i} não volta ao original"

    def test_flip_idx_is_a_permutation(self) -> None:
        # Índice repetido ou faltando corromperia o augment em silêncio.
        assert sorted(parse_flip_idx()) == list(range(NUM_KEYPOINTS))

    def test_centerline_keypoints_map_to_themselves(self) -> None:
        # Nariz, queixo e cauda estão no eixo: não trocam de lado.
        flip = parse_flip_idx()
        for kp in (KP.NOSE, KP.CHIN, KP.TAIL_BASE, KP.TAIL_TIP):
            assert flip[int(kp)] == int(kp)

    def test_declares_keypoint_shape(self) -> None:
        text = dataset_yaml(Path("/data/dogs"))
        assert f"kpt_shape: [{NUM_KEYPOINTS}, 3]" in text
