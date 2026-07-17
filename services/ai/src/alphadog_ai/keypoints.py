"""Esquema de keypoints canino.

Layout do StanfordExtra: **24 keypoints**, verificado contra o
StanfordExtra_v12.json real (12.538 entradas, todas com 24). Escolhido em vez do
AP-10K porque tem 12k imagens só de cão e articulações caninas explícitas,
enquanto o AP-10K divide ~10k imagens entre 54 espécies com 17 pontos genéricos
de quadrúpede.

A ordem dos índices é a do dataset e NÃO deve ser reordenada: os pesos treinados
dependem dela.

Os 4 últimos (20-23) são extras do StanfordExtra sobre o esquema de 20 do
Animal Pose original. Ficam quase sempre ausentes nas anotações, mas precisam
existir no vetor para o índice bater.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum


class KP(IntEnum):
    """Índice de cada keypoint no vetor de saída do modelo."""

    # Pata esquerda dianteira: pata, joelho, cotovelo
    LEFT_FRONT_PAW = 0
    LEFT_FRONT_KNEE = 1
    LEFT_FRONT_ELBOW = 2
    # Pata esquerda traseira
    LEFT_BACK_PAW = 3
    LEFT_BACK_KNEE = 4
    LEFT_BACK_HOCK = 5
    # Pata direita dianteira
    RIGHT_FRONT_PAW = 6
    RIGHT_FRONT_KNEE = 7
    RIGHT_FRONT_ELBOW = 8
    # Pata direita traseira
    RIGHT_BACK_PAW = 9
    RIGHT_BACK_KNEE = 10
    RIGHT_BACK_HOCK = 11
    # Cauda
    TAIL_BASE = 12
    TAIL_TIP = 13
    # Cabeça
    LEFT_EAR_BASE = 14
    RIGHT_EAR_BASE = 15
    NOSE = 16
    CHIN = 17
    LEFT_EAR_TIP = 18
    RIGHT_EAR_TIP = 19
    # Extras do StanfordExtra
    LEFT_EYE = 20
    RIGHT_EYE = 21
    WITHERS = 22  # cernelha — topo dos ombros
    THROAT = 23


NUM_KEYPOINTS = len(KP)

FRONT_PAWS = (KP.LEFT_FRONT_PAW, KP.RIGHT_FRONT_PAW)
BACK_PAWS = (KP.LEFT_BACK_PAW, KP.RIGHT_BACK_PAW)
BACK_KNEES = (KP.LEFT_BACK_KNEE, KP.RIGHT_BACK_KNEE)

#: Proxy do quadril. O StanfordExtra não anota o quadril diretamente; o jarrete
#: (hock) é a articulação traseira mais alta que existe no esquema e sobe/desce
#: junto com o quadril quando o cão senta.
HIPS = (KP.LEFT_BACK_HOCK, KP.RIGHT_BACK_HOCK)

#: Proxy do ombro. A cernelha é o ponto único no topo dos ombros; o cotovelo
#: serve de reserva quando ela está ausente.
SHOULDERS = (KP.WITHERS, KP.LEFT_FRONT_ELBOW, KP.RIGHT_FRONT_ELBOW)


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
