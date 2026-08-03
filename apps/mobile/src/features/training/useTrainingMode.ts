import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

/**
 * Quem julga o acerto: a IA ou o tutor.
 *
 * O padrão continua sendo `auto` — nada do comportamento existente muda para
 * quem não tocar nesta opção. Ela existe por dois motivos práticos:
 *
 * 1. Enquanto a IA procura o cão, a tela mostra a mira e o treino ainda não
 *    começou. Se o modelo não encontrar o animal — luz ruim, cão de costas,
 *    ângulo fechado — o tutor fica parado numa tela de espera, sem botão para
 *    tocar. O modo manual é a porta de saída dessa espera.
 *
 * 2. Nem todo treino quer câmera analisando. Sessão curta no corredor, cão
 *    agitado, bateria acabando: às vezes o tutor só quer contar as repetições.
 *
 * A escolha fica gravada porque é preferência, não circunstância: quem treina
 * no manual hoje provavelmente treina no manual amanhã, e perguntar de novo a
 * cada sessão seria transformar uma decisão em incômodo.
 */

export type TrainingMode = "auto" | "manual";

const KEY = "alphadog.training.mode.v1";

export function useTrainingMode() {
  // Começa em `auto` para não atrasar a câmera esperando o disco. Se a
  // preferência gravada for `manual`, ela chega alguns milissegundos depois e
  // corrige — e a leitura só serve para desligar a análise, nunca para ligá-la
  // sem o tutor pedir.
  const [mode, setModeState] = useState<TrainingMode>("auto");

  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (alive && saved === "manual") setModeState("manual");
      })
      .catch(() => {
        // Sem armazenamento, segue no padrão. Preferência perdida é irritação;
        // erro na tela de treino é sessão perdida.
      });
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useCallback((next: TrainingMode) => {
    setModeState(next);
    void AsyncStorage.setItem(KEY, next).catch(() => {});
  }, []);

  return { mode, setMode };
}
