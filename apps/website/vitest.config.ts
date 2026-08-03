import { defineConfig } from "vitest/config";

/**
 * Testes do site.
 *
 * Só os módulos de domínio puro entram: preço, tradução de estados de pagamento
 * e validação de payload. São exatamente as partes onde um erro não dá tela
 * vermelha — dá acesso liberado sem pagamento, ou cliente pagante trancado
 * fora. Componente e página ficam de fora de propósito; testá-los exigiria
 * ambiente de DOM para cobrir marcação, que muda toda semana.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
