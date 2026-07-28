/**
 * Babel do app.
 *
 * Precisa existir. Sem este arquivo o plugin de worklets não roda, e o
 * Reanimated 4 depende dele para transformar as funções marcadas com
 * `"worklet"` em código que a thread de UI consegue executar. O sintoma é
 * cruel: em desenvolvimento o Metro aplica um padrão que mascara a falta, e o
 * app funciona; no build de produção o mesmo código trava na tela de abertura,
 * sem erro, sem log, sem pista. Foi exatamente o que aconteceu aqui.
 *
 * O plugin de worklets tem que ser o ÚLTIMO da lista. Ele reescreve funções que
 * outros plugins podem ter acabado de gerar; rodar antes deles deixa worklet
 * sem transformar.
 */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Vem do react-native-worklets, que o Reanimated 4 usa por baixo — não do
      // pacote do Reanimated, como era nas versões 2 e 3.
      "react-native-worklets/plugin",
    ],
  };
};
