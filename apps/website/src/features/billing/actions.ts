"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getPlan, type PlanId } from "./pricing";
import {
  attachTransaction,
  createPendingPayment,
  getPaymentStatus,
} from "./subscriptions";
import { createPixCharge } from "./syncpay/charges";
import { isSyncPayConfigured, SyncPayNotConfiguredError } from "./syncpay/config";
import type { PaymentStatus } from "./syncpay/events";

/**
 * Criação de cobrança, no servidor.
 *
 * Três regras que não podem sair daqui:
 *
 * 1. O USUÁRIO VEM DA SESSÃO, nunca do formulário. Se o `userId` chegasse pelo
 *    corpo da requisição, qualquer um poderia gerar cobrança em nome de
 *    terceiro — ou liberar acesso na conta de outra pessoa pagando R$ 1.
 *
 * 2. O VALOR VEM DO CATÁLOGO, nunca do cliente. O navegador manda o `planId`;
 *    o preço é resolvido aqui contra o catálogo. Aceitar `amountCents` do
 *    cliente seria deixar o usuário escolher quanto pagar.
 *
 * 3. O REGISTRO NASCE ANTES DA COBRANÇA. O id do nosso pagamento vai como
 *    referência externa na SyncPay, e é por ele que o postback volta sabendo a
 *    quem creditar. Cobrar primeiro e registrar depois criaria dinheiro
 *    entrando sem dono.
 */

export type CheckoutResult =
  | {
      ok: true;
      paymentId: string;
      pix: { copyPaste: string; qrCodeBase64?: string };
      amountCents: number;
    }
  | { ok: false; error: string; code?: "unauthenticated" | "unavailable" };

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

/** Só dígitos. A SyncPay recusa CPF com ponto e traço. */
function digits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Validação de CPF pelos dígitos verificadores.
 *
 * Conferir só o tamanho deixaria passar `111.111.111-11`, que tem 11 dígitos e
 * não existe. CPF inválido significa cobrança recusada depois de o tutor já ter
 * preenchido tudo — melhor barrar aqui, com mensagem clara.
 */
function isValidCpf(raw: string): boolean {
  const cpf = digits(raw);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const check = (size: number) => {
    let sum = 0;
    for (let i = 0; i < size; i++) sum += Number(cpf[i]) * (size + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}

/**
 * Dados que a SyncPay exige, e que a documentação dela não diz que exige.
 *
 * A API respondeu 422 listando telefone e TODOS os campos de endereço como
 * obrigatórios. Por isso eles são obrigatórios aqui também: descobrir isso no
 * meio do checkout de um cliente real seria descobrir tarde.
 */
export type CheckoutAddress = {
  zipCode: string;
  street: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
};

export async function startCheckout(input: {
  planId: PlanId;
  cpf: string;
  phone: string;
  address: CheckoutAddress;
  name?: string;
}): Promise<CheckoutResult> {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false,
      code: "unauthenticated",
      error: "Entre na sua conta para assinar.",
    };
  }

  if (!isSyncPayConfigured()) {
    return {
      ok: false,
      code: "unavailable",
      error: "O pagamento está temporariamente indisponível. Tente novamente em instantes.",
    };
  }

  if (!isValidCpf(input.cpf)) {
    return { ok: false, error: "CPF inválido. Confira os números e tente de novo." };
  }

  // Telefone brasileiro: 10 dígitos (fixo) ou 11 (celular), com DDD.
  const phone = digits(input.phone);
  if (phone.length < 10 || phone.length > 11) {
    return { ok: false, error: "Telefone inválido. Inclua o DDD." };
  }

  const zipCode = digits(input.address.zipCode);
  if (zipCode.length !== 8) {
    return { ok: false, error: "CEP inválido." };
  }

  // Cada campo é conferido separado porque a SyncPay recusa a cobrança inteira
  // se qualquer um faltar, e um erro genérico deixaria o tutor adivinhando qual.
  const missing = (
    [
      ["rua", input.address.street],
      ["número", input.address.streetNumber],
      ["bairro", input.address.neighborhood],
      ["cidade", input.address.city],
      ["estado", input.address.state],
    ] as const
  ).find(([, value]) => !value?.trim());

  if (missing) {
    return { ok: false, error: `Preencha o campo ${missing[0]} do endereço.` };
  }

  let plan;
  try {
    plan = getPlan(input.planId);
  } catch {
    return { ok: false, error: "Plano inválido." };
  }

  if (plan.status !== "active") {
    return { ok: false, error: "Este plano não está mais disponível." };
  }

  let paymentId: string;
  try {
    paymentId = await createPendingPayment({
      userId: user.id,
      planId: plan.id,
      amountCents: plan.listPriceCents,
      method: "pix",
    });
  } catch (error) {
    console.error("[checkout] falha ao registrar pagamento", error);
    return { ok: false, error: "Não conseguimos iniciar o pagamento agora. Tente de novo." };
  }

  try {
    const headerList = await headers();
    // O IP do cliente chega pelo cabeçalho do proxy; a SyncPay usa no antifraude.
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();

    const charge = await createPixCharge({
      reference: paymentId,
      amountCents: plan.listPriceCents,
      description: `AlphaDog — ${plan.name}`,
      customer: {
        name:
          input.name?.trim() ||
          (user.user_metadata?.name as string | undefined) ||
          user.email!.split("@")[0]!,
        email: user.email!,
        cpf: digits(input.cpf),
        phone,
        address: {
          zipCode,
          street: input.address.street.trim(),
          streetNumber: input.address.streetNumber.trim(),
          neighborhood: input.address.neighborhood.trim(),
          city: input.address.city.trim(),
          state: input.address.state.trim().toUpperCase().slice(0, 2),
          complement: input.address.complement?.trim(),
        },
      },
      ip,
    });

    await attachTransaction(paymentId, charge.transactionId);

    return {
      ok: true,
      paymentId,
      pix: { copyPaste: charge.copyPaste, qrCodeBase64: charge.qrCodeBase64 },
      amountCents: plan.listPriceCents,
    };
  } catch (error) {
    if (error instanceof SyncPayNotConfiguredError) {
      console.error("[checkout] credencial ausente", error.variable);
      return {
        ok: false,
        code: "unavailable",
        error: "O pagamento está temporariamente indisponível.",
      };
    }

    // A mensagem do gateway pode conter detalhe interno; não vai para a tela.
    console.error("[checkout] falha ao criar cobrança", error);
    return {
      ok: false,
      error: "Não conseguimos gerar o PIX agora. Tente de novo em instantes.",
    };
  }
}

/**
 * Estado do pagamento, para a tela de checkout acompanhar.
 *
 * O checkout consulta o NOSSO banco, e não a SyncPay: quem escreve ali é o
 * postback, já reconferido. Deixar a tela perguntar direto ao gateway
 * multiplicaria chamadas à API do parceiro por cada aba aberta, e ainda daria
 * ao navegador uma resposta que ele poderia falsificar para si mesmo.
 */
export async function checkPaymentStatus(
  paymentId: string,
): Promise<{ status: PaymentStatus | null }> {
  const user = await currentUser();
  if (!user) return { status: null };

  const status = await getPaymentStatus(paymentId, user.id);
  return { status };
}
