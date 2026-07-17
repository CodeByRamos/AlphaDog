"""Classificação de postura a partir de uma única detecção.

Estratégia deliberada: NÃO depender só de keypoints.

A literatura é clara sobre o problema central deste produto — "existing methods
focus on dogs in standing poses because when they sit or lie down, their legs
are self occluded and their bodies deform". Os exercícios do MVP (sentar,
deitar, rolar) são justamente os piores casos.

Então usamos dois sinais independentes e exigimos que concordem:

1. Razão de aspecto da caixa — robusto, sobrevive à oclusão total das patas.
2. Geometria dos keypoints — preciso quando visível, inútil quando ocluído.

Quando discordam, o resultado é UNKNOWN. Recusar responder é a decisão certa:
um "Excelente!" errado ensina o tutor a recompensar o comportamento errado, e
isso piora o treino do cão em vez de melhorar.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass
from enum import StrEnum

from .keypoints import (
    BACK_KNEES,
    BACK_PAWS,
    FRONT_PAWS,
    HIPS,
    KP,
    MIN_BOX_CONFIDENCE,
    SHOULDERS,
    Detection,
)


class Posture(StrEnum):
    STANDING = "standing"
    SITTING = "sitting"
    LYING = "lying"
    #: Sinais em conflito, cão ausente ou oclusão pesada. Nunca vira feedback
    #: positivo.
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class PostureReading:
    posture: Posture
    #: 0..1. Combina confiança da detecção com o acordo entre os sinais.
    confidence: float
    #: Por que o classificador decidiu isso. Aparece no relatório do spike e no
    #: modo debug — sem isto, calibrar limiares vira adivinhação.
    reason: str


# --- Limiares -----------------------------------------------------------------
#
# Valores iniciais, a calibrar com dados reais no spike. Estão aqui como
# constantes nomeadas, e não espalhados no código, porque são o que muda quando
# as métricas de falso positivo saírem.
#
# AVISO já observado no rotulador: a caixa do StanfordExtra é justa ao corpo, e
# um cão em pé DE PERFIL COM A CABEÇA ERGUIDA dá razão ~0.97 — que estes
# limiares leriam como sentado. É por isso que `classify_posture` exige acordo
# com a geometria e devolve UNKNOWN no conflito: a caixa sozinha erraria aqui.
# A calibração real destes números depende do conjunto rotulado.

#: Acima disto a caixa é claramente mais larga que alta: cão de perfil, em pé.
STANDING_ASPECT_MIN = 1.15

#: Abaixo disto a caixa é mais alta que larga: tronco vertical, típico de
#: sentado.
SITTING_ASPECT_MAX = 0.95

#: Deitado é ainda mais largo e baixo que em pé.
LYING_ASPECT_MIN = 1.7

#: Fração da altura da caixa. Sentado tem o quadril próximo ao chão e os ombros
#: bem acima; em pé, ombro e quadril ficam a alturas parecidas.
SIT_SHOULDER_HIP_DROP = 0.18


def _mean_y(detection: Detection, group: tuple[KP, ...]) -> float | None:
    """Altura média dos pontos visíveis do grupo.

    Os grupos SHOULDERS e HIPS são proxies com reserva (o StanfordExtra não
    anota quadril nem ombro diretamente), então qualquer ponto visível do grupo
    serve. Devolve None quando nenhum está visível — e aí o classificador
    responde UNKNOWN em vez de inventar.
    """
    ys = [detection.get(kp).y for kp in group if detection.get(kp).visible]
    return statistics.fmean(ys) if ys else None


def _posture_from_aspect(ratio: float) -> tuple[Posture, str]:
    """Sinal 1: forma da caixa. Sobrevive quando os keypoints somem."""
    if ratio >= LYING_ASPECT_MIN:
        return Posture.LYING, f"caixa muito larga (r={ratio:.2f})"
    if ratio >= STANDING_ASPECT_MIN:
        return Posture.STANDING, f"caixa larga (r={ratio:.2f})"
    if ratio <= SITTING_ASPECT_MAX:
        return Posture.SITTING, f"caixa vertical (r={ratio:.2f})"
    return Posture.UNKNOWN, f"caixa ambígua (r={ratio:.2f})"


def _posture_from_geometry(detection: Detection) -> tuple[Posture, str]:
    """Sinal 2: onde estão ombros, quadris e patas.

    Devolve UNKNOWN sempre que faltar ponto visível suficiente, em vez de
    inventar a partir do que sobrou.
    """
    box = detection.box
    if box.height <= 0:
        return Posture.UNKNOWN, "caixa sem altura"

    shoulder_y = _mean_y(detection, SHOULDERS)
    hip_y = _mean_y(detection, HIPS)

    if shoulder_y is None or hip_y is None:
        return Posture.UNKNOWN, "ombro ou quadril ocluído"

    # Eixo Y cresce para baixo: quadril mais baixo que ombro => drop positivo.
    drop = (hip_y - shoulder_y) / box.height

    front_visible = detection.visible_count(FRONT_PAWS)
    back_visible = detection.visible_count(BACK_PAWS)
    knees_visible = detection.visible_count(BACK_KNEES)

    if drop >= SIT_SHOULDER_HIP_DROP:
        # Assinatura do sentado: quadril no chão, tronco erguido. As patas
        # traseiras somem — é isso que confirma, não que atrapalha.
        if back_visible < front_visible or knees_visible == 0:
            return Posture.SITTING, f"quadril baixo (drop={drop:.2f}), traseiras ocluídas"
        return Posture.SITTING, f"quadril baixo (drop={drop:.2f})"

    if abs(drop) < SIT_SHOULDER_HIP_DROP and front_visible + back_visible >= 3:
        return Posture.STANDING, f"tronco nivelado (drop={drop:.2f}), patas visíveis"

    if drop <= -SIT_SHOULDER_HIP_DROP:
        return Posture.LYING, f"tronco baixo (drop={drop:.2f})"

    return Posture.UNKNOWN, f"geometria inconclusiva (drop={drop:.2f})"


def classify_posture(detection: Detection | None) -> PostureReading:
    """Classifica um frame exigindo acordo entre os dois sinais."""
    if detection is None:
        return PostureReading(Posture.UNKNOWN, 0.0, "nenhum cão detectado")

    if detection.box.confidence < MIN_BOX_CONFIDENCE:
        return PostureReading(
            Posture.UNKNOWN,
            detection.box.confidence,
            f"detecção fraca ({detection.box.confidence:.2f})",
        )

    by_aspect, aspect_reason = _posture_from_aspect(detection.box.aspect_ratio)
    by_geometry, geometry_reason = _posture_from_geometry(detection)

    # Os dois concordam: caso confiável.
    if by_aspect == by_geometry and by_aspect is not Posture.UNKNOWN:
        return PostureReading(
            by_aspect,
            detection.box.confidence,
            f"acordo: {aspect_reason} + {geometry_reason}",
        )

    # Keypoints ocluídos, mas a caixa é clara. Aceitamos com confiança reduzida:
    # é o caso comum de sentar/deitar, e recusar todos eles inviabilizaria o
    # produto.
    if by_geometry is Posture.UNKNOWN and by_aspect is not Posture.UNKNOWN:
        return PostureReading(
            by_aspect,
            detection.box.confidence * 0.7,
            f"só caixa: {aspect_reason} ({geometry_reason})",
        )

    # Caixa ambígua, geometria clara: ângulo de câmera atípico.
    if by_aspect is Posture.UNKNOWN and by_geometry is not Posture.UNKNOWN:
        return PostureReading(
            by_geometry,
            detection.box.confidence * 0.7,
            f"só geometria: {geometry_reason} ({aspect_reason})",
        )

    # Conflito aberto. Não adivinhamos.
    return PostureReading(
        Posture.UNKNOWN,
        0.0,
        f"conflito: caixa diz {by_aspect}, geometria diz {by_geometry}",
    )
