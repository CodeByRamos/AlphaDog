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
const extra = Constants.expoConfig?.extra ?? {};
const url = (extra.supabaseUrl as string) ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = (extra.supabaseAnonKey as string) ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
