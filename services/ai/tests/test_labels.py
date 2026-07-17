"""Contrato do conjunto de rótulos.

O gate julga o modelo contra estes dados. Se o conjunto estiver torto, o
veredito é ficção.
"""

from __future__ import annotations

from pathlib import Path

from alphadog_ai.labels import (
    MIN_PER_CLASS,
    PostureLabel,
    breed_from_path,
    is_ready_for_gate,
    label_summary,
    load_labels,
    save_labels,
)
from alphadog_ai.posture import Posture


def label(kind: str, n: int) -> list[PostureLabel]:
    return [
        PostureLabel(img_path=f"n1-Breed/{kind}_{i}.jpg", label=kind, breed="Breed")
        for i in range(n)
    ]


class TestBreedFromPath:
    def test_extrai_a_raça(self) -> None:
        assert breed_from_path("n02085620-Chihuahua/img_1.jpg") == "Chihuahua"

    def test_nome_composto(self) -> None:
        assert breed_from_path("n02095314-wire-haired_fox_terrier/x.jpg") == (
            "wire-haired_fox_terrier"
        )

    def test_pasta_sem_hifen(self) -> None:
        assert breed_from_path("SRD/foto.jpg") == "SRD"


class TestReadyForGate:
    def test_vazio_não_está_pronto(self) -> None:
        ready, msg = is_ready_for_gate([])
        assert not ready
        assert "sitting" in msg

    def test_uma_classe_faltando_bloqueia(self) -> None:
        # Sem "deitado" o gate não mede o exercício de deitar.
        labels = label("sitting", MIN_PER_CLASS) + label("standing", MIN_PER_CLASS)
        ready, msg = is_ready_for_gate(labels)
        assert not ready
        assert "lying" in msg

    def test_quase_lá_ainda_bloqueia(self) -> None:
        labels = (
            label("sitting", MIN_PER_CLASS)
            + label("standing", MIN_PER_CLASS)
            + label("lying", MIN_PER_CLASS - 1)
        )
        assert not is_ready_for_gate(labels)[0]

    def test_três_classes_completas_liberam(self) -> None:
        labels = (
            label("sitting", MIN_PER_CLASS)
            + label("standing", MIN_PER_CLASS)
            + label("lying", MIN_PER_CLASS)
        )
        assert is_ready_for_gate(labels)[0]

    def test_other_não_conta_para_a_meta(self) -> None:
        # "Outro" é necessário para não forçar rótulo errado, mas não é uma
        # postura que o gate avalia.
        labels = label("other", 500)
        assert not is_ready_for_gate(labels)[0]


class TestSummary:
    def test_conta_por_classe(self) -> None:
        counts = label_summary(label("sitting", 3) + label("lying", 2))
        assert counts["sitting"] == 3
        assert counts["lying"] == 2
        assert counts["standing"] == 0

    def test_inclui_toda_classe_mesmo_zerada(self) -> None:
        # Sem isto, a UI não mostraria a classe que falta — justamente a que o
        # rotulador precisa ver.
        counts = label_summary([])
        for key in (Posture.SITTING, Posture.STANDING, Posture.LYING, "other"):
            assert str(key) in counts


class TestPersistence:
    def test_ida_e_volta(self, tmp_path: Path) -> None:
        out = tmp_path / "labels.json"
        original = label("sitting", 2)
        save_labels(out, original)
        assert load_labels(out) == original

    def test_arquivo_inexistente_devolve_vazio(self, tmp_path: Path) -> None:
        # Primeira execução: não é erro.
        assert load_labels(tmp_path / "nada.json") == []

    def test_cria_a_pasta(self, tmp_path: Path) -> None:
        out = tmp_path / "sub" / "dir" / "labels.json"
        save_labels(out, label("sitting", 1))
        assert out.exists()

    def test_preserva_a_marca_de_srd(self, tmp_path: Path) -> None:
        # É a segmentação que decide se o modelo serve ao mercado brasileiro.
        out = tmp_path / "labels.json"
        save_labels(
            out,
            [PostureLabel("srd/1.jpg", "sitting", "SRD", is_mixed_breed=True)],
        )
        assert load_labels(out)[0].is_mixed_breed is True
