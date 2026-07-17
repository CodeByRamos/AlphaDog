import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Sessão de autenticação.
 *
 * Context em vez de store global: a sessão é assinada pelo Supabase e o único
 * jeito de mantê-la fresca é o listener de onAuthStateChange. Colocar isso num
 * store Zustand só adicionaria uma camada entre o listener e a árvore.
 */

type AuthState = {
  session: Session | null;
  /** Falso até sabermos se há sessão salva. Evita piscar o login. */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // getSession lê do AsyncStorage: é o que faz a sessão sobreviver ao app
    // fechar.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session,
    ready,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
    },
    async signUp(email, password) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      // Com "Confirm email" ligado, o Supabase cria o usuário mas não devolve
      // sessão. O app precisa saber a diferença para mostrar a tela certa em
      // vez de travar num loading eterno.
      return { needsConfirmation: !data.session };
    },
    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}

/** Atalho para o id do usuário, quando já se sabe que há sessão. */
export function useUserId(): string {
  const { session } = useAuth();
  if (!session) throw new Error("useUserId chamado sem sessão");
  return session.user.id;
}
