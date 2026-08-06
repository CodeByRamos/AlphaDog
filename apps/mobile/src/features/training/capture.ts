import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { Camera } from "react-native-vision-camera";

/**
 * Tira a foto e devolve em base64, já reduzida.
 *
 * A REDUÇÃO NÃO É DETALHE — é o que torna o recurso viável em rede móvel
 * brasileira e o que segura o custo por análise:
 *
 * - Uma foto de celular moderno tem 8 a 12 MB. Em 4G ruim, subir isso leva
 *   mais tempo que o cão fica na posição.
 * - Modelos de visão cobram por tokens de imagem, e o número de tokens cresce
 *   com a resolução. Uma foto em resolução máxima custa várias vezes mais que
 *   uma de 1024px — sem melhorar a resposta, porque "o quadril está no chão?"
 *   não precisa de detalhe fotográfico.
 *
 * 1024px no lado maior é o ponto em que a postura do cão continua nítida e o
 * arquivo cai para algumas centenas de kilobytes.
 */

/** Lado maior da imagem enviada, em pixels. */
const MAX_DIMENSION = 1024;

/**
 * Compressão JPEG.
 *
 * 0,7 é o ponto onde o artefato ainda não aparece em silhueta e contorno — que
 * é tudo que a avaliação usa. Acima disso o arquivo cresce sem mudar a resposta.
 */
const JPEG_QUALITY = 0.7;

/**
 * Captura e prepara a imagem.
 *
 * Devolve `null` em qualquer falha, em vez de lançar: a tela de treino trata
 * ausência de foto como "tente de novo", e uma exceção subindo daqui derrubaria
 * a sessão inteira por causa de um toque no botão.
 */
export async function capturePhotoAsBase64(camera: Camera): Promise<string | null> {
  try {
    const photo = await camera.takePhoto({
      // Sem flash: dispara na cara do cão, assusta, e desfaz a posição que o
      // tutor levou meio minuto para conseguir.
      flash: "off",
      // A prioridade é o instante certo, não o pixel perfeito — o cão não
      // espera o obturador.
      enableShutterSound: false,
    });

    const source = photo.path.startsWith("file://") ? photo.path : `file://${photo.path}`;

    const resized = await manipulateAsync(
      source,
      [{ resize: { width: MAX_DIMENSION } }],
      { compress: JPEG_QUALITY, format: SaveFormat.JPEG, base64: true },
    );

    if (!resized.base64) {
      console.log("[AlphaDog] redimensionamento não devolveu base64");
      return null;
    }

    console.log(
      `[AlphaDog] foto pronta: ${resized.width}x${resized.height}, ` +
        `${Math.round((resized.base64.length * 3) / 4 / 1024)} KB`,
    );

    return resized.base64;
  } catch (error) {
    console.log(`[AlphaDog] falha ao capturar foto: ${String(error)}`);
    return null;
  }
}
