import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Trava de laço de crash para o caminho de visão computacional.
 *
 * O frame processor executa código nativo: libyuv converte pixels, o TFLite roda
 * inferência, e ambos vivem fora do JavaScript. Uma falha ali não vira exceção
 * capturável — vira SIGABRT, e o aplicativo simplesmente some da tela. Nenhum
 * try/catch, ErrorBoundary ou tratador de promessa alcança esse ponto.
 *
 * Foi exatamente esse o comportamento relatado: abre o treino, concede a câmera,
 * app fecha. E como a sessão seguinte repete os mesmos passos, o tutor fica preso
 * num laço — o produto inteiro se torna inutilizável por causa de um recurso.
 *
 * A trava quebra o laço observando o que só se sabe depois: a sessão anterior
 * terminou por vontade do usuário ou porque o processo morreu?
 *
 *   `begin()` grava a marca ANTES de a câmera ligar.
 *   `end()` apaga a marca quando a tela é desmontada normalmente.
 *
 * Marca encontrada na abertura significa que o processo morreu com a câmera no
 * ar. Duas dessas seguidas e a análise automática é desligada para sempre neste
 * aparelho: o treino continua funcionando, com o tutor marcando o acerto no
 * botão, que é como o app já funciona quando o modelo não carrega.
 *
 * Duas, e não uma: uma morte pode ser o sistema recuperando memória, o tutor
 * matando o app pela lista de recentes, ou a bateria acabando. Duas seguidas,
 * sem nenhuma sessão inteira no meio, é padrão.
 */

const KEY = "alphadog.vision.unclean-exits.v1";

/** Mortes seguidas com a câmera aberta antes de desistir da análise. */
const LIMIT = 2;

/** Estado em memória, para o worklet e a UI não irem ao disco a cada render. */
let uncleanExits = 0;
let loaded = false;

async function readCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    // Sem armazenamento, seguimos permitindo: a trava existe para proteger de
    // repetição, não para bloquear por precaução.
    return 0;
  }
}

/**
 * A análise automática pode ligar nesta sessão?
 *
 * Chamado antes de montar a câmera. Já registra a tentativa: se o processo
 * morrer daqui em diante, a marca fica no disco.
 */
export async function beginVisionSession(): Promise<boolean> {
  if (!loaded) {
    uncleanExits = await readCount();
    loaded = true;
  }

  if (uncleanExits >= LIMIT) return false;

  try {
    await AsyncStorage.setItem(KEY, String(uncleanExits + 1));
  } catch {
    // Falhar em gravar só significa que esta sessão não será contada.
  }
  return true;
}

/**
 * A tela de treino fechou por vontade do usuário.
 *
 * Zera a contagem: o que a trava procura são mortes SEGUIDAS. Uma sessão que
 * chega ao fim prova que o caminho de visão funciona neste aparelho.
 */
export async function endVisionSession(): Promise<void> {
  uncleanExits = 0;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Idem: a próxima abertura apenas contará uma morte a mais do que houve.
  }
}
