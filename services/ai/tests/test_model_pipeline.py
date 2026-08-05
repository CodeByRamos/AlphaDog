"""Testa a pipeline de visão contra o modelo REAL e fotos REAIS.

Os outros testes deste diretório exercitam lógica pura — postura, avaliação,
dataset. Este é o único que carrega o `dogpose.tflite` e roda inferência, e
existe por um motivo específico:

"a IA não detecta nada" tem duas causas possíveis e opostas, e do lado de fora
elas são idênticas — uma tela sem caixa:

  (a) o modelo não reconhece o que recebe  -> confiança perto de zero
  (b) o limiar está apertado demais        -> confiança logo abaixo dele

Sem este teste, distinguir uma da outra exigia gerar um APK, instalar num
aparelho e olhar. Vinte minutos por hipótese. Aqui são segundos, e o resultado
é um número.

Os testes se AUTO-IGNORAM quando o runtime ou as fotos não estão presentes, em
vez de falhar: o `ai-edge-litert` não é dependência de execução do produto, e o
StanfordExtra tem gigabytes que não entram no repositório. Falhar por ausência
de dado treinaria todo mundo a ignorar a suíte.
"""

from __future__ import annotations

import random
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[3]
MODEL = ROOT / "apps/mobile/assets/models/dogpose.tflite"
IMAGES = ROOT / "services/ai/data/stanford_dogs/Images"

INPUT_SIZE = 640
NUM_CHANNELS = 77
NUM_ANCHORS = 8400
# O mesmo limiar do aplicativo (packages/core/src/yolo-decode.ts).
MIN_CONFIDENCE = 0.5

litert = pytest.importorskip(
    "ai_edge_litert.interpreter", reason="ai-edge-litert não instalado"
)
Image = pytest.importorskip("PIL.Image", reason="pillow não instalado")


@pytest.fixture(scope="module")
def interpreter():
    if not MODEL.exists():
        pytest.skip(f"modelo ausente: {MODEL}")
    it = litert.Interpreter(model_path=str(MODEL))
    it.allocate_tensors()
    return it


def photos(count: int) -> list[Path]:
    if not IMAGES.exists():
        pytest.skip(f"fotos ausentes: {IMAGES}")
    all_photos = sorted(IMAGES.rglob("*.jpg"))
    if len(all_photos) < count:
        pytest.skip(f"poucas fotos: {len(all_photos)}")
    # Semente fixa: rodar de novo dá o mesmo conjunto, então uma queda de
    # métrica é mudança de verdade e não sorteio diferente.
    random.seed(42)
    return random.sample(all_photos, count)


def center_crop(img, size: int = INPUT_SIZE):
    """O mesmo recorte que o aplicativo faz, via resize-plugin."""
    w, h = img.size
    side = min(w, h)
    left, top = (w - side) // 2, (h - side) // 2
    return img.crop((left, top, left + side, top + side)).resize(
        (size, size), Image.BILINEAR
    )


def to_tensor(canvas) -> np.ndarray:
    """RGB 0..1 em NCHW — exatamente o que o worklet monta no aplicativo."""
    arr = np.asarray(canvas, dtype=np.float32) / 255.0
    return np.transpose(arr, (2, 0, 1))[None]


def infer(interpreter, tensor: np.ndarray) -> np.ndarray:
    inp = interpreter.get_input_details()[0]
    out = interpreter.get_output_details()[0]
    interpreter.set_tensor(inp["index"], tensor)
    interpreter.invoke()
    return interpreter.get_tensor(out["index"])


def best_confidence(raw: np.ndarray) -> float:
    """Canal 4 é a confiança da classe. Mesma leitura do decode em TypeScript."""
    return float(np.max(raw[0].T[:, 4]))


def test_modelo_existe_no_bundle_do_app():
    """O arquivo precisa estar onde o Metro empacota, não em qualquer lugar."""
    assert MODEL.exists(), f"modelo ausente em {MODEL}"
    assert MODEL.stat().st_size > 1_000_000, "modelo pequeno demais para ser real"


def test_formato_do_tensor_bate_com_o_codigo_do_app(interpreter):
    """Entrada e saída conferem com o que o worklet monta e decodifica.

    Se este teste quebrar, o app para de detectar sem dar erro: ele continuaria
    enviando NCHW para um modelo que passou a querer NHWC, e lendo o canal 4 de
    um tensor que mudou de formato. Silencioso e fatal.
    """
    inp = interpreter.get_input_details()[0]
    out = interpreter.get_output_details()[0]

    assert list(inp["shape"]) == [1, 3, INPUT_SIZE, INPUT_SIZE]
    assert inp["dtype"] == np.float32
    assert list(out["shape"]) == [1, NUM_CHANNELS, NUM_ANCHORS]
    assert out["dtype"] == np.float32


def test_inferencia_executa_e_devolve_o_tamanho_certo(interpreter):
    """Carregar e executar são coisas diferentes — esta é a segunda."""
    raw = infer(interpreter, np.zeros((1, 3, INPUT_SIZE, INPUT_SIZE), np.float32))
    assert raw.shape == (1, NUM_CHANNELS, NUM_ANCHORS)
    assert np.isfinite(raw).all(), "saída com NaN ou infinito"


def test_imagem_vazia_nao_inventa_cao(interpreter):
    """Entrada preta não pode produzir detecção.

    É o teste que separa modelo de gerador de números: um detector que acusa cão
    numa tela preta acusaria em qualquer coisa, e o produto passaria a ensinar o
    tutor a recompensar comportamento errado.
    """
    raw = infer(interpreter, np.zeros((1, 3, INPUT_SIZE, INPUT_SIZE), np.float32))
    assert best_confidence(raw) < MIN_CONFIDENCE


def test_detecta_caes_em_fotos_reais(interpreter):
    """O teste que prova que a IA é real.

    Trinta fotos de cães, o mesmo pré-processamento do aplicativo, o mesmo
    limiar. Menos de 80% de detecção significa que o problema é o modelo — e
    não a câmera, nem a interface.
    """
    sample = photos(30)
    confidences = []

    for path in sample:
        img = Image.open(path).convert("RGB")
        raw = infer(interpreter, to_tensor(center_crop(img)))
        confidences.append(best_confidence(raw))

    arr = np.array(confidences)
    detected = (arr >= MIN_CONFIDENCE).mean()

    assert detected >= 0.8, (
        f"só {detected:.0%} das fotos de cão foram detectadas "
        f"(média {arr.mean():.3f}, mediana {np.median(arr):.3f})"
    )


def test_rotacao_nao_derruba_a_deteccao(interpreter):
    """Cobre a orientação do frame vinda da câmera.

    O buffer do Android chega na orientação do sensor, deitado, enquanto o
    telefone é segurado em pé. Este teste mede o quanto isso importa — e mostrou
    que importa POUCO: o modelo tolera giro. Serve de trava contra alguém
    concluir, no futuro, que rotação é a causa de uma falta de detecção.
    """
    sample = photos(10)

    for angle in (90, 180, 270):
        confidences = []
        for path in sample:
            img = Image.open(path).convert("RGB")
            # PIL gira no anti-horário; o sinal negativo simula o giro horário
            # que o resize-plugin aplica.
            rotated = center_crop(img).rotate(-angle, expand=True)
            raw = infer(interpreter, to_tensor(rotated))
            confidences.append(best_confidence(raw))

        detected = (np.array(confidences) >= MIN_CONFIDENCE).mean()
        assert detected >= 0.6, f"giro de {angle}° derrubou a detecção para {detected:.0%}"
