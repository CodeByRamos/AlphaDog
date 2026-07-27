"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { startCheckout } from "@/features/billing/actions";
import { paymentMethods, type CheckoutSession, type PaymentMethod } from "@/features/billing/payment-methods";
import { formatBRL, plans, type PlanId } from "@/features/billing/pricing";
import { createClient } from "@/lib/supabase/client";

/**
 * Fluxo de assinatura.
 *
 * Autentica contra o Supabase — o MESMO diretório de identidade do aplicativo.
 * É isso que faz as contas se vincularem: o pagamento carrega o `user.id` do
 * Supabase, e o app lê a assinatura por esse mesmo id. Se o site autenticasse
 * pelo Auth.js (que cuida do funil), o pagamento cairia numa identidade que o
 * app nunca vê.
 *
 * Por que a assinatura acontece aqui e não no app: a Apple exige o IAP dela
 * para venda dentro do app iOS, com 15–30% de comissão. Vendendo no site, o
 * app apenas reconhece o acesso — o que a Guideline 3.1.3(b) permite.
 */

type Step = "auth" | "plan" | "paying" | "pix" | "done";

export function SubscribeForm({ initialPlan }: { initialPlan?: PlanId }) {
  const [supabase] = useState(() => createClient());
  const [step, setStep] = useState<Step>("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Respeita o plano escolhido no fim do quiz: fazer o tutor decidir a mesma
  // coisa duas vezes é onde funil perde gente.
  const [planId, setPlanId] = useState<PlanId>(initialPlan ?? "trimestral");
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [taxId, setTaxId] = useState("");
  const [session, setSession] = useState<CheckoutSession | null>(null);

  // Já logado? Pula direto para a escolha do plano.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? "");
        setStep((s) => (s === "auth" ? "plan" : s));
      }
    });
  }, [supabase]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error: authError } = await fn.call(supabase.auth, { email, password });

    setBusy(false);
    if (authError) {
      setError(
        authError.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : authError.message,
      );
      return;
    }
    setStep("plan");
  }

  async function handleCheckout() {
    setBusy(true);
    setError(null);

    const result = await startCheckout({ planId, method, taxId: taxId || undefined });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSession(result.session);
    if (result.session.pix) {
      setStep("pix");
    } else if (result.session.redirectUrl) {
      window.location.href = result.session.redirectUrl;
    } else {
      setStep("done");
    }
  }

  if (step === "auth") {
    return (
      <form onSubmit={handleAuth} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-ink-700 text-sm font-semibold">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-ink-200 focus:border-alpha-500 w-full rounded-xl border px-4 py-3 outline-none"
            placeholder="voce@email.com"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-ink-700 text-sm font-semibold">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-ink-200 focus:border-alpha-500 w-full rounded-xl border px-4 py-3 outline-none"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        {/* O ponto que faz tudo funcionar. Se o tutor assinar com um e-mail e
            entrar no app com outro, o acesso não aparece — e ele culpa o app. */}
        <p className="text-ink-500 rounded-xl bg-bone p-3 text-sm">
          Use <strong>o mesmo e-mail</strong> da sua conta no aplicativo. É por
          ele que o acesso é liberado no celular.
        </p>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Aguarde..." : mode === "signin" ? "Entrar e assinar" : "Criar conta e assinar"}
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-ink-500 hover:text-ink-900 w-full text-center text-sm"
        >
          {mode === "signin"
            ? "Ainda não tem conta? Criar agora"
            : "Já tem conta? Entrar"}
        </button>
      </form>
    );
  }

  if (step === "pix" && session?.pix) {
    return (
      <div className="space-y-4 text-center">
        <h3 className="text-xl">Escaneie para pagar</h3>
        <Image
          src={session.pix.qrCode}
          alt="QR Code do PIX"
          width={220}
          height={220}
          unoptimized
          className="mx-auto rounded-xl"
        />
        <div className="space-y-2">
          <p className="text-ink-500 text-sm">Ou copie o código:</p>
          <code className="bg-bone block overflow-x-auto rounded-lg p-3 text-left text-xs">
            {session.pix.copyPaste}
          </code>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigator.clipboard.writeText(session.pix!.copyPaste)}
          >
            Copiar código
          </Button>
        </div>
        <p className="text-ink-500 text-sm">
          Assim que o pagamento cair, o acesso libera sozinho no aplicativo.
          Pode fechar esta página.
        </p>
      </div>
    );
  }

  const plan = plans.find((p) => p.id === planId)!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ink-500">Assinando como</span>
        <strong className="text-ink-900">{email}</strong>
      </div>

      <div className="space-y-3">
        <p className="text-ink-700 text-sm font-semibold">Escolha o plano</p>
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlanId(p.id)}
            className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition ${
              p.id === planId
                ? "border-alpha-500 bg-alpha-50/50"
                : "border-ink-100 hover:border-ink-200"
            }`}
          >
            <div>
              <p className="font-display font-bold">{p.name}</p>
              {p.badge && <p className="text-alpha-700 text-xs font-bold">{p.badge}</p>}
            </div>
            <p className="font-display font-extrabold">{formatBRL(p.listPriceCents)}</p>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-ink-700 text-sm font-semibold">Forma de pagamento</p>
        <div className="grid grid-cols-2 gap-2">
          {paymentMethods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`rounded-xl border-2 p-3 text-left transition ${
                m.id === method
                  ? "border-alpha-500 bg-alpha-50/50"
                  : "border-ink-100 hover:border-ink-200"
              }`}
            >
              <p className="text-sm font-bold">{m.label}</p>
              <p className="text-ink-500 text-xs">{m.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* O Asaas exige CPF/CNPJ para emitir a cobrança. */}
      <div className="space-y-1">
        <label htmlFor="taxId" className="text-ink-700 text-sm font-semibold">
          CPF ou CNPJ
        </label>
        <input
          id="taxId"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          className="border-ink-200 focus:border-alpha-500 w-full rounded-xl border px-4 py-3 outline-none"
          placeholder="000.000.000-00"
          inputMode="numeric"
        />
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <Button size="lg" className="w-full" onClick={handleCheckout} disabled={busy}>
        {busy ? "Gerando cobrança..." : `Assinar — ${formatBRL(plan.listPriceCents)}`}
      </Button>

      <p className="text-ink-500 text-center text-xs">
        Cobrança recorrente. Cancele quando quiser; o acesso vai até o fim do
        período pago.
      </p>
    </div>
  );
}
