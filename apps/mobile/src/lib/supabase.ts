import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import "react-native-url-polyfill/auto";
import type { Database } from "./database.types";

/**
 * Cliente Supabase.
 *
 * A anon key é publicável por design — ela identifica o projeto, não autoriza
 * nada. Quem autoriza é o RLS, que roda no banco. Por isso ela pode viver no
 * bundle do app: mesmo extraída, só faz o que as políticas permitem.
 *
 * A service_role key é o oposto e NUNCA pode entrar aqui: ela ignora RLS.
 */
// EXPO_PUBLIC_* são substituídas pelo valor real dentro do bundle pelo Metro, a
// partir do .env — é a fonte primária e a que funciona em runtime no aparelho.
//
// O `extra` do app.json é só um fallback, e NÃO pode ser lido primeiro: o
// app.json é JSON estático e não interpola `${...}`, então `extra.supabaseUrl`
// vinha como o texto literal "${EXPO_PUBLIC_SUPABASE_URL}" — uma string não-nula
// que passava no `??` e quebrava o cliente com "Invalid supabaseUrl". Ler do
// process.env primeiro elimina isso.
/**
 * Limpa o que costuma vir junto do valor.
 *
 * Arquivos .env guardam `CHAVE="valor"`, e as aspas fazem parte da LINHA, não
 * do valor — leitores de .env as removem. Quem copia o valor à mão, ou por
 * script, leva as aspas junto. O resultado foi o app fechando na abertura com
 * "Invalid supabaseUrl": a URL chegava começando com `"` em vez de `h`, e o
 * cliente do Supabase recusa no carregamento do módulo.
 *
 * A barra final também sai: o supabase-js monta os endereços concatenando, e
 * `.../supabase.co//auth/v1` já causou dor de cabeça suficiente por aí.
 */
function clean(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  return trimmed || undefined;
}

const extra = Constants.expoConfig?.extra ?? {};
const url = clean(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? (extra.supabaseUrl as string | undefined),
);
const anonKey = clean(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? (extra.supabaseAnonKey as string | undefined),
);

/**
 * As chaves chegaram ao binário?
 *
 * Este módulo NÃO lança quando elas faltam, e essa decisão custou caro para ser
 * aprendida. Um `throw` aqui acontece durante o carregamento do módulo — e como
 * o layout raiz importa este arquivo (via AuthProvider), a árvore inteira falha
 * antes de qualquer componente montar. Nem o ErrorBoundary existe ainda. O
 * resultado é o pior possível: logo parado na tela de abertura, para sempre,
 * sem uma linha de explicação.
 *
 * Em vez disso o app abre, esta bandeira fica falsa e a porta de entrada mostra
 * uma tela dizendo o que houve. Erro que aparece é erro que se conserta.
 */
/**
 * Exige URL bem formada, não só presente.
 *
 * `Boolean(url)` sozinho não bastava: um valor sujo — com aspas, um espaço, um
 * caminho pela metade — passava aqui e explodia dentro do `createClient`, que
 * roda no carregamento do módulo e leva o aplicativo junto. Validar antes é o
 * que transforma "app fecha sozinho" em "tela explicando o problema".
 */
export const isSupabaseConfigured = Boolean(
  url && anonKey && /^https?:\/\/[^\s/]+/i.test(url),
);

export const SUPABASE_CONFIG_HELP =
  "As chaves do Supabase não vieram neste build.\n\n" +
  "Em desenvolvimento: defina EXPO_PUBLIC_SUPABASE_URL e " +
  "EXPO_PUBLIC_SUPABASE_ANON_KEY em apps/mobile/.env\n\n" +
  "Em build (APK/AAB): elas precisam estar no EAS, porque o .env é ignorado " +
  "pelo git e o build acontece a partir do repositório:\n" +
  "  eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value ... --environment production";

/**
 * Cliente Supabase.
 *
 * Com as chaves ausentes, criamos um cliente apontando para um endereço
 * inválido em vez de não criar nenhum: assim todo `import { supabase }` do app
 * continua resolvendo, e a falha aparece como tela de erro em vez de crash no
 * carregamento. Nenhuma requisição chega a sair — a porta de entrada barra
 * antes, olhando `isSupabaseConfigured`.
 */
export const supabase = createClient<Database>(
  // O placeholder entra sempre que a configuração não passa na validação — não
  // só quando falta. Passar uma URL suja adiante seria devolver o crash.
  isSupabaseConfigured ? url! : "https://placeholder.invalid",
  anonKey || "sem-chave",
  {
    auth: {
      // AsyncStorage: é o que dá sessão persistente entre aberturas do app.
      storage: AsyncStorage,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: true,
      // No mobile não há URL de callback com token — isso é coisa de web.
      detectSessionInUrl: false,
    },
  },
);
