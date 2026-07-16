"""Esquema de keypoints canino.

Segue o layout do StanfordExtra (20 pontos), escolhido em vez do AP-10K porque
tem 12.000 imagens só de cão e articulações caninas explícitas, enquanto o
AP-10K divide ~10k imagens entre 54 espécies e usa 17 pontos genéricos de
quadrúpede.

A ordem dos índices é a do dataset e NÃO deve ser reordenada: os pesos treinados
dependem dela.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum


class KP(IntEnum):
    """Índice de cada keypoint no vetor de saída do modelo."""

    LEFT_FRONT_PAW = 0
    LEFT_FRONT_KNEE = 1
    LEFT_FRONT_HIP = 2
    LEFT_BACK_PAW = 3
    LEFT_BACK_KNEE = 4
    LEFT_BACK_HIP = 5
    RIGHT_FRONT_PAW = 6
    RIGHT_FRONT_KNEE = 7
    RIGHT_FRONT_HIP = 8
    RIGHT_BACK_PAW = 9
    RIGHT_BACK_KNEE = 10
    RIGHT_BACK_HIP = 11
    TAIL_BASE = 12
    TAIL_TIP = 13
    LEFT_EAR_BASE = 14
    RIGHT_EAR_BASE = 15
    NOSE = 16
    CHIN = 17
    LEFT_EAR_TIP = 18
    RIGHT_EAR_TIP = 19


NUM_KEYPOINTS = len(KP)

FRONT_PAWS = (KP.LEFT_FRONT_PAW, KP.RIGHT_FRONT_PAW)
BACK_PAWS = (KP.LEFT_BACK_PAW, KP.RIGHT_BACK_PAW)
BACK_KNEES = (KP.LEFT_BACK_KNEE, KP.RIGHT_BACK_KNEE)
HIPS = (KP.LEFT_BACK_HIP, KP.RIGHT_BACK_HIP)
SHOULDERS = (KP.LEFT_FRONT_HIP, KP.RIGHT_FRONT_HIP)


@dataclass(frozen=True)
class Keypoint:
    """Um ponto detectado.

    `confidence` importa tanto quanto a coordenada: quando o cão senta, as patas
    traseiras ficam auto-ocluídas e o modelo ainda emite uma posição — só que
    com confiança baixa. Tratar ponto de baixa confiança como verdade é a
    origem mais provável de um falso "Excelente".
    """

    x: float
    y: float
    confidence: float

    @property
    def visible(self) -> bool:
        return self.confidence >= MIN_KEYPOINT_CONFIDENCE


@dataclass(frozen=True)
class BoundingBox:
    """Caixa do cão, em pixels da imagem. Origem no canto superior esquerdo."""

    x: float
    y: float
    width: float
    height: float
    confidence: float

    @property
    def aspect_ratio(self) -> float:
        """Largura / altura.

        É o sinal mais robusto que temos: sobrevive à oclusão total das patas,
        que é exatamente o caso em que os keypoints falham. Cão em pé é largo
        (> 1), sentado é mais alto que largo.
        """
        if self.height <= 0:
            return 0.0
        return self.width / self.height


@dataclass(frozen=True)
class Detection:
    """Saída do modelo para um frame."""

    box: BoundingBox
    keypoints: tuple[Keypoint, ...]

    def __post_init__(self) -> None:
        if len(self.keypoints) != NUM_KEYPOINTS:
            raise ValueError(
                f"Esperados {NUM_KEYPOINTS} keypoints, recebidos {len(self.keypoints)}"
            )

    def get(self, kp: KP) -> Keypoint:
        return self.keypoints[int(kp)]

    def visible_count(self, group: tuple[KP, ...]) -> int:
        return sum(1 for kp in group if self.get(kp).visible)


# Limiar de confiança para considerar um keypoint utilizável.
#
# Calibrado no spike contra o critério de falso positivo (<= 2%): subir este
# valor descarta mais pontos e leva o classificador ao fallback de caixa; baixar
# aceita pontos alucinados sob oclusão. Na dúvida, prefira o valor mais alto —
# recusar responder é melhor que responder errado.
MIN_KEYPOINT_CONFIDENCE = 0.5

# Confiança mínima da detecção para o frame ser avaliado.
MIN_BOX_CONFIDENCE = 0.6
