import "server-only";

/**
 * Configuração da SyncPay — o único lugar do projeto que lê as credenciais.
 *
 * `server-only` no topo não é decoração: ele faz o build FALHAR se algum
 * componente de cliente importar este arquivo, mesmo que por engano, mesmo que
 * indiretamente. Chave de gateway que vaza para o bundle é chave comprometida,
 * e o erro típico não é escrever `process.env.SECRET` num componente de tela —
 * é importar um helper que importa outro que lê a variável.
 *
 * Nenhuma variável daqui tem prefixo `NEXT_PUBLIC_`. Esse prefixo é o que manda
 * o Next embutir o valor no JavaScript enviado ao navegador; usá-lo aqui seria
 * publicar o segredo.
 */

/** Ambiente da SyncPay. Trocar de sandbox para produção é trocar esta variável. */
export type SyncPayEnvironment = "sandbox" | "production";

export type SyncPayConfig = {
  environment: SyncPayEnvironment;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  /**
   * Segredo que autentica o webhook.
   *
   * A documentação da SyncPay não descreve assinatura HMAC nos postbacks — o
   * corpo chega sem cabeçalho de assinatura para conferir. Sem isso, qualquer
   * um que descubra a URL poderia POSTar "pagamento aprovado" e liberar acesso
   * de graça.
   *
   * A defesa é dupla, e as duas camadas são obrigatórias:
   *
   * 1. Este segredo vai na própria URL de postback, e o endpoint recusa quem
   *    não o apresentar. Funciona como senha da porta.
   * 2. Toda liberação de acesso é RECONFERIDA contra a API da SyncPay antes de
   *    valer. Mesmo que a URL vaze, um webhook forjado não sobrevive à
   *    consulta: quem decide se o pagamento existe é o gateway, não o corpo da
   *    requisição.
   */
  webhookSecret: string;
  /** Base pública do site, para montar a URL de postback. */
  siteUrl: string;
};

/** Endereço padrão da API. Sobrescrito por SYNCPAY_BASE_URL quando preciso. */
const DEFAULT_BASE_URL = "https://api.syncpay.pro";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new SyncPayNotConfiguredError(name);
  }
  return value;
}

/**
 * Erro de configuração ausente.
 *
 * Tipo próprio, e não `Error` genérico, para a camada de cima distinguir "falta
 * credencial" de "a SyncPay recusou a cobrança". São problemas de dono
 * diferente: o primeiro é do operador do sistema, o segundo é do cliente.
 */
export class SyncPayNotConfiguredError extends Error {
  constructor(readonly variable: string) {
    super(
      `SyncPay não configurada: defina ${variable} nas variáveis de ambiente. ` +
        "Ver docs/SYNCPAY.md.",
    );
    this.name = "SyncPayNotConfiguredError";
  }
}

/**
 * Há credenciais suficientes para cobrar?
 *
 * Existe para a interface poder dizer "pagamento indisponível no momento" em
 * vez de estourar uma tela de erro enquanto as chaves oficiais não chegam. O
 * resto do sistema — banco, webhook, estados de assinatura — funciona igual.
 */
export function isSyncPayConfigured(): boolean {
  return Boolean(
    process.env.SYNCPAY_CLIENT_ID?.trim() &&
      process.env.SYNCPAY_CLIENT_SECRET?.trim() &&
      process.env.SYNCPAY_WEBHOOK_SECRET?.trim(),
  );
}

export function getSyncPayConfig(): SyncPayConfig {
  const environment: SyncPayEnvironment =
    process.env.SYNCPAY_ENVIRONMENT?.trim() === "production" ? "production" : "sandbox";

  return {
    environment,
    baseUrl: (process.env.SYNCPAY_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    clientId: required("SYNCPAY_CLIENT_ID"),
    clientSecret: required("SYNCPAY_CLIENT_SECRET"),
    webhookSecret: required("SYNCPAY_WEBHOOK_SECRET"),
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://alphadog.com.br").replace(
      /\/+$/,
      "",
    ),
  };
}

/**
 * URL que a SyncPay chama quando o pagamento muda de estado.
 *
 * O segredo entra como parâmetro porque o postback não tem cabeçalho de
 * assinatura para conferir. Ele nunca é registrado em log — ver o redator em
 * `client.ts`.
 */
export function webhookUrl(config: SyncPayConfig): string {
  return `${config.siteUrl}/api/webhooks/syncpay?token=${encodeURIComponent(config.webhookSecret)}`;
}
