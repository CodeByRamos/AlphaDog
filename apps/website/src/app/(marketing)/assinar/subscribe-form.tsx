"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { checkPaymentStatus, startCheckout } from "@/features/billing/actions";
import { activePlans, formatBRL, getPlan, type PlanId } from "@/features/billing/pricing";
import type { PaymentStatus } from "@/features/billing/syncpay/events";
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
 *
 * O tutor NUNCA fica sem retorno. Cada etapa tem estado próprio na tela:
 * autenticando, gerando o PIX, aguardando o pagamento, confirmado, recusado.
 * Tela parada sem explicação, num fluxo em que a pessoa acabou de transferir
 * dinheiro, é o que gera chamado e pedido de estorno.
 */

type Step = "auth" | "plan" | "pix" | "done" | "failed";

/** De quanto em quanto tempo perguntamos se o PIX caiu. */
const POLL_MS = 3_000;
/** Depois disso paramos de perguntar sozinhos e oferecemos o botão. */
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

function maskCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function SubscribeForm({ initialPlan }: { initialPlan?: PlanId }) {
  const [supabase] = useState(() => createClient());
  const [step, setStep] = useState<Step>("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Respeita o plano escolhido no fim do quiz: fazer o tutor decidir a mesma
  // coisa duas vezes é onde funil perde gente.
  const [planId, setPlanId] = useState<PlanId>(initialPlan ?? "trimestral");
  const [cpf, setCpf] = useState("");

  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pix, setPix] = useState<{ copyPaste: string; qrCodeBase64?: string } | null>(null);
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [pollExpired, setPollExpired] = useState(false);

  // Já logado? Pula direto para a escolha do plano.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? "");
        setStep((s) => (s === "auth" ? "plan" : s));
      }
    });
  }, [supabase]);

  const poll = useCallback(async () => {
    if (!paymentId) return;
    const result = await checkPaymentStatus(paymentId);
    if (!result.status) return;

    setStatus(result.status);
    if (result.status === "paid") setStep("done");
    if (result.status === "failed" || result.status === "canceled") setStep("failed");
  }, [paymentId]);

  /**
   * Acompanhamento do pagamento.
   *
   * Quem confirma é o postback da SyncPay, gravado no nosso banco; esta tela só
   * lê o resultado. Perguntar direto ao gateway a cada três segundos, por aba
   * aberta, multiplicaria chamadas à API do parceiro sem ganhar nada.
   *
   * O laço tem fim: quinze minutos. PIX que não caiu nesse tempo provavelmente
   * não vai cair, e deixar o navegador consultando para sempre gasta bateria de
   * quem esqueceu a aba aberta.
   */
  const startedAt = useRef(0);
  useEffect(() => {
    if (step !== "pix" || !paymentId) return;

    startedAt.current = Date.now();
    const id = setInterval(() => {
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        setPollExpired(true);
        clearInterval(id);
        return;
      }
      void poll();
    }, POLL_MS);

    return () => clearInterval(id);
  }, [step, paymentId, poll]);

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

    const result = await startCheckout({ planId, cpf });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      if (result.code === "unauthenticated") setStep("auth");
      return;
    }

    setPaymentId(result.paymentId);
    setPix(result.pix);
    setStatus("pending");
    setPollExpired(false);
    setStep("pix");
  }

  async function copyCode() {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.copyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // ------------------------------------------------------------------ auth

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
        <p className="text-ink-500 bg-bone rounded-xl p-3 text-sm">
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
          {mode === "signin" ? "Ainda não tem conta? Criar agora" : "Já tem conta? Entrar"}
        </button>
      </form>
    );
  }

  // ------------------------------------------------------------- confirmado

  if (step === "done") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          ✓
        </div>
        <h3 className="font-display text-2xl font-extrabold">Pagamento confirmado</h3>
        <p className="text-ink-600">
          O acesso de <strong>{email}</strong> já está liberado. Abra o AlphaDog
          no celular com essa mesma conta.
        </p>
        <Button size="lg" className="w-full" asChild>
          <a href="/baixar">Baixar o aplicativo</a>
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------- recusado

  if (step === "failed") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
          !
        </div>
        <h3 className="font-display text-2xl font-extrabold">Pagamento não concluído</h3>
        <p className="text-ink-600">
          A cobrança foi cancelada ou recusada. Nenhum valor foi debitado — você
          pode gerar um novo PIX agora.
        </p>
        <Button size="lg" className="w-full" onClick={() => setStep("plan")}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------------- pix

  if (step === "pix" && pix) {
    return (
      <div className="space-y-5 text-center">
        <div>
          <h3 className="font-display text-xl font-extrabold">Pague com PIX</h3>
          <p className="text-ink-500 text-sm">
            {formatBRL(getPlan(planId).listPriceCents)} · {getPlan(planId).name}
          </p>
        </div>

        {pix.qrCodeBase64 ? (
          <Image
            src={
              pix.qrCodeBase64.startsWith("data:")
                ? pix.qrCodeBase64
                : `data:image/png;base64,${pix.qrCodeBase64}`
            }
            alt="QR Code do PIX"
            width={220}
            height={220}
            unoptimized
            className="mx-auto rounded-xl"
          />
        ) : null}

        <div className="space-y-2">
          <p className="text-ink-500 text-sm">Ou copie o código:</p>
          <code className="bg-bone block max-h-24 overflow-y-auto rounded-lg p-3 text-left text-xs break-all">
            {pix.copyPaste}
          </code>
          <Button variant="outline" className="w-full" onClick={copyCode}>
            {copied ? "Código copiado ✓" : "Copiar código"}
          </Button>
        </div>

        {/* Estado vivo. A pessoa acabou de transferir dinheiro — deixá-la
            olhando uma tela estática é o que gera chamado e pedido de estorno. */}
        <div className="border-ink-100 rounded-xl border p-4">
          {status === "processing" ? (
            <p className="text-ink-600 text-sm">
              <span className="inline-block animate-pulse">●</span> Pagamento
              recebido, confirmando com o banco…
            </p>
          ) : pollExpired ? (
            <div className="space-y-2">
              <p className="text-ink-600 text-sm">Ainda não identificamos o pagamento.</p>
              <Button variant="outline" size="sm" onClick={() => void poll()}>
                Verificar agora
              </Button>
            </div>
          ) : (
            <p className="text-ink-600 text-sm">
              <span className="inline-block animate-pulse">●</span> Aguardando o
              pagamento. A tela avisa sozinha quando cair.
            </p>
          )}
        </div>

        <p className="text-ink-500 text-xs">
          Pode fechar esta página: o acesso libera no aplicativo assim que o PIX
          for compensado.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------------ plano

  const plan = getPlan(planId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ink-500">Assinando como</span>
        <strong className="text-ink-900">{email}</strong>
      </div>

      <div className="space-y-3">
        <p className="text-ink-700 text-sm font-semibold">Escolha o plano</p>
        {activePlans.map((p) => (
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
              <p className="text-ink-500 text-xs">{p.description}</p>
              {p.badge && <p className="text-alpha-700 text-xs font-bold">{p.badge}</p>}
            </div>
            <div className="text-right">
              <p className="font-display font-extrabold">{formatBRL(p.listPriceCents)}</p>
              <p className="text-ink-500 text-xs">
                {formatBRL(Math.round(p.listPriceCents / p.days))}/dia
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* A SyncPay exige CPF para emitir a cobrança PIX. */}
      <div className="space-y-1">
        <label htmlFor="cpf" className="text-ink-700 text-sm font-semibold">
          CPF
        </label>
        <input
          id="cpf"
          value={cpf}
          onChange={(e) => setCpf(maskCpf(e.target.value))}
          className="border-ink-200 focus:border-alpha-500 w-full rounded-xl border px-4 py-3 outline-none"
          placeholder="000.000.000-00"
          inputMode="numeric"
          autoComplete="off"
        />
        <p className="text-ink-500 text-xs">
          Exigido para emitir a cobrança PIX em seu nome.
        </p>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <Button size="lg" className="w-full" onClick={handleCheckout} disabled={busy}>
        {busy ? "Gerando PIX..." : `Assinar — ${formatBRL(plan.listPriceCents)}`}
      </Button>

      <p className="text-ink-500 text-center text-xs">
        Pagamento único por período. Sem débito automático: avisamos antes de
        vencer para você renovar se quiser.
      </p>
    </div>
  );
}
