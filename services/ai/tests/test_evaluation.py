"""O contrato do harness de avaliação.

Este harness decide se o spike passou. Se ele for permissivo, aprova um modelo
que não deveria ir para a mão do tutor — então ele mesmo precisa de teste.
"""

from __future__ import annotations

import pytest

from alphadog_ai.evaluation import (
    PerformanceMetrics,
    Sample,
    build_report,
    evaluate_posture,
)
from alphadog_ai.posture import Posture, PostureReading


def sample(truth: Posture, predicted: Posture, *, mixed: bool = False) -> Sample:
    return Sample(
        reading=PostureReading(predicted, 0.9, "teste"),
        truth=truth,
        is_mixed_breed=mixed,
    )


def good_performance() -> PerformanceMetrics:
    return PerformanceMetrics(
        fps=24.0, p50_latency_ms=90.0, p95_latency_ms=180.0, device="Moto G"
    )


class TestAccuracy:
    def test_all_correct(self) -> None:
        metrics = evaluate_posture([sample(Posture.SITTING, Posture.SITTING)] * 10)
        assert metrics.accuracy == 1.0
        assert metrics.false_success_rate == 0.0

    def test_abstention_is_not_counted_as_error(self) -> None:
        # Dizer "não sei" sob oclusão é a resposta certa, não um erro.
        samples = [sample(Posture.SITTING, Posture.SITTING)] * 8 + [
            sample(Posture.SITTING, Posture.UNKNOWN)
        ] * 2
        metrics = evaluate_posture(samples)
        assert metrics.accuracy == 1.0
        assert metrics.abstention_rate == 0.2

    def test_wrong_commitment_is_false_success(self) -> None:
        samples = [sample(Posture.STANDING, Posture.SITTING)] * 5
        metrics = evaluate_posture(samples)
        assert metrics.false_success_rate == 1.0
        assert metrics.accuracy == 0.0


class TestGate:
    def test_high_accuracy_but_lying_too_often_fails(self) -> None:
        """O caso perigoso: 95% de acerto e ainda assim reprovado.

        Um modelo pode acertar quase sempre e mentir 5% das vezes. Para um
        produto que autoriza recompensa, 5% de mentira é inaceitável mesmo com
        95% de acerto — daí o falso positivo ser critério separado.
        """
        samples = [sample(Posture.SITTING, Posture.SITTING)] * 95 + [
            sample(Posture.STANDING, Posture.SITTING)
        ] * 5
        metrics = evaluate_posture(samples)
        assert metrics.accuracy == 0.95
        assert metrics.false_success_rate == 0.05
        assert not metrics.passes()

    def test_abstaining_too_much_fails(self) -> None:
        # Perfeito quando fala, mas mudo na maior parte do tempo: app inútil.
        samples = [sample(Posture.SITTING, Posture.SITTING)] * 50 + [
            sample(Posture.SITTING, Posture.UNKNOWN)
        ] * 50
        metrics = evaluate_posture(samples)
        assert metrics.accuracy == 1.0
        assert not metrics.passes()

    def test_clean_run_passes(self) -> None:
        samples = [sample(Posture.SITTING, Posture.SITTING)] * 92 + [
            sample(Posture.SITTING, Posture.UNKNOWN)
        ] * 8
        assert evaluate_posture(samples).passes()


class TestSpikeReport:
    def test_missing_srd_data_blocks_approval(self) -> None:
        """Sem dados de SRD o spike está incompleto — não pode aprovar.

        Metade dos cães brasileiros é vira-lata. Aprovar sem medir isso seria
        aprovar para um mercado que não é o nosso.
        """
        samples = [sample(Posture.SITTING, Posture.SITTING)] * 100
        report = build_report(samples, good_performance())
        assert report.mixed_breed_gap is None
        assert not report.passes()
        assert "SEM DADOS" in report.summary()

    def test_missing_performance_data_blocks_approval(self) -> None:
        samples = [sample(Posture.SITTING, Posture.SITTING, mixed=True)] * 50 + [
            sample(Posture.SITTING, Posture.SITTING)
        ] * 50
        assert not build_report(samples, performance=None).passes()

    def test_large_srd_gap_fails(self) -> None:
        pure = [sample(Posture.SITTING, Posture.SITTING)] * 100
        # SRD com 70% de acerto contra 100% em raça pura: 30pp de queda.
        mixed = [sample(Posture.SITTING, Posture.SITTING, mixed=True)] * 70 + [
            sample(Posture.STANDING, Posture.SITTING, mixed=True)
        ] * 30
        report = build_report(pure + mixed, good_performance())
        assert report.mixed_breed_gap == pytest.approx(30.0)
        assert not report.passes()

    def test_slow_device_fails(self) -> None:
        samples = [sample(Posture.SITTING, Posture.SITTING, mixed=True)] * 50 + [
            sample(Posture.SITTING, Posture.SITTING)
        ] * 50
        slow = PerformanceMetrics(
            fps=8.0, p50_latency_ms=300.0, p95_latency_ms=600.0, device="Moto E"
        )
        assert not build_report(samples, slow).passes()

    def test_full_pass(self) -> None:
        samples = [sample(Posture.SITTING, Posture.SITTING, mixed=True)] * 50 + [
            sample(Posture.SITTING, Posture.SITTING)
        ] * 50
        report = build_report(samples, good_performance())
        assert report.passes()
        assert "PASSOU" in report.summary()
