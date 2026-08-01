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
 *   `beginVisionSession()` grava a marca ANTES de a câmera ligar.
 *   `markVisionAlive()` apaga a marca no PRIMEIRO frame analisado com sucesso.
 *   `endVisionSession()` apaga a marca quando a tela fecha normalmente.
 *
 * O primeiro frame é o que realmente importa, e a primeira versão desta trava
 * não o observava — apagava a marca só no desmonte. Isso punia o inocente: o
 * tutor que sai do app pelo botão de recentes, ou o Android recuperando memória
 * em segundo plano, contavam como falha. Duas dessas e o reconhecimento
 * desligava sozinho, com tudo funcionando.
 *
 * Um frame analisado prova que o caminho nativo inteiro sobreviveu: conversão
 * de pixels, inferência e volta para o JavaScript. Depois disso nada mais conta
 * contra. A janela que a trava observa passa a ser só aquela em que a falha
 * realmente acontece — entre ligar a câmera e o primeiro resultado.
 *
 * Duas mortes, e não uma: a primeira pode ser o sistema sem memória ou a
 * bateria acabando. Duas seguidas, sem um único frame analisado no meio, é
 * padrão.
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

async function clear(): Promise<void> {
  uncleanExits = 0;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // A próxima abertura apenas contará uma morte a mais do que houve.
  }
}

/**
 * Um frame foi analisado do começo ao fim.
 *
 * Conversão de pixels, inferência e retorno ao JavaScript: o caminho nativo
 * inteiro sobreviveu. É a prova mais forte disponível, e é o que zera a
 * contagem. Chamada a cada detecção, mas o trabalho acontece uma vez só.
 */
export function markVisionAlive(): void {
  if (uncleanExits === 0 && loaded) return;
  loaded = true;
  void clear();
}

/**
 * A tela de treino fechou por vontade do usuário.
 *
 * Também zera: o processo chegou vivo até o desmonte. Cobre a sessão curta
 * demais para produzir um frame — sem isso, abrir e fechar o treino duas vezes
 * seguidas desligaria o reconhecimento sem nenhuma falha ter acontecido.
 */
export async function endVisionSession(): Promise<void> {
  await clear();
}
