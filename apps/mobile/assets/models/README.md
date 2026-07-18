# Modelos de visão

Coloque aqui o modelo treinado no Colab, com **este nome exato**:

```
dogpose.tflite
```

Caminho completo: `apps/mobile/assets/models/dogpose.tflite`

## Depois de colocar o arquivo

Me avise. Ligar o modelo no app envolve, juntos e testados na mesma etapa:

1. adicionar a dependência nativa de inferência (`react-native-fast-tflite`);
2. preencher a decodificação da saída YOLO-pose em `src/vision/` (keypoints +
   bbox → `Detection`), validada contra este `.tflite` real;
3. trocar o `useDetector` para carregar o modelo em vez de `unavailable`.

Nada disso é escrito no escuro: a decodificação depende do formato exato de
saída deste arquivo, então só entra quando ele existe e dá pra testar. Até lá o
app roda com o tutor marcando o acerto — nunca com detecção simulada.

Este arquivo não é versionado (o `.tflite` é grande e é artefato de build).
```
```
