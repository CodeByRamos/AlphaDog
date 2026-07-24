"""Inspeciona o dogpose.tflite: formato exato de entrada e saída.

Existe porque escrever o decodificador da saída no chute é como se cria um bug
que parece funcionar: o app mostraria uma postura plausível e errada. Aqui a
gente lê do arquivo o que ele realmente devolve.

    cd services/ai
    .\\.venv\\Scripts\\python.exe scripts\\inspect_model.py
"""

from pathlib import Path

import numpy as np
from ai_edge_litert.interpreter import Interpreter

# scripts -> ai -> services -> raiz do repo
MODEL = Path(__file__).resolve().parents[3] / "apps/mobile/assets/models/dogpose.tflite"


def main() -> None:
    if not MODEL.exists():
        raise SystemExit(f"modelo não encontrado: {MODEL}")

    print(f"arquivo: {MODEL}")
    print(f"tamanho: {MODEL.stat().st_size / 1e6:.2f} MB\n")

    interpreter = Interpreter(model_path=str(MODEL))
    interpreter.allocate_tensors()

    print("=== ENTRADA ===")
    for d in interpreter.get_input_details():
        print(f"  nome:  {d['name']}")
        print(f"  shape: {d['shape']}")
        print(f"  dtype: {d['dtype']}")
        q = d.get("quantization", (0.0, 0))
        print(f"  quant: scale={q[0]} zero_point={q[1]}")
        print()

    print("=== SAÍDA ===")
    for d in interpreter.get_output_details():
        print(f"  nome:  {d['name']}")
        print(f"  shape: {d['shape']}")
        print(f"  dtype: {d['dtype']}")
        q = d.get("quantization", (0.0, 0))
        print(f"  quant: scale={q[0]} zero_point={q[1]}")
        print()

    # Roda um frame sintético só para confirmar que a inferência executa e ver a
    # forma real do tensor de saída. Ruído não diz nada sobre acurácia — só
    # prova que o grafo roda e revela o layout.
    inp = interpreter.get_input_details()[0]
    shape = inp["shape"]
    if inp["dtype"] == np.uint8:
        dummy = np.random.randint(0, 255, size=shape, dtype=np.uint8)
    elif inp["dtype"] == np.int8:
        dummy = np.random.randint(-128, 127, size=shape, dtype=np.int8)
    else:
        dummy = np.random.rand(*shape).astype(inp["dtype"])

    interpreter.set_tensor(inp["index"], dummy)
    interpreter.invoke()

    print("=== INFERÊNCIA DE TESTE (ruído) ===")
    for d in interpreter.get_output_details():
        out = interpreter.get_tensor(d["index"])
        print(f"  saída {d['shape']} -> array {out.shape} {out.dtype}")
        print(f"  min={out.min()} max={out.max()}")
        flat = out.reshape(-1)
        print(f"  primeiros 12 valores: {flat[:12]}")
        print()

    # Interpretação do layout esperado para YOLO-pose com 1 classe e 24 kpts:
    #   canais = 4 (xywh) + 1 (conf da classe) + 24*3 (x,y,visibilidade) = 77
    print("=== LEITURA ===")
    for d in interpreter.get_output_details():
        s = list(d["shape"])
        if len(s) == 3:
            _, a, b = s
            channels = min(a, b)
            anchors = max(a, b)
            kpt_channels = channels - 5
            print(f"  canais={channels} âncoras={anchors}")
            print(f"  canais - 5 (xywh+conf) = {kpt_channels}")
            if kpt_channels % 3 == 0:
                print(f"  -> {kpt_channels // 3} keypoints com (x, y, visibilidade)")
            elif kpt_channels % 2 == 0:
                print(f"  -> {kpt_channels // 2} keypoints com (x, y)")
            print(f"  layout: {'canais-primeiro (transpor)' if a < b else 'âncoras-primeiro'}")


if __name__ == "__main__":
    main()
