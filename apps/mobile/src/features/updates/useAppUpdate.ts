import * as Updates from "expo-updates";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * Atualização sem loja.
 *
 * Distribuindo o APK direto pelo site, ninguém recebe atualização sozinho: o
 * usuário instala uma vez e fica naquela versão para sempre. Em poucos meses
 * existiriam cinco versões diferentes em campo e nenhum jeito de saber qual bug
 * pertence a qual.
 *
 * O EAS Update resolve isso para tudo que é JavaScript — tela, texto, lógica,
 * correção de bug. Só dependência nativa nova exige APK novo.
 *
 * A aplicação NÃO é forçada. O download acontece em segundo plano e a troca
 * espera o usuário aceitar: reiniciar o app no meio de uma sessão de treino
 * perderia as repetições que o tutor acabou de fazer com o cão.
 */

export type UpdateState = {
  /** Há uma atualização baixada e pronta para aplicar. */
  ready: boolean;
  /** Buscando ou baixando agora. */
  checking: boolean;
  /** Reinicia aplicando a versão nova. */
  apply: () => Promise<void>;
};

export function useAppUpdate(): UpdateState {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    // Em desenvolvimento o bundle vem do Metro; procurar atualização aqui só
    // gera ruído no console.
    if (__DEV__ || !Updates.isEnabled) return;

    try {
      setChecking(true);
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        setReady(true);
      }
    } catch {
      // Sem rede, servidor fora, build sem canal: nada disso é erro do usuário
      // e nenhum deles pode interromper o uso do app.
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();

    // Verifica de novo quando o app volta do segundo plano — é quando a maioria
    // das sessões começa, e o momento mais barato para trocar de versão.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => sub.remove();
  }, [check]);

  const apply = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // Se a troca falhar, o app continua rodando a versão atual — que
      // funciona. Melhor isso que travar numa tela de erro.
      setReady(false);
    }
  }, []);

  return { ready, checking, apply };
}
