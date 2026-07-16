"""Treina e exporta o YOLO-pose canino.

Precisa de GPU. Em CPU o treino levaria dias — use Colab (T4 grátis) ou RunPod.

    python scripts/train.py --data data/yolo/dogs.yaml --epochs 100

Exporta para ONNX e TFLite porque a inferência é on-device: mandar vídeo para
servidor mataria o tempo real, queimaria 4G caro e vídeo do interior da casa do
tutor é dado pessoal sob a LGPD.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

#: Checkpoint base. YOLO26 traz 43% mais velocidade em CPU e remove o NMS, o que
#: dá latência previsível em edge — decisivo para um frame processor.
#: `n` (nano) é escolha deliberada: o alvo é Android intermediário, não flagship.
DEFAULT_WEIGHTS = "yolo26n-pose.pt"

#: 640 é o padrão do YOLO. Se o FPS ficar abaixo do alvo, baixar para 480 é a
#: primeira alavanca — custa menos acurácia que trocar de modelo.
DEFAULT_IMGSZ = 640


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--weights", default=DEFAULT_WEIGHTS)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=DEFAULT_IMGSZ)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--project", type=Path, default=Path("runs"))
    parser.add_argument("--name", default="dogpose")
    parser.add_argument(
        "--no-export", action="store_true", help="Só treinar, sem exportar."
    )
    args = parser.parse_args()

    try:
        import torch
        from ultralytics import YOLO
    except ImportError:
        print(
            'erro: dependências de treino ausentes. Instale com:\n'
            '  pip install -e ".[train]"',
            file=sys.stderr,
        )
        return 1

    if not args.data.exists():
        print(f"erro: {args.data} não existe. Rode prepare_dataset.py antes.",
              file=sys.stderr)
        return 1

    if not torch.cuda.is_available():
        # Não bloqueia — mas avisa alto, porque a pessoa vai esperar dias sem
        # entender por quê.
        print(
            "AVISO: CUDA indisponível. Treinar em CPU leva dias.\n"
            "       Use Colab (T4 grátis) ou RunPod.\n",
            file=sys.stderr,
        )

    model = YOLO(args.weights)

    model.train(
        data=str(args.data.resolve()),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(args.project),
        name=args.name,
        # Flip horizontal usa o flip_idx do YAML. Sem ele os lados trocariam.
        fliplr=0.5,
        # Flip vertical é desligado de propósito: cão de cabeça para baixo não
        # existe no uso real e o augment só ensinaria ruído.
        flipud=0.0,
        # Sessão de treino acontece em sala, quintal, luz variada. Augment de
        # cor ajuda; augment geométrico agressivo atrapalha a leitura de pose.
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=5.0,
        # Mosaic mistura 4 imagens: ótimo para detecção, ruim para pose, porque
        # corta membros e gera keypoints sem contexto. Desligado no fim.
        close_mosaic=10,
        patience=20,
        seed=1337,
    )

    best = args.project / args.name / "weights" / "best.pt"
    print(f"\npesos: {best}")

    if args.no_export:
        return 0

    trained = YOLO(str(best))

    # ONNX: iOS via onnxruntime, e baseline de referência para conferir que a
    # exportação não alterou a saída.
    onnx_path = trained.export(format="onnx", imgsz=args.imgsz, simplify=True)
    print(f"onnx: {onnx_path}")

    # TFLite INT8: Android. A quantização é o que traz o FPS ao alvo em
    # aparelho intermediário — e é também onde a acurácia pode cair, então o
    # gate precisa rodar sobre o modelo JÁ quantizado, não sobre o .pt.
    try:
        tflite_path = trained.export(
            format="tflite", int8=True, imgsz=args.imgsz, data=str(args.data.resolve())
        )
        print(f"tflite: {tflite_path}")
    except Exception as exc:  # noqa: BLE001 - export é best-effort
        print(f"aviso: export TFLite falhou: {exc}", file=sys.stderr)

    print(
        "\nPRÓXIMO PASSO: rodar o gate sobre o modelo exportado e quantizado,\n"
        "não sobre o .pt — a quantização muda a acurácia."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
