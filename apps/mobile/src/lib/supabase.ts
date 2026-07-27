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
const extra = Constants.expoConfig?.extra ?? {};
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? (extra.supabaseUrl as string | undefined);
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? (extra.supabaseAnonKey as string | undefined);

if (!url || !anonKey) {
  // Falha alto no boot em vez de dar erro obscuro na primeira query.
  //
  // A mensagem cita as duas origens de propósito. Em desenvolvimento as chaves
  // vêm do .env local; num APK elas precisam estar no EAS, porque o .env é
  // gitignored e o build acontece a partir do git — foi assim que o primeiro
  // build de produção saiu sem chave nenhuma e travou no splash.
  throw new Error(
    "Supabase não configurado.\n\n" +
      "Em desenvolvimento: defina EXPO_PUBLIC_SUPABASE_URL e " +
      "EXPO_PUBLIC_SUPABASE_ANON_KEY em apps/mobile/.env\n\n" +
      "Em build (APK/AAB): as variáveis precisam estar no EAS —\n" +
      "  eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value ... --environment production\n\n" +
      "O .env não vai para o build: ele é ignorado pelo git, e o EAS compila a " +
      "partir do repositório.",
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    // AsyncStorage: é o que dá sessão persistente entre aberturas do app.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No mobile não há URL de callback com token — isso é coisa de web.
    detectSessionInUrl: false,
  },
});
