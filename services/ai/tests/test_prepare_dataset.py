"""Conversão ponta a ponta, com um StanfordExtra sintético.

Prova o pipeline de preparação sem o dataset real (750 MB, atrás de formulário):
mesmo formato de JSON, imagens falsas. Se isto passa, o script está exercitado
antes de alguém gastar GPU.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from alphadog_ai.keypoints import NUM_KEYPOINTS

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "prepare_dataset.py"


def write_fake_dataset(tmp_path: Path, *, breeds: int = 3, per_breed: int = 6):
    """Monta um StanfordExtra mínimo mas com o formato real."""
    images_root = tmp_path / "Images"
    entries = []

    for b in range(breeds):
        folder = f"n0208562{b}-Breed{b}"
        (images_root / folder).mkdir(parents=True)
        for i in range(per_breed):
            rel = f"{folder}/img_{i}.jpg"
            # Conteúdo irrelevante: o script só copia/linka o arquivo.
            (images_root / rel).write_bytes(b"fake-jpeg")
            entries.append(
                {
                    "img_path": rel,
                    "img_width": 200,
                    "img_height": 100,
                    "joints": [[50.0, 40.0, 1.0] for _ in range(NUM_KEYPOINTS)],
                    "img_bbox": [10.0, 10.0, 100.0, 60.0],
                }
            )

    json_path = tmp_path / "StanfordExtra_v12.json"
    json_path.write_text(json.dumps(entries), encoding="utf-8")
    return json_path, images_root


def run(json_path: Path, images_root: Path, out: Path):
    # PYTHONIOENCODING: no Windows o filho herda cp1252 e engasga nos acentos
    # das mensagens de erro. Sem isto o teste quebra por encoding, não por bug.
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    return subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--json", str(json_path),
            "--images", str(images_root),
            "--out", str(out),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        env=env,
    )


class TestEndToEnd:
    def test_produces_yolo_layout(self, tmp_path: Path) -> None:
        json_path, images_root = write_fake_dataset(tmp_path)
        out = tmp_path / "yolo"

        result = run(json_path, images_root, out)
        assert result.returncode == 0, result.stderr

        assert (out / "dogs.yaml").exists()
        assert (out / "images" / "train").is_dir()
        assert (out / "images" / "val").is_dir()
        assert (out / "labels" / "train").is_dir()

    def test_every_image_has_a_label(self, tmp_path: Path) -> None:
        """Imagem sem label é imagem que o YOLO trata como fundo vazio.

        Passa despercebido: o treino roda, a loss desce, e o modelo aprende que
        aquelas imagens não têm cão.
        """
        json_path, images_root = write_fake_dataset(tmp_path)
        out = tmp_path / "yolo"
        run(json_path, images_root, out)

        for split in ("train", "val"):
            images = sorted(p.stem for p in (out / "images" / split).iterdir())
            labels = sorted(p.stem for p in (out / "labels" / split).iterdir())
            assert images == labels, f"{split}: imagens e labels não batem"

    def test_no_leak_between_train_and_val(self, tmp_path: Path) -> None:
        json_path, images_root = write_fake_dataset(tmp_path)
        out = tmp_path / "yolo"
        run(json_path, images_root, out)

        train = {p.name for p in (out / "images" / "train").iterdir()}
        val = {p.name for p in (out / "images" / "val").iterdir()}
        assert not train & val

    def test_label_content_is_valid(self, tmp_path: Path) -> None:
        json_path, images_root = write_fake_dataset(tmp_path)
        out = tmp_path / "yolo"
        run(json_path, images_root, out)

        label = next((out / "labels" / "train").iterdir())
        parts = label.read_text(encoding="utf-8").strip().split()

        assert len(parts) == 5 + NUM_KEYPOINTS * 3
        assert parts[0] == "0"
        # Todo valor normalizado precisa estar em [0,1].
        for value in parts[1:5]:
            assert 0.0 <= float(value) <= 1.0

    def test_missing_images_are_skipped_not_fatal(self, tmp_path: Path) -> None:
        """Stanford Dogs extraído parcialmente é comum."""
        json_path, images_root = write_fake_dataset(tmp_path)

        entries = json.loads(json_path.read_text(encoding="utf-8"))
        entries.append(
            {
                "img_path": "n999-Ghost/missing.jpg",
                "img_width": 200,
                "img_height": 100,
                "joints": [[50.0, 40.0, 1.0] for _ in range(NUM_KEYPOINTS)],
                "img_bbox": [10.0, 10.0, 100.0, 60.0],
            }
        )
        json_path.write_text(json.dumps(entries), encoding="utf-8")

        result = run(json_path, images_root, tmp_path / "yolo")
        assert result.returncode == 0
        assert "pulados" in result.stdout

    def test_warns_about_purebred_limitation(self, tmp_path: Path) -> None:
        """O aviso de SRD precisa aparecer toda vez, não só no README."""
        json_path, images_root = write_fake_dataset(tmp_path)
        result = run(json_path, images_root, tmp_path / "yolo")
        assert "SRD" in result.stdout

    def test_fails_when_no_image_matches(self, tmp_path: Path) -> None:
        # Caminho errado em --images: precisa falhar, não gerar dataset vazio.
        json_path, _ = write_fake_dataset(tmp_path)
        empty = tmp_path / "empty"
        empty.mkdir()

        result = run(json_path, empty, tmp_path / "yolo")
        assert result.returncode == 1
        assert "nenhuma imagem" in result.stderr
