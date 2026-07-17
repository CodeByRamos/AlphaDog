import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Só a lógica pura. Componentes de RN precisariam de runtime nativo, e o
    // valor de testar JSX aqui é baixo perto do custo de manter o mock.
    include: ["src/**/*.test.ts"],
  },
});
