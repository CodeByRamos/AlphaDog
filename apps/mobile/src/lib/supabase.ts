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
  throw new Error(
    "Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e " +
      "EXPO_PUBLIC_SUPABASE_ANON_KEY em apps/mobile/.env — ver docs/PENDENCIAS.md",
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
