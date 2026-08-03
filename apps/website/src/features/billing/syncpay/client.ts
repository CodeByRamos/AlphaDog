import "server-only";
import { getSyncPayConfig, type SyncPayConfig } from "./config";

/**
 * Cliente HTTP da SyncPay: autenticação, tempo limite, erros e log.
 *
 * Endpoints confirmados na documentação oficial (syncpay.apidog.io), não
 * supostos:
 *
 *   POST /api/partner/v1/auth-token   { client_id, client_secret }
 *                                     -> { access_token, token_type,
 *                                          expires_in, expires_at }
 *   POST /v1/gateway/api              Bearer + corpo da cobrança
 *
 * O token vale UMA HORA. Pedir um novo a cada cobrança seria dobrar a latência
 * do checkout e o número de chamadas — por isso ele fica em memória, com
 * margem de segurança antes do vencimento.
 */

/** Falha vinda da SyncPay: rede, status HTTP ou corpo inesperado. */
export class SyncPayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** Corpo da resposta, já sem campos sensíveis. */
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "SyncPayError";
  }
}

/**
 * Tempo máximo de espera por resposta.
 *
 * Sem isso, uma requisição pendurada trava a server action até o tempo limite
 * da plataforma, e o tutor fica olhando um botão girando sem fim. Falhar em oito
 * segundos com mensagem clara é melhor que esperar trinta e falhar igual.
 */
const REQUEST_TIMEOUT_MS = 8_000;

/** Renova o token um minuto antes de vencer, para nenhuma requisição pegá-lo expirado. */
const TOKEN_SAFETY_MARGIN_MS = 60_000;

type CachedToken = { value: string; expiresAt: number };

/**
 * Token em memória do processo.
 *
 * Escopo de módulo, e não de requisição, para sobreviver entre chamadas na
 * mesma instância. Em ambiente serverless cada instância mantém o seu — o pior
 * caso é pedir um token a mais numa instância fria, o que é aceitável e muito
 * melhor que compartilhar segredo por um cache externo.
 */
let cachedToken: CachedToken | null = null;

/**
 * Remove segredos antes de qualquer coisa ir para o log.
 *
 * O corpo de erro da SyncPay pode ecoar o que enviamos, e o que enviamos inclui
 * credenciais e CPF do cliente. Log é lido por gente, copiado para tíquete e
 * guardado por meses — não é lugar para nenhum dos dois. E `webhook_url` carrega
 * o segredo do postback embutido.
 */
const SENSITIVE_KEYS = new Set([
  "client_secret",
  "clientsecret",
  "access_token",
  "accesstoken",
  "authorization",
  "token",
  "cpf",
  "document",
  "postbackurl",
  "urlwebhook",
]);

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? "[oculto]" : redact(item, depth + 1);
  }
  return out;
}

async function requestJson(
  url: string,
  init: RequestInit,
  context: string,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new SyncPayError(
      aborted
        ? `SyncPay não respondeu em ${REQUEST_TIMEOUT_MS}ms (${context}).`
        : `Falha de rede ao chamar a SyncPay (${context}).`,
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // Corpo não-JSON em erro é comum (página de proxy, HTML de gateway).
      body = { raw: text.slice(0, 500) };
    }
  }

  if (!response.ok) {
    console.error("[syncpay] resposta de erro", {
      context,
      status: response.status,
      body: redact(body),
    });

    // 429 tem tratamento próprio porque a janela é longa: a SyncPay responde
    // "Tente novamente em 10 minutos". Insistir só empurra o bloqueio para
    // frente — e o tutor precisa saber que o problema é temporário e não dele.
    if (response.status === 429) {
      throw new SyncPayError(
        "SyncPay recusou por excesso de requisições (429). Aguarde alguns minutos.",
        429,
        redact(body),
      );
    }

    throw new SyncPayError(
      `SyncPay respondeu ${response.status} em ${context}.`,
      response.status,
      redact(body),
    );
  }

  return body;
}

/** Bearer token válido, do cache quando possível. */
export async function getAccessToken(config = getSyncPayConfig()): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - TOKEN_SAFETY_MARGIN_MS > now) {
    return cachedToken.value;
  }

  const body = (await requestJson(
    `${config.baseUrl}/api/partner/v1/auth-token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    },
    "auth-token",
  )) as { access_token?: string; expires_in?: number } | null;

  const token = body?.access_token;
  if (!token) {
    throw new SyncPayError("SyncPay não devolveu access_token na autenticação.");
  }

  // `expires_in` vem em segundos. Uma hora é o documentado; o padrão de 3600
  // cobre a resposta que venha sem o campo.
  const ttlMs = (body.expires_in ?? 3600) * 1000;
  cachedToken = { value: token, expiresAt: now + ttlMs };

  return token;
}

/**
 * Chamada autenticada.
 *
 * Um 401 não vira erro do usuário: o token pode ter sido invalidado do outro
 * lado antes da hora. O cache é descartado e a chamada refeita UMA vez —
 * repetir indefinidamente transformaria credencial errada em laço infinito
 * contra a API do parceiro.
 */
export async function authorizedRequest<T>(
  path: string,
  init: RequestInit,
  context: string,
  config: SyncPayConfig = getSyncPayConfig(),
): Promise<T> {
  const send = async (token: string) =>
    requestJson(
      `${config.baseUrl}${path}`,
      {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          ...(init.headers ?? {}),
        },
      },
      context,
    );

  try {
    return (await send(await getAccessToken(config))) as T;
  } catch (error) {
    if (error instanceof SyncPayError && error.status === 401) {
      cachedToken = null;
      return (await send(await getAccessToken(config))) as T;
    }
    throw error;
  }
}

/** Só para teste: zera o token guardado. */
export function resetTokenCache() {
  cachedToken = null;
}
