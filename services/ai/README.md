# services/ai

Treino, export e avaliação dos modelos de visão do AlphaDog.

**Este serviço não infere em runtime.** A inferência acontece on-device, no
celular: mandar vídeo para o servidor mataria o tempo real (latência de rede),
queimaria 4G caro no Brasil, e vídeo do interior da casa do tutor é dado pessoal
sob a LGPD. Aqui só treinamos e exportamos.

## Estado: Fase 0 (spike de viabilidade)

Nenhum modelo treinado ainda. O que existe é a **lógica de decisão** e o
**harness que julga o spike** — ambos rodam sem GPU e sem dataset.

```bash
python -m venv .venv
.venv\Scripts\python.exe -m pip install -e ".[dev]"
.venv\Scripts\python.exe -m pytest tests -q
```

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

## O gate

`evaluation.py` codifica os critérios **decididos antes de existir modelo**, para
que não sejam negociados depois que os números aparecerem.

| Métrica | Limite |
| --- | --- |
| Acurácia (entre frames comprometidos) | ≥ 90% |
| Falso positivo | **≤ 2%** (bloqueante) |
| Abstenção | ≤ 35% |
| Queda em SRD | ≤ 10pp |
| FPS em Android intermediário | ≥ 15 |
| Latência p95 | ≤ 300ms |

Falso positivo é medido **separado** da acurácia de propósito: um modelo com 95%
de acerto que mente 5% das vezes é reprovado. Para um produto que autoriza
recompensa, mentir é pior que errar.

`SpikeReport.passes()` retorna `False` quando **faltam** dados de SRD ou de
desempenho. Spike incompleto não é spike aprovado.

## Escolhas de dataset

**StanfordExtra**, não AP-10K. O AP-10K divide ~10k imagens entre 54 espécies
(~185 por espécie) com 17 keypoints genéricos de quadrúpede. O StanfordExtra tem
**12.000 imagens só de cão**, 20 keypoints caninos e máscaras de silhueta — e
deriva do Stanford Dogs (20.580 imgs, 120 raças), que alimenta o classificador
de raça. AP-10K serve como pré-treino.

**Ressalva que decide o produto:** o StanfordExtra é feito de 120 raças
**puras**. Metade dos cães brasileiros é SRD. Se o modelo não generalizar para
vira-lata, ele não serve ao nosso mercado — por melhor que seja o número
agregado. É a pergunta mais importante do spike.

## O que falta para rodar o spike de verdade

- [ ] Acesso ao StanfordExtra (exige formulário)
- [ ] GPU para treinar (Colab ou RunPod — não há GPU local)
- [ ] Vídeos de cães brasileiros reais, **incluindo SRD**
- [ ] Celular Android intermediário para medir FPS (não emulador)

Sem estes quatro itens, o veredito do spike não existe — só a lógica que o
julgará.
