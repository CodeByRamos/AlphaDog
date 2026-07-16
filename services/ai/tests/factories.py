"""Detecções sintéticas para teste.

Permitem exercitar o classificador sem GPU, sem dataset e sem celular —
inclusive os casos que são difíceis de filmar sob demanda, como oclusão total
das patas traseiras.
"""

from __future__ import annotations

from alphadog_ai.keypoints import KP, BoundingBox, Detection, Keypoint, NUM_KEYPOINTS

OCCLUDED = Keypoint(0.0, 0.0, 0.1)


def make_detection(
    *,
    box: BoundingBox,
    points: dict[KP, tuple[float, float]] | None = None,
    occluded: tuple[KP, ...] = (),
    confidence: float = 0.9,
) -> Detection:
    """Monta uma detecção. Qualquer ponto não informado nasce ocluído."""
    kps: list[Keypoint] = [OCCLUDED] * NUM_KEYPOINTS
    for kp, (x, y) in (points or {}).items():
        kps[int(kp)] = Keypoint(x, y, confidence)
    for kp in occluded:
        kps[int(kp)] = OCCLUDED
    return Detection(box=box, keypoints=tuple(kps))


def standing_dog() -> Detection:
    """Cão de perfil, em pé: caixa larga, ombro e quadril nivelados."""
    box = BoundingBox(x=0, y=0, width=200, height=140, confidence=0.95)
    return make_detection(
        box=box,
        points={
            KP.LEFT_FRONT_HIP: (60, 50),
            KP.RIGHT_FRONT_HIP: (62, 50),
            KP.LEFT_BACK_HIP: (150, 52),
            KP.RIGHT_BACK_HIP: (152, 52),
            KP.LEFT_FRONT_PAW: (58, 132),
            KP.RIGHT_FRONT_PAW: (66, 133),
            KP.LEFT_BACK_PAW: (150, 132),
            KP.RIGHT_BACK_PAW: (158, 133),
            KP.LEFT_BACK_KNEE: (150, 95),
            KP.RIGHT_BACK_KNEE: (156, 95),
            KP.NOSE: (18, 60),
        },
    )


def sitting_dog() -> Detection:
    """Cão sentado: caixa vertical, quadril no chão, traseiras auto-ocluídas.

    É o caso central do produto e o que a literatura aponta como o mais difícil.
    """
    box = BoundingBox(x=0, y=0, width=110, height=160, confidence=0.93)
    return make_detection(
        box=box,
        points={
            KP.LEFT_FRONT_HIP: (55, 60),
            KP.RIGHT_FRONT_HIP: (58, 60),
            KP.LEFT_BACK_HIP: (78, 120),
            KP.RIGHT_BACK_HIP: (80, 121),
            KP.LEFT_FRONT_PAW: (54, 152),
            KP.RIGHT_FRONT_PAW: (62, 153),
            KP.NOSE: (40, 28),
        },
        # Patas e joelhos traseiros somem sob o corpo — a assinatura do sentado.
        occluded=(
            KP.LEFT_BACK_PAW,
            KP.RIGHT_BACK_PAW,
            KP.LEFT_BACK_KNEE,
            KP.RIGHT_BACK_KNEE,
        ),
    )


def lying_dog() -> Detection:
    """Cão deitado: caixa muito larga e baixa, tronco no chão."""
    box = BoundingBox(x=0, y=0, width=240, height=80, confidence=0.9)
    return make_detection(
        box=box,
        points={
            KP.LEFT_FRONT_HIP: (90, 40),
            KP.RIGHT_FRONT_HIP: (92, 40),
            KP.LEFT_BACK_HIP: (170, 22),
            KP.RIGHT_BACK_HIP: (172, 22),
            KP.LEFT_FRONT_PAW: (60, 70),
            KP.RIGHT_FRONT_PAW: (68, 71),
            KP.NOSE: (20, 50),
        },
        occluded=(KP.LEFT_BACK_PAW, KP.RIGHT_BACK_PAW),
    )


def heavily_occluded_dog() -> Detection:
    """Cão atrás de um móvel: caixa confiável, keypoints inúteis.

    O classificador deve responder pela caixa, com confiança reduzida — não
    recusar (senão o produto não funciona em sala de estar), nem fingir certeza.
    """
    box = BoundingBox(x=0, y=0, width=110, height=160, confidence=0.85)
    return make_detection(box=box, points={KP.NOSE: (40, 30)})


def conflicting_dog() -> Detection:
    """Caixa diz em pé, geometria diz sentado.

    Acontece com cão de frente para a câmera. O classificador deve devolver
    UNKNOWN em vez de escolher um lado.
    """
    box = BoundingBox(x=0, y=0, width=200, height=140, confidence=0.9)
    return make_detection(
        box=box,
        points={
            KP.LEFT_FRONT_HIP: (60, 30),
            KP.RIGHT_FRONT_HIP: (62, 30),
            KP.LEFT_BACK_HIP: (150, 110),
            KP.RIGHT_BACK_HIP: (152, 110),
            KP.LEFT_FRONT_PAW: (58, 132),
            KP.RIGHT_FRONT_PAW: (66, 133),
        },
        occluded=(KP.LEFT_BACK_PAW, KP.RIGHT_BACK_PAW),
    )
