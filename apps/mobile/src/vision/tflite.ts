import type { TfliteModel } from "react-native-fast-tflite";

/**
 * Acesso ao runtime TFLite que NÃO derruba o app quando ele não existe.
 *
 * O `react-native-fast-tflite` roda sobre Nitro, e importar o pacote no topo do
 * arquivo dispara a busca pelo módulo nativo já na carga — se o APK instalado
 * foi gerado antes da dependência entrar, isso lança e leva junto a tela de
 * treino inteira. Foi exatamente o que aconteceu: o app parou de abrir o treino
 * por causa de um recurso que é OPCIONAL.
 *
 * A visão computacional é melhoria; o treino com marcação do tutor é o produto.
 * Melhoria nunca pode quebrar o produto. Por isso o require é tardio e
 * protegido: sem runtime nativo, o app segue com o botão "Ele acertou".
 */
export type TfliteRuntime = {
  loadTensorflowModel: (
    source: unknown,
    delegates: string[],
  ) => Promise<TfliteModel>;
};

let cached: TfliteRuntime | null | undefined;

/** Devolve o runtime, ou null se este build não o contém. Nunca lança. */
export function getTfliteRuntime(): TfliteRuntime | null {
  if (cached !== undefined) return cached;

  try {
    // require tardio: só executa quando alguém abre o treino, e o catch pega o
    // caso de o módulo nativo não estar no binário.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-fast-tflite") as TfliteRuntime;
    cached = typeof mod?.loadTensorflowModel === "function" ? mod : null;
  } catch {
    cached = null;
  }

  return cached;
}
