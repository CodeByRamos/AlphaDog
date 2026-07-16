"""Máquina de estado do exercício: de frames soltos a feedback.

Um frame não é um exercício. "Senta" não é "houve um frame sentado" — é "o cão
sentou e permaneceu". Esta camada existe porque:

1. Detecção pisca. Um frame ruim no meio de vinte bons não é uma falha.
2. Os exercícios têm duração ("Fica" é quase só isso).
3. O feedback precisa de histerese — anunciar sucesso e voltar atrás no frame
   seguinte destrói a confiança do tutor no app.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from enum import StrEnum

from .posture import Posture, PostureReading


class ExerciseId(StrEnum):
    SIT = "sit"
    DOWN = "down"
    STAY = "stay"


class Feedback(StrEnum):
    """O que o app diz ao tutor. Mapeado para copy em pt-BR na camada de UI."""

    #: Ainda não vimos o cão.
    WAITING_FOR_DOG = "waiting_for_dog"
    #: Cão visível, postura ainda não é a alvo.
    NOT_YET = "not_yet"
    #: Postura alvo atingida, mas ainda sem tempo suficiente.
    HOLD = "hold"
    #: Sucesso confirmado. É o único que autoriza recompensa.
    SUCCESS = "success"
    #: Cão saiu da postura antes do tempo.
    BROKE_EARLY = "broke_early"
    #: Não conseguimos julgar (oclusão, cão fora de quadro, sinais em conflito).
    UNCLEAR_VIEW = "unclear_view"


@dataclass(frozen=True)
class ExerciseSpec:
    id: ExerciseId
    target: Posture
    #: Quanto tempo a postura precisa ser mantida para contar.
    hold_seconds: float


EXERCISES: dict[ExerciseId, ExerciseSpec] = {
    ExerciseId.SIT: ExerciseSpec(ExerciseId.SIT, Posture.SITTING, hold_seconds=2.0),
    ExerciseId.DOWN: ExerciseSpec(ExerciseId.DOWN, Posture.LYING, hold_seconds=2.0),
    ExerciseId.STAY: ExerciseSpec(ExerciseId.STAY, Posture.SITTING, hold_seconds=8.0),
}


@dataclass(frozen=True)
class FeedbackEvent:
    feedback: Feedback
    #: Segundos restantes de permanência. Alimenta "espere mais dois segundos".
    remaining_seconds: float = 0.0
    reason: str = ""


#: Tamanho da janela de votação. Ímpar para não haver empate.
VOTE_WINDOW = 5

#: Quantos votos a postura alvo precisa dentro da janela.
#:
#: 3 de 5 é deliberadamente exigente: com 37,8% dos frames em "casos difíceis"
#: segundo a literatura, aceitar maioria simples de uma janela menor deixaria o
#: ruído virar sucesso.
VOTE_THRESHOLD = 3


@dataclass
class ExerciseSession:
    """Acompanha uma tentativa de exercício.

    Stateful de propósito: é a única parte do pipeline que não é pura, porque
    permanência é, por definição, memória.
    """

    spec: ExerciseSpec
    _votes: deque[Posture] = field(default_factory=lambda: deque(maxlen=VOTE_WINDOW))
    _holding_since: float | None = None
    _succeeded: bool = False

    def _voted_posture(self) -> Posture:
        """Postura vencedora da janela, ou UNKNOWN se ninguém tem votos."""
        if not self._votes:
            return Posture.UNKNOWN

        target_votes = sum(1 for p in self._votes if p is self.spec.target)
        if target_votes >= VOTE_THRESHOLD:
            return self.spec.target

        # Só declara outra postura com a mesma exigência — senão um par de
        # frames ruins derrubaria uma permanência boa.
        for candidate in (Posture.STANDING, Posture.SITTING, Posture.LYING):
            if candidate is self.spec.target:
                continue
            if sum(1 for p in self._votes if p is candidate) >= VOTE_THRESHOLD:
                return candidate

        return Posture.UNKNOWN

    def update(self, reading: PostureReading, timestamp: float) -> FeedbackEvent:
        """Consome um frame e devolve o que dizer ao tutor.

        `timestamp` vem em segundos, do relógio de captura — não do relógio de
        parede. Frames podem chegar irregulares e é o tempo do vídeo que conta.
        """
        if self._succeeded:
            return FeedbackEvent(Feedback.SUCCESS, reason="já concluído")

        self._votes.append(reading.posture)
        voted = self._voted_posture()

        # Janela ainda enchendo: não julgamos.
        if len(self._votes) < VOTE_WINDOW:
            return FeedbackEvent(Feedback.WAITING_FOR_DOG, reason="aguardando frames")

        if voted is Posture.UNKNOWN:
            # Perder a visão não zera a permanência: o cão provavelmente
            # continua parado, e reiniciar puniria o tutor por um frame ruim.
            return FeedbackEvent(Feedback.UNCLEAR_VIEW, reason=reading.reason)

        if voted is not self.spec.target:
            if self._holding_since is not None:
                self._holding_since = None
                return FeedbackEvent(
                    Feedback.BROKE_EARLY, reason=f"saiu para {voted}"
                )
            return FeedbackEvent(Feedback.NOT_YET, reason=f"está {voted}")

        # Está na postura alvo.
        if self._holding_since is None:
            self._holding_since = timestamp

        elapsed = timestamp - self._holding_since
        remaining = self.spec.hold_seconds - elapsed

        if remaining <= 0:
            self._succeeded = True
            return FeedbackEvent(Feedback.SUCCESS, reason=f"manteve {elapsed:.1f}s")

        return FeedbackEvent(Feedback.HOLD, remaining_seconds=remaining)

    def reset(self) -> None:
        self._votes.clear()
        self._holding_since = None
        self._succeeded = False
