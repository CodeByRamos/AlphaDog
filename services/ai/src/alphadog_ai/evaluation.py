"""Harness de avaliação do spike.

Codifica os critérios de aprovação decididos ANTES de existir modelo, para que
o resultado não seja negociado depois que os números aparecerem — que é como
projetos de ML se enganam.

O critério que manda é `false_success_rate`. Um "Excelente!" quando o cão não
sentou ensina o tutor a recompensar erro: o produto passa a piorar o treino em
vez de melhorar. Erra pouco e admita não saber; nunca acerte por sorte.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from enum import StrEnum

from .posture import Posture, PostureReading

# --- Critérios de aprovação ---------------------------------------------------

#: Acurácia mínima entre os frames em que o classificador se compromete.
MIN_ACCURACY = 0.90

#: Teto de falso positivo. Bloqueante: abaixo disto o produto não é lançável
#: nos exercícios com auto-oclusão (sentar, deitar, rolar).
MAX_FALSE_SUCCESS = 0.02

#: Teto de abstenção. O classificador pode dizer "não sei" — mas se disser
#: demais, o app fica mudo e o tutor abandona.
MAX_ABSTENTION = 0.35

#: FPS mínimo em Android intermediário. Abaixo disto o feedback atrasa e o cão
#: não associa a recompensa ao comportamento.
MIN_FPS = 15.0

#: Latência máxima câmera -> feedback. Acima disto a janela de associação do cão
#: já fechou.
MAX_LATENCY_MS = 300.0


@dataclass(frozen=True)
class Sample:
    """Um frame rotulado."""

    reading: PostureReading
    truth: Posture
    #: Opcional: marca frames de SRD para medir a queda em vira-lata, que é a
    #: pergunta mais importante do spike no mercado brasileiro.
    is_mixed_breed: bool = False


@dataclass(frozen=True)
class PostureMetrics:
    total: int
    committed: int
    correct: int
    false_success: int
    abstained: int
    confusion: dict[tuple[Posture, Posture], int]

    @property
    def accuracy(self) -> float:
        """Acurácia entre os frames em que houve compromisso.

        Abstenção não entra: dizer "não sei" não é erro, é a resposta certa sob
        oclusão. Ela é limitada em separado por `abstention_rate`.
        """
        return self.correct / self.committed if self.committed else 0.0

    @property
    def false_success_rate(self) -> float:
        """Fração de frames em que afirmamos uma postura que não era a verdade.

        Denominador é o total, não o comprometido: do ponto de vista do tutor,
        o que importa é quantas vezes o app mentiu ao longo da sessão.
        """
        return self.false_success / self.total if self.total else 0.0

    @property
    def abstention_rate(self) -> float:
        return self.abstained / self.total if self.total else 0.0

    def passes(self) -> bool:
        return (
            self.accuracy >= MIN_ACCURACY
            and self.false_success_rate <= MAX_FALSE_SUCCESS
            and self.abstention_rate <= MAX_ABSTENTION
        )


def evaluate_posture(samples: list[Sample]) -> PostureMetrics:
    """Mede o classificador contra frames rotulados."""
    confusion: Counter[tuple[Posture, Posture]] = Counter()
    correct = 0
    false_success = 0
    abstained = 0
    committed = 0

    for sample in samples:
        predicted = sample.reading.posture
        confusion[(sample.truth, predicted)] += 1

        if predicted is Posture.UNKNOWN:
            abstained += 1
            continue

        committed += 1
        if predicted is sample.truth:
            correct += 1
        else:
            # Comprometeu-se com a postura errada. É daqui que sai o
            # "Excelente!" indevido.
            false_success += 1

    return PostureMetrics(
        total=len(samples),
        committed=committed,
        correct=correct,
        false_success=false_success,
        abstained=abstained,
        confusion=dict(confusion),
    )


@dataclass(frozen=True)
class PerformanceMetrics:
    fps: float
    p50_latency_ms: float
    p95_latency_ms: float
    device: str

    def passes(self) -> bool:
        # p95, não média: o tutor sente o pior caso, não o típico.
        return self.fps >= MIN_FPS and self.p95_latency_ms <= MAX_LATENCY_MS


#: Queda máxima de acurácia em SRD, em pontos percentuais.
MAX_MIXED_BREED_GAP = 10.0


class Gate(StrEnum):
    """Dois níveis de aprovação, com exigências diferentes.

    A separação existe porque a build inicial treina com StanfordExtra, que é
    feito de 120 raças puras. Validar em SRD exige um dataset brasileiro que
    ainda não temos — decisão consciente de seguir sem ele por ora.

    O ponto do gate duplo é que o débito não some: BUILD passa sem dados de SRD,
    PRODUCTION não. Ninguém lança para o mercado brasileiro achando que estava
    aprovado.
    """

    #: Só critérios técnicos. Prova que o pipeline funciona.
    BUILD = "build"
    #: Inclui aptidão de mercado. Necessário para colocar na mão de tutor.
    PRODUCTION = "production"


@dataclass(frozen=True)
class SpikeReport:
    """Veredito do spike. Sem número medido, não passou."""

    overall: PostureMetrics
    purebred: PostureMetrics | None
    mixed_breed: PostureMetrics | None
    performance: PerformanceMetrics | None

    @property
    def mixed_breed_gap(self) -> float | None:
        """Quanto a acurácia cai em SRD, em pontos percentuais.

        Metade dos cães brasileiros é vira-lata e o StanfordExtra é feito de
        raças puras. Se a queda for grande, o modelo não serve ao mercado — por
        melhor que seja o número agregado.
        """
        if not self.purebred or not self.mixed_breed:
            return None
        return (self.purebred.accuracy - self.mixed_breed.accuracy) * 100

    def passes(self, gate: Gate = Gate.PRODUCTION) -> bool:
        """Avalia contra o gate pedido.

        O padrão é PRODUCTION de propósito: quem quiser o critério mais frouxo
        precisa pedir explicitamente, e fica registrado na chamada.
        """
        if not self.overall.passes():
            return False
        if self.performance is None or not self.performance.passes():
            return False

        if gate is Gate.BUILD:
            return True

        gap = self.mixed_breed_gap
        if gap is None or gap > MAX_MIXED_BREED_GAP:
            return False
        return True

    @property
    def blockers(self) -> list[str]:
        """O que impede PRODUCTION. Lista vazia significa pronto."""
        out: list[str] = []
        if self.overall.accuracy < MIN_ACCURACY:
            out.append(f"acurácia {self.overall.accuracy:.1%} < {MIN_ACCURACY:.0%}")
        if self.overall.false_success_rate > MAX_FALSE_SUCCESS:
            out.append(
                f"falso positivo {self.overall.false_success_rate:.2%} "
                f"> {MAX_FALSE_SUCCESS:.0%}"
            )
        if self.overall.abstention_rate > MAX_ABSTENTION:
            out.append(
                f"abstenção {self.overall.abstention_rate:.1%} > {MAX_ABSTENTION:.0%}"
            )
        if self.performance is None:
            out.append("sem medição de desempenho em device")
        elif not self.performance.passes():
            out.append(
                f"desempenho {self.performance.fps:.1f} FPS / "
                f"p95 {self.performance.p95_latency_ms:.0f}ms fora do alvo"
            )
        gap = self.mixed_breed_gap
        if gap is None:
            out.append("sem dados de SRD — não validado para o mercado brasileiro")
        elif gap > MAX_MIXED_BREED_GAP:
            out.append(f"queda em SRD {gap:.1f}pp > {MAX_MIXED_BREED_GAP:.0f}pp")
        return out

    def summary(self) -> str:
        lines = [
            f"acurácia          {self.overall.accuracy:.1%} (min {MIN_ACCURACY:.0%})",
            f"falso positivo    {self.overall.false_success_rate:.2%} "
            f"(max {MAX_FALSE_SUCCESS:.0%})",
            f"abstenção         {self.overall.abstention_rate:.1%} "
            f"(max {MAX_ABSTENTION:.0%})",
        ]
        gap = self.mixed_breed_gap
        lines.append(
            f"queda em SRD      {gap:.1f}pp (max {MAX_MIXED_BREED_GAP:.0f}pp)"
            if gap is not None
            else "queda em SRD      PENDENTE — sem dataset brasileiro"
        )
        if self.performance:
            lines.append(
                f"desempenho        {self.performance.fps:.1f} FPS, "
                f"p95 {self.performance.p95_latency_ms:.0f}ms "
                f"({self.performance.device})"
            )
        else:
            lines.append("desempenho        SEM DADOS")

        build_ok = self.passes(Gate.BUILD)
        prod_ok = self.passes(Gate.PRODUCTION)
        lines.append("")
        lines.append(f"BUILD       {'PASSOU' if build_ok else 'NÃO PASSOU'}")
        lines.append(f"PRODUÇÃO    {'PASSOU' if prod_ok else 'NÃO PASSOU'}")

        if not prod_ok:
            lines.append("\nPendências para produção:")
            lines.extend(f"  - {b}" for b in self.blockers)
        return "\n".join(lines)


def build_report(
    samples: list[Sample], performance: PerformanceMetrics | None = None
) -> SpikeReport:
    mixed = [s for s in samples if s.is_mixed_breed]
    pure = [s for s in samples if not s.is_mixed_breed]
    return SpikeReport(
        overall=evaluate_posture(samples),
        purebred=evaluate_posture(pure) if pure else None,
        mixed_breed=evaluate_posture(mixed) if mixed else None,
        performance=performance,
    )
