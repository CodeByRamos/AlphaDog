"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createCharge } from "./asaas";
import { getPlan, type PlanId } from "./pricing";
import type { CheckoutSession, PaymentMethod } from "./payment-methods";

/**
 * Criação de cobrança, no servidor.
 *
 * Duas regras que não podem sair daqui:
 *
 * 1. O USUÁRIO VEM DA SESSÃO, nunca do formulário. Se o `userId` chegasse pelo
 *    corpo da requisição, qualquer um poderia pagar R$ 1 no próprio cartão
 *    passando o id de outra pessoa — ou pior, gerar cobrança em nome de terceiro.
 *    A sessão do Supabase é a única fonte de identidade aceita.
 *
 * 2. O VALOR VEM DO CATÁLOGO, nunca do cliente. O navegador manda o `planId`;
 *    o preço é resolvido aqui contra `PLANS`. Aceitar `amountCents` do cliente
 *    seria deixar o usuário escolher quanto pagar.
 */

type Result =
  | { ok: true; session: CheckoutSession }
  | { ok: false; error: string };

async function currentUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // Server action não renova cookie; a sessão é gerida no cliente.
        setAll: () => {},
      },
    },
  );

  // getUser() valida o token contra o servidor do Supabase. getSession() leria
  // do cookie sem verificar — e cookie é coisa que o cliente controla.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function startCheckout(input: {
  planId: PlanId;
  method: PaymentMethod;
  taxId?: string;
}): Promise<Result> {
  const user = await currentUser();
  if (!user) {
    return { ok: false, error: "Entre na sua conta para assinar." };
  }

  let plan;
  try {
    plan = getPlan(input.planId);
  } catch {
    return { ok: false, error: "Plano inválido." };
  }

  try {
    const session = await createCharge({
      userId: user.id,
      email: user.email!,
      // O nome é opcional no cadastro do app; o Asaas exige algum.
      name: (user.user_metadata?.name as string | undefined) ?? user.email!.split("@")[0]!,
      taxId: input.taxId,
      planId: plan.id,
      method: input.method,
      amountCents: plan.listPriceCents,
    });

    return { ok: true, session };
  } catch (error) {
    // A mensagem do gateway pode conter detalhe interno; não vai para a tela.
    console.error("[checkout] falha ao criar cobrança", error);
    return {
      ok: false,
      error: "Não conseguimos gerar a cobrança agora. Tente de novo em instantes.",
    };
  }
}
