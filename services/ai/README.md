# services/ai

Treino, export e avaliação dos modelos de visão do AlphaDog.

**Este serviço não infere em runtime.** A inferência acontece on-device, no
celular: mandar vídeo para o servidor mataria o tempo real (latência de rede),
queimaria 4G caro no Brasil, e vídeo do interior da casa do tutor é dado pessoal
sob a LGPD. Aqui só treinamos e exportamos.

## Estado: Fase 0 (spike de viabilidade)

Nenhum modelo treinado ainda. O que existe já roda e está testado (57 testes):

- **Lógica de decisão** — `posture.py`, `exercise.py`
- **Gate do spike** — `evaluation.py`
- **Pipeline de dados** — `dataset.py` + `scripts/prepare_dataset.py`
- **Treino e export** — `scripts/train.py`

Tudo isso roda sem GPU e sem dataset. Só o treino em si precisa dos dois.

```bash
python -m venv .venv
.venv\Scripts\python.exe -m pip install -e ".[dev]"
.venv\Scripts\python.exe -m pytest tests -q
```

## O que precisa de você

Eu não consigo fazer estes quatro — dependem de acesso, hardware ou coleta:

| # | O quê | Como |
| --- | --- | --- |
| 1 | **Acesso ao StanfordExtra** | Formulário em [github.com/benjiebob/StanfordExtra](https://github.com/benjiebob/StanfordExtra). Rende `StanfordExtra_v12.json` |
| 2 | **Stanford Dogs** (imagens, ~750 MB) | [vision.stanford.edu/aditya86/ImageNetDogs](http://vision.stanford.edu/aditya86/ImageNetDogs/) |
| 3 | **GPU** | Colab (T4 grátis) ou RunPod. Não há GPU nesta máquina; em CPU o treino leva dias |
| 4 | **Android intermediário** | Para medir FPS de verdade. Emulador não serve |

Com (1) e (2) na mão:

```bash
python scripts/prepare_dataset.py \
  --json data/StanfordExtra_v12.json \
  --images data/stanford_dogs/Images \
  --out data/yolo

# Este roda no Colab, não aqui.
python scripts/train.py --data data/yolo/dogs.yaml --epochs 100
```

O `prepare_dataset.py` é seguro de rodar localmente: não baixa nada, valida a
entrada e falha alto se os caminhos estiverem errados.

## Por que a lógica vem antes do modelo

A literatura é direta sobre o problema central deste produto:

> "Existing methods focus on dogs in standing poses because when they sit or lie
> down, their legs are self occluded and their bodies deform."

Os exercícios do MVP — sentar, deitar, rolar, dar a pata — são exatamente os
piores casos. O estado da arte em pose canina (ADPT) atinge 86,5% PCK, mas
**37,8% dos frames são "casos difíceis"**.

Um `SUCCESS` indevido não é um bug cosmético: ele ensina o tutor a recompensar o
comportamento errado, e o produto passa a **piorar** o treino do cão. Por isso a
lógica é conservadora por construção e o falso positivo é critério bloqueante.

## Arquitetura da decisão

Três sinais, do mais robusto ao mais frágil:

| Sinal | Arquivo | Sobrevive à oclusão? |
| --- | --- | --- |
| Razão de aspecto da caixa | `posture.py` | Sim — é o mais confiável |
| Geometria dos keypoints | `posture.py` | Não — falha justamente em sentar/deitar |
| Estabilidade temporal | `exercise.py` | Sim — filtra ruído de frame |

`classify_posture` exige **acordo entre caixa e geometria**. Quando discordam,
devolve `UNKNOWN`. Quando os keypoints somem mas a caixa é clara, aceita com
confiança reduzida — recusar todo caso ocluído inviabilizaria o produto, já que
sentar sempre oclui.

`ExerciseSession` transforma frames em feedback: votação de 3-em-5 frames e
permanência mínima. Um frame ruim no meio de vinte bons não quebra a
permanência; alternância constante nunca vira sucesso.

## O gate, em dois níveis

`evaluation.py` codifica os critérios **decididos antes de existir modelo**, para
que não sejam negociados depois que os números aparecerem.

| Métrica | Limite | BUILD | PRODUÇÃO |
| --- | --- | :---: | :---: |
| Acurácia (entre frames comprometidos) | ≥ 90% | ✓ | ✓ |
| Falso positivo | **≤ 2%** | ✓ | ✓ |
| Abstenção | ≤ 35% | ✓ | ✓ |
| FPS em Android intermediário | ≥ 15 | ✓ | ✓ |
| Latência p95 | ≤ 300ms | ✓ | ✓ |
| Queda em SRD | ≤ 10pp | — | ✓ |

**BUILD** prova que o pipeline funciona. **PRODUÇÃO** prova que serve ao mercado
brasileiro. A build atual treina só com raça pura, então PRODUÇÃO fica
bloqueada por decisão consciente — e o relatório diz isso em voz alta:

```
queda em SRD      PENDENTE — sem dataset brasileiro

BUILD       PASSOU
PRODUÇÃO    NÃO PASSOU

Pendências para produção:
  - sem dados de SRD — não validado para o mercado brasileiro
```

O padrão de `passes()` é `PRODUCTION`: quem quiser o critério frouxo pede
explicitamente, e fica registrado na chamada.

Falso positivo é medido **separado** da acurácia de propósito. Um modelo com 95%
de acerto que mente 5% das vezes é reprovado: para um produto que autoriza
recompensa, mentir é pior que errar.

E há um caso que só a métrica segmentada pega — está no teste
`test_unbalanced_data_hides_srd_failure_in_the_aggregate`: com 900 imagens de
raça pura e 100 de SRD, o agregado mostra 98,8% de acerto e 1,2% de falso
positivo, passando em qualquer slide, enquanto o modelo erra 12% dos vira-latas.

## Escolhas de dataset

**StanfordExtra**, não AP-10K. O AP-10K divide ~10k imagens entre 54 espécies
(~185 por espécie) com 17 keypoints genéricos de quadrúpede. O StanfordExtra tem
**12.000 imagens só de cão**, 20 keypoints caninos e máscaras de silhueta — e
deriva do Stanford Dogs (20.580 imgs, 120 raças), que alimenta o classificador
de raça. AP-10K serve como pré-treino.

**Ressalva que decide o produto:** o StanfordExtra é feito de 120 raças
**puras**. Metade dos cães brasileiros é SRD.

Decisão tomada: **seguir com esta build assim mesmo**, e tratar SRD depois. O
gate reflete isso — BUILD passa, PRODUÇÃO não. O débito está codificado, não
esquecido.

## Débito conhecido: SRD

O plano para fechar, quando for a hora:

1. **Medir primeiro.** Rodar o modelo treinado contra vídeos de vira-lata e ver
   o tamanho real da queda. Pode ser menor que o temido — pose depende de
   estrutura esquelética, e SRD tem a mesma de qualquer cão. Ou pode ser grande,
   por pelagem e proporções fora da distribuição. **Não dá para saber sem medir.**
2. **Se a queda for pequena (≤10pp):** só documentar e seguir.
3. **Se for grande:** anotar keypoints em imagens de SRD brasileiro e fazer
   fine-tune. Centenas de imagens bem anotadas valem mais que milhares
   ruidosas; o `stratified_split` já separa por raça e aceita "SRD" como uma.

O caminho mais barato de coleta é o próprio produto: tutores filmando os
próprios cães. Isso exige consentimento explícito e base legal sob a LGPD —
vídeo do interior da casa é dado pessoal. Não é decisão de engenharia.

## Ordem correta de execução

O gate roda sobre o modelo **exportado e quantizado**, nunca sobre o `.pt`. A
quantização INT8 é o que traz o FPS ao alvo em aparelho intermediário — e é
também onde a acurácia cai. Medir no `.pt` mediria um modelo que não vai para
produção.
