import "server-only";

/**
 * Ambiente do gateway, para a interface avisar quando não é dinheiro de verdade.
 *
 * Fica separado de `syncpay/config.ts` porque este arquivo é lido por PÁGINA, e
 * o config lança quando falta credencial. Uma página de vitrine não pode
 * quebrar porque a chave ainda não chegou — ela precisa continuar de pé,
 * mostrando o produto, com o botão de pagar indisponível.
 *
 * Continua `server-only`: mesmo sem segredo aqui, ler `process.env` de um
 * componente de cliente daria falso negativo silencioso (a variável chega
 * `undefined` no navegador), e o aviso de sandbox sumiria justamente onde ele
 * mais importa.
 */
export type SyncPayEnvironmentLabel = {
  sandbox: boolean;
  configured: boolean;
  label: string;
};

export function getSyncPayEnvironmentLabel(): SyncPayEnvironmentLabel {
  const sandbox = process.env.SYNCPAY_ENVIRONMENT?.trim() !== "production";
  const configured = Boolean(
    process.env.SYNCPAY_CLIENT_ID?.trim() &&
      process.env.SYNCPAY_CLIENT_SECRET?.trim() &&
      process.env.SYNCPAY_WEBHOOK_SECRET?.trim(),
  );

  return {
    sandbox,
    configured,
    label: sandbox ? "Ambiente de testes" : "Produção",
  };
}
