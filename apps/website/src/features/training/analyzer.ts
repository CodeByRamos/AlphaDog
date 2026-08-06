import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  ANALYZER_SYSTEM_PROMPT,
  ANALYSIS_JSON_SCHEMA,
  buildAnalysisPrompt,
  inconclusiveResult,
  type AnalysisResult,
  type ExerciseId,
} from "@alphadog/core";

/**
 * Training Analyzer — recebe foto e exercício, devolve avaliação.
 *
 * Roda no servidor, e só no servidor. `server-only` no topo faz o build FALHAR
 * se um componente de cliente importar este arquivo, ainda que por engano: a
 * chave da API vale dinheiro por chamada, e uma chave no bundle é uma chave
 * que qualquer visitante usa à vontade.
 *
 * POR QUE UM MODELO DE LINGUAGEM COM VISÃO, E NÃO UM MODELO DE POSE
 * O produto não precisa saber onde estão as 24 articulações do cão. Precisa
 * responder "ele sentou como o exercício pede?" e explicar o que faltou, em
 * português, para um tutor que nunca treinou um cão. Um modelo de pose devolve
 * coordenadas; transformar coordenadas em conselho exigiria escrever à mão a
 * regra de cada exercício — e cada exercício novo seria um modelo novo.
 *
 * Aqui, exercício novo é um arquivo de conteúdo novo. O prompt sai do próprio
 * guia do exercício, então a tela e a IA cobram exatamente a mesma coisa.
 */

/** Uma foto por análise. Acima disso é upload lento em rede móvel. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Formatos que a API aceita como imagem. */
export const ACCEPTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AcceptedMediaType = (typeof ACCEPTED_MEDIA_TYPES)[number];

export function isAcceptedMediaType(value: string): value is AcceptedMediaType {
  return (ACCEPTED_MEDIA_TYPES as readonly string[]).includes(value);
}

/**
 * Tempo máximo de espera.
 *
 * O tutor está de pé, com o cão na posição, esperando. Passou disso, é melhor
 * dizer "não consegui avaliar" e devolver o botão manual do que deixar a tela
 * girando enquanto o cão desmancha a posição.
 */
const REQUEST_TIMEOUT_MS = 25_000;

/**
 * Espaço de saída.
 *
 * No Claude Opus 5 o raciocínio está ligado por padrão e consome do mesmo teto
 * que o texto da resposta. Um teto apertado aqui não daria erro — daria
 * resposta cortada no meio do JSON.
 */
const MAX_TOKENS = 4096;

export function isAnalyzerConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");
  cached = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
  return cached;
}

export type AnalyzeInput = {
  exerciseId: ExerciseId;
  /** Imagem em base64, sem o prefixo `data:`. */
  imageBase64: string;
  mediaType: AcceptedMediaType;
};

/**
 * Avalia a execução na foto.
 *
 * NUNCA LANÇA. Toda falha vira um resultado inconclusivo, porque o tutor está
 * no meio de uma sessão com o cão posicionado — uma tela de erro ali custa o
 * treino inteiro, enquanto "não consegui avaliar, marque no botão" custa uma
 * repetição. É a mesma regra que rege o resto do aplicativo: recurso que falha
 * vira funcionalidade a menos, nunca produto quebrado.
 */
export async function analyzeExecution(input: AnalyzeInput): Promise<AnalysisResult> {
  if (!isAnalyzerConfigured()) {
    return inconclusiveResult(
      input.exerciseId,
      "A avaliação automática está indisponível no momento.",
    );
  }

  const started = Date.now();

  try {
    const response = await client().beta.messages.create({
      model: "claude-opus-5",
      max_tokens: MAX_TOKENS,
      // Classificação visual com critérios explícitos não precisa de
      // deliberação longa, e cada segundo aqui é o tutor esperando de pé.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: ANALYSIS_JSON_SCHEMA },
      },
      // Os classificadores podem recusar um pedido; sem isto a requisição
      // simplesmente para. Com "default", a própria API repete num modelo de
      // reserva escolhido pela categoria da recusa.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: ANALYZER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: input.mediaType,
                data: input.imageBase64,
              },
            },
            { type: "text", text: buildAnalysisPrompt(input.exerciseId) },
          ],
        },
      ],
    });

    // Recusa chega como HTTP 200 com stop_reason "refusal" e conteúdo vazio.
    // Ler content[0] sem conferir isto quebraria com um erro sem sentido.
    if (response.stop_reason === "refusal") {
      console.error("[analyzer] recusa do modelo", {
        exercise: input.exerciseId,
        category: response.stop_details?.type,
      });
      return inconclusiveResult(
        input.exerciseId,
        "Não consegui avaliar esta foto. Tente outra imagem.",
      );
    }

    const text = response.content.find((block) => block.type === "text");
    if (!text || text.type !== "text") {
      throw new Error("resposta sem bloco de texto");
    }

    const parsed = JSON.parse(text.text) as Omit<AnalysisResult, "training">;

    console.log("[analyzer] análise concluída", {
      exercise: input.exerciseId,
      success: parsed.success,
      confidence: parsed.confidence,
      ms: Date.now() - started,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    return {
      ...parsed,
      // O exercício vem de nós, não do modelo: assim a tela nunca recebe um
      // resultado atribuído ao exercício errado.
      training: input.exerciseId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[analyzer] falha na análise", {
      exercise: input.exerciseId,
      ms: Date.now() - started,
      message,
    });

    // A mensagem interna não vai para a tela: pode conter detalhe da API.
    return inconclusiveResult(
      input.exerciseId,
      "Não consegui avaliar agora. Verifique sua conexão e tente de novo.",
    );
  }
}
