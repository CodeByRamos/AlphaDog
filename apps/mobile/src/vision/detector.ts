import type { Detection } from "@alphadog/core";

/**
 * Contrato do detector de cão.
 *
 * A razão de existir: o modelo ainda não foi treinado (depende do dataset e do
 * Colab). Sem esta interface, a tela de treino nasceria acoplada ao TFLite e
 * teria de ser reescrita quando o `.tflite` chegasse.
 *
 * Com ela, trocar o detector é trocar uma linha em `useDetector`.
 */
export interface DogDetector {
  readonly name: string;

  /** Carrega o modelo. Chamado uma vez, antes do primeiro frame. */
  load(): Promise<void>;

  /**
   * Processa um frame já convertido para tensor.
   *
   * Devolve null quando não há cão no quadro — diferente de uma detecção com
   * confiança baixa, que é "tem algo, mas não sei o quê".
   */
  detect(frame: FrameInput): Detection | null;

  dispose(): void;
}

/** Frame normalizado, no formato que o modelo espera. */
export type FrameInput = {
  data: Uint8Array | Float32Array;
  width: number;
  height: number;
};

export type DetectorStatus =
  /** Ainda não carregou. */
  | { kind: "loading" }
  /** Pronto para processar frames. */
  | { kind: "ready"; detector: DogDetector }
  /**
   * Sem modelo disponível. Estado legítimo, não erro: o app roda, mostra os
   * passos do exercício e conta as repetições manualmente. O que ele NÃO faz é
   * fingir que está vendo o cão.
   */
  | { kind: "unavailable"; reason: string };
