import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase do navegador.
 *
 * Existe para o site autenticar contra o MESMO diretório de identidade do app.
 * Sem isto as contas não se vinculam: o site usa Auth.js (tabela `User` do
 * Prisma) e o app usa Supabase Auth (`auth.users`) — são dois sistemas
 * diferentes no mesmo Postgres, e um pagamento feito sob a identidade do site
 * nunca encontraria o usuário do app.
 *
 * Auth.js continua cuidando do funil e do conteúdo do site. Só o fluxo de
 * assinatura fala Supabase, porque é ele que precisa casar com o app.
 *
 * A anon key é publicável por design: identifica o projeto, não autoriza nada.
 * Quem autoriza é o RLS, no banco.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Falha alto no boot em vez de dar erro obscuro no primeiro login.
    throw new Error(
      "Supabase não configurado no site. Defina NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY em apps/website/.env.local — os mesmos " +
        "valores usados em apps/mobile/.env, senão as contas não se vinculam.",
    );
  }

  return createBrowserClient(url, anonKey);
}
