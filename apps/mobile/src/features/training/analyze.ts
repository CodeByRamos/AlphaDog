import {
  inconclusiveResult,
  type AnalysisResult,
  type ExerciseId,
} from "@alphadog/core";
import { supabase } from "../../lib/supabase";

/**
 * Envia a foto para avaliação.
 *
 * A chamada vai para o NOSSO servidor, nunca direto para a API do modelo. Duas
 * razões, e ambas são definitivas:
 *
 * 1. A chave da API vale dinheiro por chamada. Uma chave dentro do APK é uma
 *    chave que qualquer pessoa extrai com um descompilador e passa a usar na
 *    nossa conta.
 * 2. É o servidor que confere a assinatura. Verificação feita no aplicativo é
 *    sugestão: um APK modificado ignora.
 *
 * O token do Supabase vai no cabeçalho — é o mesmo da sessão do tutor, e é por
 * ele que o servidor sabe de quem é a cota e se há assinatura ativa.
 */

/** Onde o site está publicado. Sem isso, não há para onde mandar a foto. */
const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://alphadog.com.br"
).replace(/\/+$/, "");

/**
 * Teto de espera.
 *
 * O tutor está de pé, segurando o cão na posição. Trinta segundos é o limite do
 * que ele aguenta antes de o cão desmanchar — passou disso, é melhor devolver o
 * botão manual do que manter a tela girando.
 */
const TIMEOUT_MS = 30_000;

export async function analyzePhoto(input: {
  exerciseId: ExerciseId;
  /** Foto em base64, sem o prefixo `data:`. */
  imageBase64: string;
  mediaType?: string;
}): Promise<AnalysisResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    return inconclusiveResult(
      input.exerciseId,
      "Sua sessão expirou. Entre de novo para usar a avaliação automática.",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/api/training/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        exerciseId: input.exerciseId,
        image: input.imageBase64,
        mediaType: input.mediaType ?? "image/jpeg",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Cada código tem uma causa diferente, e o tutor precisa saber qual —
      // "deu erro" não diz se ele deve esperar, assinar ou tentar outra foto.
      const message =
        response.status === 402
          ? "Sua assinatura não está ativa."
          : response.status === 429
            ? "Muitas análises seguidas. Aguarde alguns minutos."
            : response.status === 401
              ? "Sua sessão expirou. Entre de novo."
              : "Não consegui avaliar agora.";

      console.log(`[AlphaDog] análise recusada (${response.status})`);
      return inconclusiveResult(input.exerciseId, message);
    }

    const result = (await response.json()) as AnalysisResult;

    // O servidor devolve o exercício junto; conferir aqui protege a tela de
    // desenhar um resultado de outro treino se algo se cruzar no caminho.
    if (result.training !== input.exerciseId) {
      return inconclusiveResult(
        input.exerciseId,
        "A resposta não correspondeu a este exercício. Tente de novo.",
      );
    }

    return result;
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    console.log(
      `[AlphaDog] falha ao enviar foto: ${aborted ? "tempo esgotado" : String(error)}`,
    );

    return inconclusiveResult(
      input.exerciseId,
      aborted
        ? "A avaliação demorou demais. Verifique sua conexão."
        : "Não consegui enviar a foto. Verifique sua conexão.",
    );
  } finally {
    clearTimeout(timer);
  }
}
