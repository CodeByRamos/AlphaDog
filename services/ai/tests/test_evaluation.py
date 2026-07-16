"""O contrato do harness de avaliação.

Este harness decide se o spike passou. Se ele for permissivo, aprova um modelo
que não deveria ir para a mão do tutor — então ele mesmo precisa de teste.
"""

from __future__ import annotations

import pytest

from alphadog_ai.evaluation import (
    Gate,
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
    def test_srd_pending_passes_build_but_not_production(self) -> None:
        """O caso da build atual: StanfordExtra é só raça pura.

        Decisão de negócio: seguir sem dados de SRD por ora. O gate BUILD
        aprova o pipeline, mas PRODUCTION continua bloqueado — o débito fica
        visível em vez de sumir.
        """
        samples = [sample(Posture.SITTING, Posture.SITTING)] * 100
        report = build_report(samples, good_performance())

        assert report.mixed_breed_gap is None
        assert report.passes(Gate.BUILD)
        assert not report.passes(Gate.PRODUCTION)
        assert any("SRD" in b for b in report.blockers)

    def test_production_is_the_default_gate(self) -> None:
        """Quem quiser o critério frouxo pede explicitamente."""
        samples = [sample(Posture.SITTING, Posture.SITTING)] * 100
        assert not build_report(samples, good_performance()).passes()

    def test_missing_performance_blocks_both_gates(self) -> None:
        # Sem medir em device, nem o pipeline está provado.
        samples = [sample(Posture.SITTING, Posture.SITTING, mixed=True)] * 50 + [
            sample(Posture.SITTING, Posture.SITTING)
        ] * 50
        report = build_report(samples, performance=None)
        assert not report.passes(Gate.BUILD)
        assert not report.passes(Gate.PRODUCTION)

    def test_lying_model_fails_both_gates(self) -> None:
        """Falso positivo é técnico, não de mercado: reprova até no BUILD."""
        samples = [sample(Posture.SITTING, Posture.SITTING)] * 90 + [
            sample(Posture.STANDING, Posture.SITTING)
        ] * 10
        report = build_report(samples, good_performance())
        assert not report.passes(Gate.BUILD)
        assert not report.passes(Gate.PRODUCTION)

    def test_unbalanced_data_hides_srd_failure_in_the_aggregate(self) -> None:
        """O risco real, e a razão de medir SRD em separado.

        Dataset com poucos SRD: 900 raça pura, 100 vira-lata. O agregado fica
        excelente (98,8% de acerto, 1,2% de falso positivo) e passaria em
        qualquer slide — enquanto o modelo erra 12% dos vira-latas, que são
        metade do mercado brasileiro.

        Só a métrica segmentada enxerga isso.
        """
        pure = [sample(Posture.SITTING, Posture.SITTING)] * 900
        mixed = [sample(Posture.SITTING, Posture.SITTING, mixed=True)] * 88 + [
            sample(Posture.STANDING, Posture.SITTING, mixed=True)
        ] * 12

        report = build_report(pure + mixed, good_performance())

        # O agregado engana: passa em tudo que é técnico.
        assert report.overall.accuracy == pytest.approx(0.988)
        assert report.overall.false_success_rate == pytest.approx(0.012)
        assert report.overall.passes()
        assert report.passes(Gate.BUILD)

        # A segmentação revela: 12pp de queda em SRD.
        assert report.mixed_breed_gap == pytest.approx(12.0)
        assert not report.passes(Gate.PRODUCTION)

    def test_slow_device_fails(self) -> None:
        samples = [sample(Posture.SITTING, Posture.SITTING, mixed=True)] * 50 + [
            sample(Posture.SITTING, Posture.SITTING)
        ] * 50
        slow = PerformanceMetrics(
            fps=8.0, p50_latency_ms=300.0, p95_latency_ms=600.0, device="Moto E"
        )
        assert not build_report(samples, slow).passes(Gate.BUILD)

    def test_full_pass_has_no_blockers(self) -> None:
        samples = [sample(Posture.SITTING, Posture.SITTING, mixed=True)] * 50 + [
            sample(Posture.SITTING, Posture.SITTING)
        ] * 50
        report = build_report(samples, good_performance())
        assert report.passes(Gate.PRODUCTION)
        assert report.blockers == []
