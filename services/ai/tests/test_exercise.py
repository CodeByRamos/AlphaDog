"""O contrato da máquina de estado do exercício.

Os testes centrais são os que impedem um SUCCESS indevido: é o único feedback
que autoriza o tutor a recompensar.
"""

from __future__ import annotations

from alphadog_ai.exercise import (
    EXERCISES,
    ExerciseId,
    ExerciseSession,
    Feedback,
    VOTE_WINDOW,
)
from alphadog_ai.posture import Posture, PostureReading


def reading(posture: Posture, confidence: float = 0.9) -> PostureReading:
    return PostureReading(posture, confidence, "teste")


def feed(
    session: ExerciseSession,
    posture: Posture,
    *,
    frames: int,
    start: float = 0.0,
    fps: float = 30.0,
):
    """Alimenta N frames e devolve o último evento."""
    event = None
    for i in range(frames):
        event = session.update(reading(posture), start + i / fps)
    return event


def feed_all(
    session: ExerciseSession,
    posture: Posture,
    *,
    frames: int,
    start: float = 0.0,
    fps: float = 30.0,
) -> list[Feedback]:
    """Alimenta N frames e devolve todos os feedbacks emitidos.

    Necessário para eventos de disparo único, como BROKE_EARLY: ele acontece no
    frame em que a votação vira e depois cede lugar a NOT_YET, então olhar só o
    último evento o perderia.
    """
    return [
        session.update(reading(posture), start + i / fps).feedback
        for i in range(frames)
    ]


def new_sit_session() -> ExerciseSession:
    return ExerciseSession(spec=EXERCISES[ExerciseId.SIT])


class TestSuccessRequiresHold:
    def test_single_sitting_frame_is_not_success(self) -> None:
        session = new_sit_session()
        event = session.update(reading(Posture.SITTING), 0.0)
        assert event.feedback is not Feedback.SUCCESS

    def test_sitting_briefly_is_not_success(self) -> None:
        # Sentou por 1s, mas o exercício pede 2s.
        session = new_sit_session()
        event = feed(session, Posture.SITTING, frames=30, fps=30.0)
        assert event.feedback is Feedback.HOLD
        assert event.remaining_seconds > 0

    def test_holding_long_enough_succeeds(self) -> None:
        session = new_sit_session()
        event = feed(session, Posture.SITTING, frames=70, fps=30.0)
        assert event.feedback is Feedback.SUCCESS

    def test_remaining_counts_down(self) -> None:
        """Alimenta o "espere mais dois segundos" — precisa ser verdade."""
        session = new_sit_session()
        first = feed(session, Posture.SITTING, frames=VOTE_WINDOW, fps=30.0)
        later = feed(
            session, Posture.SITTING, frames=20, start=1.0, fps=30.0
        )
        assert later.remaining_seconds < first.remaining_seconds


class TestNoiseTolerance:
    def test_single_bad_frame_does_not_break_hold(self) -> None:
        """Com 37,8% dos frames em casos difíceis, um frame ruim é rotina."""
        session = new_sit_session()
        feed(session, Posture.SITTING, frames=20, fps=30.0)

        # Um frame indeciso no meio.
        session.update(reading(Posture.UNKNOWN), 20 / 30)

        event = feed(session, Posture.SITTING, frames=50, start=21 / 30, fps=30.0)
        assert event.feedback is Feedback.SUCCESS

    def test_unclear_view_does_not_reset_progress(self) -> None:
        # Tutor passa na frente da câmera: o cão continua sentado.
        session = new_sit_session()
        feed(session, Posture.SITTING, frames=30, fps=30.0)
        event = feed(session, Posture.UNKNOWN, frames=VOTE_WINDOW, start=1.0, fps=30.0)
        assert event.feedback is Feedback.UNCLEAR_VIEW

        event = feed(session, Posture.SITTING, frames=40, start=1.5, fps=30.0)
        assert event.feedback is Feedback.SUCCESS


class TestRejectsFalsePositives:
    def test_standing_never_succeeds_a_sit(self) -> None:
        session = new_sit_session()
        event = feed(session, Posture.STANDING, frames=120, fps=30.0)
        assert event.feedback is Feedback.NOT_YET

    def test_unknown_never_succeeds(self) -> None:
        """Nunca recompensar por não saber."""
        session = new_sit_session()
        event = feed(session, Posture.UNKNOWN, frames=120, fps=30.0)
        assert event.feedback is not Feedback.SUCCESS

    def test_standing_up_early_breaks_the_hold(self) -> None:
        session = new_sit_session()
        feed(session, Posture.SITTING, frames=30, fps=30.0)

        # BROKE_EARLY dispara uma vez, quando a votação vira, e depois vira
        # NOT_YET — avisar "ele levantou" a cada frame seria ruído.
        events = feed_all(session, Posture.STANDING, frames=VOTE_WINDOW, start=1.0)
        assert Feedback.BROKE_EARLY in events
        assert events[-1] is Feedback.NOT_YET

        # E o relógio recomeça: não herda o tempo anterior.
        event = feed(session, Posture.SITTING, frames=30, start=1.5, fps=30.0)
        assert event.feedback is Feedback.HOLD

    def test_alternating_noise_never_succeeds(self) -> None:
        """Cão agitado alternando não pode virar sucesso por acidente."""
        session = new_sit_session()
        event = None
        for i in range(120):
            posture = Posture.SITTING if i % 2 == 0 else Posture.STANDING
            event = session.update(reading(posture), i / 30)
        assert event.feedback is not Feedback.SUCCESS


class TestStay:
    def test_stay_requires_much_longer_hold(self) -> None:
        session = ExerciseSession(spec=EXERCISES[ExerciseId.STAY])
        # 3s bastariam para "senta", mas "fica" pede 8s.
        event = feed(session, Posture.SITTING, frames=90, fps=30.0)
        assert event.feedback is Feedback.HOLD

        event = feed(session, Posture.SITTING, frames=180, start=3.0, fps=30.0)
        assert event.feedback is Feedback.SUCCESS
