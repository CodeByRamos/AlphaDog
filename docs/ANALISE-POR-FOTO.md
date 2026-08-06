# Análise por foto — arquitetura

Como o AlphaDog avalia a execução de um exercício, depois da migração de vídeo
em tempo real para foto.

---

## O fluxo

```
tela de instruções (Training Coach)
   ↓
tutor inicia o treino
   ↓
câmera abre e permanece aberta durante toda a atividade
   ↓
tutor posiciona o cão
   ↓
botão "Capturar foto"
   ↓
foto reduzida para 1024px e comprimida     [aplicativo]
   ↓
POST /api/training/analyze                  [site, autenticado]
   ↓
Claude Opus 5 com visão + prompt DO EXERCÍCIO
   ↓
JSON validado pelo esquema
   ↓
feedback, dica e critério por critério na tela
   ↓
próxima repetição
```

---

## Por que um modelo de linguagem com visão

O produto não precisa saber onde estão as 24 articulações do cão. Precisa
responder **"ele sentou como o exercício pede?"** e explicar o que faltou, em
português, para um tutor que nunca treinou um cão.

| | Modelo de pose (o que havia) | Modelo de visão (o que há) |
|---|---|---|
| Devolve | 24 coordenadas por frame | Veredito, feedback e dica em português |
| Exercício novo | Retreinar e reexportar o modelo | Um arquivo de conteúdo |
| Avalia | Postura (sentado / em pé / deitado) | O exercício inteiro, com seus critérios |
| Roda | No aparelho, 30×/s, drenando bateria | No servidor, uma vez por repetição |
| Explica o erro | Não | Sim, critério por critério |
| Tamanho do APK | +3,5 MB de modelo | — |

Sete dos onze exercícios nunca puderam ser avaliados por postura: "vem",
"junto", "olha", "deixa", "procura" não são posturas. Com visão, todos os onze
são avaliáveis pelo mesmo caminho.

---

## As duas camadas

### Training Coach — `packages/core/src/exercise-guide.ts`

O conteúdo que **ensina**. Dezoito campos por exercício, escritos para quem
nunca treinou um cão: objetivo, idade, pré-requisitos, materiais, ambiente,
postura do tutor, posição do cão, comando verbal, gesto, momento da recompensa,
erros comuns com a correção de cada, quando repetir, quando parar, dicas, e os
critérios que a IA vai analisar.

Aparece na tela de preparação (`ExerciseGuideSections.tsx`).

### Training Analyzer — `apps/website/src/features/training/analyzer.ts`

Recebe foto e exercício, escolhe o prompt, chama o modelo, valida a resposta e
devolve JSON.

**O prompt de cada exercício é montado a partir do guia do próprio exercício.**
Não existe prompt genérico — e não existe prompt escrito à mão em separado, o
que garantiria que um dia a tela ensinasse uma coisa e a IA cobrasse outra. Um
teste falha se dois exercícios produzirem o mesmo prompt.

---

## Formato da resposta

```json
{
  "success": true,
  "confidence": 0.94,
  "feedback": "O quadril está apoiado no chão e as patas dianteiras alinhadas.",
  "tips": "",
  "criteria": [
    { "criterion": "Quadril e patas traseiras apoiados no chão", "met": true, "observation": "..." }
  ],
  "training": "sit"
}
```

Garantido por `output_config.format` com esquema JSON — a API valida antes de
devolver, então não há caminho de "dar parse e torcer".

`success` e `confidence` são separados de propósito: o modelo pode ter certeza
de que o cão **não** executou. Colapsar os dois perderia a diferença entre
"errou claramente" e "não deu para ver".

**Abaixo de 60% de confiança nada é contado.** É a mesma regra que regia o
detector anterior, e pelo mesmo motivo: um "Excelente!" quando o cão não
executou ensina o tutor a recompensar o comportamento errado.

---

## Segurança

**A chave da Anthropic vive só no servidor.** O aplicativo fala com
`/api/training/analyze`; só a rota fala com a Anthropic. Uma chave dentro do
APK é uma chave que qualquer pessoa extrai com um descompilador e passa a
gastar na nossa conta.

Três portas antes de gastar uma chamada, nesta ordem — cada uma mais barata que
a seguinte:

1. **Token válido?** O app manda o access token do Supabase; a rota valida
   contra o servidor do Supabase.
2. **Assinatura ativa?** Conferida no servidor, sempre. A tela escondida do app
   é sugestão — um APK modificado ignora.
3. **Dentro do limite?** 30 análises por hora por usuário. Cobre três sessões
   seguidas e barra quem tente usar a conta como API de visão gratuita.

A foto não é armazenada: vai na requisição, é avaliada e descartada.

---

## Custo

Cada análise é uma chamada com uma imagem de 1024px. A redução no aparelho
existe por isso: modelos cobram por tokens de imagem, e a contagem cresce com a
resolução. Uma foto em resolução máxima custaria várias vezes mais sem melhorar
a resposta — "o quadril está no chão?" não precisa de detalhe fotográfico.

Uma sessão de 5 repetições = 5 análises. O limite de 30/hora é o teto de custo
por usuário.

---

## Como adicionar um exercício novo

Antes exigia rotular imagens, retreinar o modelo, reexportar e refazer o gate.
Agora são três passos, todos em conteúdo:

1. **`packages/core/src/exercise.ts`** — adicione o id em `ExerciseId` e a
   entrada em `EXERCISES` (nome, categoria, passos, repetições).
2. **`packages/core/src/exercise-guide.ts`** — adicione a entrada em
   `EXERCISE_GUIDES` com os dezoito campos. `aiCriteria` são as observações
   visuais verificáveis; `photoInstruction` é o enquadramento.
3. **Pronto.** O prompt é montado sozinho, a tela de instruções se preenche
   sozinha, e os testes já cobrem o novo exercício — eles percorrem todos os ids.

O TypeScript não deixa esquecer: `Record<ExerciseId, ExerciseGuide>` quebra a
compilação se faltar o guia.

---

## Configuração

```
ANTHROPIC_API_KEY=""          # servidor. console.anthropic.com/settings/keys
EXPO_PUBLIC_API_URL="..."     # app. endereço do site publicado
```

Sem a chave, a rota responde 503 e o aplicativo mostra "avaliação indisponível"
— com o botão de marcar acerto à mão funcionando. Recurso que falha vira
funcionalidade a menos, nunca produto quebrado.

---

## O que foi removido

- `apps/mobile/src/vision/` inteiro — detector, frame processor, worklets
- `dogpose.tflite` (3.547.766 bytes) do APK
- `react-native-fast-tflite`, `vision-camera-resize-plugin`,
  `react-native-worklets-core`, `react-native-nitro-modules`
- `packages/core`: `yolo-decode`, `posture-learned`, `posture-model`, `posture`,
  e a máquina de frames de `session.ts` (histerese, votação, permanência)
- Overlays de detecção: `DogOutline`, `ScanOverlay`, `useScanPhase`,
  `VisionStatusPill`, `VisionDebugPanel`

`services/ai/` permanece no repositório — dataset, rotulagem e pipeline de
treino não fazem mais parte do caminho de execução, mas apagá-los é
irreversível e não é exigido pela nova arquitetura.
