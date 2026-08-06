/**
 * Contrato da análise de execução — o que o Training Analyzer devolve.
 *
 * Vive no core, e não no site, porque três lados precisam concordar sobre o
 * mesmo formato: o servidor que chama o modelo, o aplicativo que desenha o
 * resultado e os testes. Um tipo duplicado em dois lugares diverge no primeiro
 * campo novo, e a divergência aparece como campo vazio na tela do tutor.
 *
 * O prompt de cada exercício é montado a partir do guia do próprio exercício
 * (`exercise-guide.ts`). Não existe prompt genérico: os critérios que o modelo
 * recebe são exatamente os que a tela mostra ao tutor, vindos da mesma fonte.
 * Se um dia divergirem, é porque alguém editou dois lugares — e não há dois
 * lugares.
 */

import { getExercise, type ExerciseId } from "./exercise";
import { getExerciseGuide } from "./exercise-guide";

/**
 * Resultado de uma análise.
 *
 * `success` e `confidence` são separados de propósito. Um modelo pode estar
 * seguro de que o cão NÃO executou (`success: false`, `confidence: 0.95`) — o
 * contrário de um resultado incerto. Colapsar os dois num número só perderia
 * a diferença entre "errou claramente" e "não deu para ver".
 */
export type AnalysisResult = {
  success: boolean;
  /** 0 a 1. Quanto o modelo confia no próprio veredito. */
  confidence: number;
  /** Frase para o tutor, na segunda pessoa. É o que aparece grande na tela. */
  feedback: string;
  /** Como melhorar na próxima. Vazio quando acertou em cheio. */
  tips: string;
  /** Quais critérios foram atendidos e quais não. */
  criteria: readonly CriterionCheck[];
  /** O exercício avaliado. Volta na resposta para a tela não confiar no pedido. */
  training: ExerciseId;
};

export type CriterionCheck = {
  /** O critério, copiado do guia. */
  criterion: string;
  met: boolean;
  /** O que o modelo viu. Uma frase. */
  observation: string;
};

/**
 * Limiar de confiança para contar como acerto.
 *
 * Abaixo disso o resultado vira "não deu para avaliar", e o tutor decide. É a
 * mesma regra que governava o detector em tempo real, e pelo mesmo motivo: um
 * "Excelente!" quando o cão não executou ensina o tutor a recompensar o
 * comportamento errado, e o produto passa a piorar o treino.
 */
export const MIN_ANALYSIS_CONFIDENCE = 0.6;

/** O resultado é confiável o bastante para contar uma repetição? */
export function countsAsRep(result: AnalysisResult): boolean {
  return result.success && result.confidence >= MIN_ANALYSIS_CONFIDENCE;
}

/**
 * Esquema JSON que o modelo é obrigado a seguir.
 *
 * Com `output_config.format`, a API valida a resposta contra este esquema antes
 * de devolver — não há como voltar texto solto, e não existe caminho de
 * "tentar dar parse e torcer". `additionalProperties: false` em todo objeto é
 * exigência da API para saída estruturada.
 */
export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    success: {
      type: "boolean",
      description: "true somente se o cão executou o exercício corretamente.",
    },
    confidence: {
      type: "number",
      description:
        "0 a 1. Confiança no veredito. Use valores baixos quando a foto estiver escura, cortada, desfocada ou sem o cão visível.",
    },
    feedback: {
      type: "string",
      description:
        "Uma ou duas frases dirigidas ao tutor, em português do Brasil, na segunda pessoa. Diga o que você observou na foto.",
    },
    tips: {
      type: "string",
      description:
        "Uma dica prática para a próxima tentativa. Vazio quando a execução foi correta e não há o que ajustar.",
    },
    criteria: {
      type: "array",
      description: "Um item para cada critério listado, na mesma ordem.",
      items: {
        type: "object",
        properties: {
          criterion: { type: "string" },
          met: { type: "boolean" },
          observation: {
            type: "string",
            description: "O que você viu na foto sobre este critério.",
          },
        },
        required: ["criterion", "met", "observation"],
        additionalProperties: false,
      },
    },
  },
  required: ["success", "confidence", "feedback", "tips", "criteria"],
  additionalProperties: false,
} as const;

/**
 * Instrução de sistema — o papel, e as regras que valem para todo exercício.
 *
 * A regra mais importante está aqui e não no prompt de cada exercício: NA
 * DÚVIDA, NÃO APROVAR. Um falso "acertou" ensina o tutor a recompensar o
 * comportamento errado, e a partir daí o produto piora o treino em vez de
 * melhorar. Um falso "não deu para ver" custa uma foto a mais.
 */
export const ANALYZER_SYSTEM_PROMPT = `Você avalia fotos de treino de cães para o AlphaDog, um aplicativo brasileiro de adestramento positivo.

Você recebe UMA foto e a lista de critérios visuais de um exercício específico. Sua tarefa é dizer se o cão executou aquele exercício, com base apenas no que está visível na imagem.

REGRAS

1. Avalie somente o exercício informado. Um cão sentado numa foto de "deitar" não é acerto.
2. Julgue apenas o que a imagem mostra. Não suponha o que aconteceu antes ou depois.
3. NA DÚVIDA, NÃO APROVE. Se a foto estiver escura, cortada, desfocada, se o cão estiver parcialmente fora do quadro ou se você não conseguir verificar um critério, devolva success = false e uma confiança baixa. Aprovar por engano ensina o tutor a recompensar o comportamento errado — é o pior erro possível neste produto.
4. Se não houver cão na foto, devolva success = false, confidence próxima de 0 e diga isso no feedback.
5. Preencha um item de "criteria" para CADA critério recebido, na mesma ordem, mesmo os que você não conseguiu verificar (nesse caso met = false e diga que não deu para ver).

TOM

Escreva em português do Brasil, na segunda pessoa, falando com o tutor. Seja direto, específico e encorajador — descreva o que viu, não dê nota. Nunca use linguagem técnica de visão computacional. Nada de emoji.

Quando o cão acertar, diga o que ele fez certo. Quando errar, diga exatamente o que faltou e como ajustar na próxima — em uma frase, acionável.`;

/**
 * Prompt do exercício, montado a partir do próprio guia.
 *
 * Cada exercício tem o seu, e o conteúdo vem da mesma fonte que alimenta a tela
 * de instruções. Escrever prompts à mão, separados do conteúdo, garantiria que
 * um dia a tela ensinasse uma coisa e a IA cobrasse outra.
 */
export function buildAnalysisPrompt(exerciseId: ExerciseId): string {
  const exercise = getExercise(exerciseId);
  const guide = getExerciseGuide(exerciseId);

  const criteria = guide.aiCriteria
    .map((criterion, index) => `${index + 1}. ${criterion}`)
    .join("\n");

  const mistakes = guide.commonMistakes
    .map((item) => `- ${item.mistake}`)
    .join("\n");

  return `EXERCÍCIO: ${exercise.name}

O que o cão deve estar fazendo:
${guide.objective}

Posição esperada do cão:
${guide.dogPosition}

CRITÉRIOS VISUAIS — avalie cada um e devolva um item por critério, nesta ordem:
${criteria}

Erros que o tutor costuma cometer neste exercício (úteis para escrever a dica):
${mistakes}

Enquadramento esperado da foto:
${guide.photoInstruction}

Avalie a foto anexada.`;
}

/**
 * Resultado para quando a análise não pôde acontecer.
 *
 * Existe para que a tela nunca precise lidar com `null`: sem rede, sem chave ou
 * com erro do modelo, o tutor recebe um resultado honesto — "não consegui
 * avaliar" — e o botão de marcar à mão continua ali. Simular sucesso aqui seria
 * a mesma mentira que o app evita em todo o resto.
 */
export function inconclusiveResult(
  exerciseId: ExerciseId,
  reason: string,
): AnalysisResult {
  return {
    success: false,
    confidence: 0,
    feedback: reason,
    tips: "Você pode marcar o acerto no botão e seguir o treino normalmente.",
    criteria: [],
    training: exerciseId,
  };
}
