"""O contrato do classificador de postura.

O teste que mais importa aqui não é "acerta sentado" — é "não afirma sentado
quando não sabe". Falso positivo vira um "Excelente!" que ensina o tutor a
recompensar o comportamento errado.
"""

from __future__ import annotations

from alphadog_ai.keypoints import BoundingBox
from alphadog_ai.posture import Posture, classify_posture
from factories import (
    conflicting_dog,
    heavily_occluded_dog,
    lying_dog,
    make_detection,
    sitting_dog,
    standing_dog,
)


class TestHappyPath:
    def test_standing(self) -> None:
        reading = classify_posture(standing_dog())
        assert reading.posture is Posture.STANDING
        assert reading.confidence > 0.8

    def test_sitting_with_occluded_back_legs(self) -> None:
        # O caso central do produto: sentar sempre oclui as traseiras.
        reading = classify_posture(sitting_dog())
        assert reading.posture is Posture.SITTING
        assert reading.confidence > 0.8

    def test_lying(self) -> None:
        assert classify_posture(lying_dog()).posture is Posture.LYING


class TestRefusesToGuess:
    """Onde o produto se protege. Cada teste aqui é um falso positivo evitado."""

    def test_no_detection(self) -> None:
        reading = classify_posture(None)
        assert reading.posture is Posture.UNKNOWN
        assert reading.confidence == 0.0

    def test_weak_detection_is_rejected(self) -> None:
        detection = make_detection(
            box=BoundingBox(x=0, y=0, width=110, height=160, confidence=0.3)
        )
        assert classify_posture(detection).posture is Posture.UNKNOWN

    def test_conflicting_signals_yield_unknown(self) -> None:
        reading = classify_posture(conflicting_dog())
        assert reading.posture is Posture.UNKNOWN
        assert "conflito" in reading.reason

    def test_ambiguous_aspect_without_geometry_is_unknown(self) -> None:
        # Caixa quase quadrada e nenhum ponto útil: nada a dizer.
        detection = make_detection(
            box=BoundingBox(x=0, y=0, width=105, height=100, confidence=0.9)
        )
        assert classify_posture(detection).posture is Posture.UNKNOWN


class TestDegradesGracefully:
    def test_occluded_keypoints_falls_back_to_box(self) -> None:
        """Cão atrás do sofá ainda precisa ser classificado — com menos certeza."""
        reading = classify_posture(heavily_occluded_dog())
        assert reading.posture is Posture.SITTING
        # Confiança reduzida: sabemos menos do que quando os sinais concordam.
        assert reading.confidence < classify_posture(sitting_dog()).confidence
        assert "só caixa" in reading.reason

    def test_reason_is_always_populated(self) -> None:
        for detection in (standing_dog(), sitting_dog(), conflicting_dog(), None):
            assert classify_posture(detection).reason
