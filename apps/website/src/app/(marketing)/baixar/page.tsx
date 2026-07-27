import type { Metadata } from "next";
import Link from "next/link";
import { Download, ShieldCheck, Smartphone, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Baixar o AlphaDog para Android",
  description:
    "Instale o aplicativo AlphaDog no seu celular Android e treine seu cão com sessões guiadas de 10 minutos.",
  alternates: { canonical: "/baixar" },
};

/**
 * Download do APK.
 *
 * Deliberadamente PÚBLICO, sem exigir login ou assinatura. Esconder o APK seria
 * esforço sem proteção: o arquivo não contém acesso nenhum — quem instalar
 * ainda precisa de uma conta com assinatura ativa, e essa regra é aplicada pelo
 * banco (RLS), não pelo aplicativo. Compartilhar o APK é inofensivo.
 *
 * Deixar aberto tem ganho real: a pessoa instala, vê o produto, esbarra no
 * paywall e decide. É melhor funil que um download trancado.
 *
 * A URL do arquivo vem de variável de ambiente porque muda a cada versão
 * publicada, e não deve exigir deploy do site para ser atualizada.
 */
const APK_URL = process.env.NEXT_PUBLIC_APK_URL;
const APK_VERSION = process.env.NEXT_PUBLIC_APK_VERSION ?? "0.1.0";

const STEPS = [
  {
    title: "Baixe o arquivo",
    body: "Toque no botão acima. O download tem cerca de 60 MB e leva alguns segundos no Wi-Fi.",
  },
  {
    title: "Permita a instalação",
    body: "O Android vai avisar que o arquivo veio de fora da Play Store. Toque em “Configurações” e ative a permissão para o seu navegador. Isso é normal em aplicativos distribuídos direto pelo desenvolvedor.",
  },
  {
    title: "Instale e abra",
    body: "Toque em “Instalar” e depois em “Abrir”. Crie sua conta com o mesmo e-mail que você usou (ou vai usar) na assinatura.",
  },
];

export default function BaixarPage() {
  return (
    <Section className="bg-bone">
      <Container>
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <p className="text-alpha-700 text-sm font-bold tracking-[0.12em] uppercase">
              Android
            </p>
            <h1 className="mt-4 text-3xl sm:text-4xl">Baixe o AlphaDog</h1>
            <p className="text-ink-500 mt-4 leading-relaxed">
              Instale no seu celular e comece a treinar hoje. Dez minutos por
              dia, com o plano montado para o seu cão.
            </p>
          </div>

          <div className="shadow-card border-ink-100 mt-10 rounded-2xl border bg-white p-6 text-center sm:p-8">
            {APK_URL ? (
              <>
                <Button asChild size="lg" className="w-full sm:w-auto">
                  {/* Sem prefetch nem SPA nav: é um arquivo, não uma rota. */}
                  <a href={APK_URL} download>
                    <Download className="mr-2 size-5" />
                    Baixar para Android
                  </a>
                </Button>
                <p className="text-ink-500 mt-3 text-sm">
                  Versão {APK_VERSION} · Android 8.0 ou superior
                </p>
              </>
            ) : (
              // Sem URL configurada, dizer a verdade em vez de oferecer um botão
              // que não baixa nada.
              <div className="text-ink-500">
                <Smartphone className="text-ink-300 mx-auto size-10" />
                <p className="mt-3 font-semibold">O download estará disponível em breve</p>
                <p className="mt-1 text-sm">
                  Estamos finalizando esta versão. Volte em instantes.
                </p>
              </div>
            )}
          </div>

          {/* O aviso do Android assusta quem nunca instalou fora da loja. Explicar
              antes evita a desistência no meio da instalação. */}
          <div className="border-alpha-200 bg-alpha-50/60 mt-6 flex gap-3 rounded-xl border p-4">
            <TriangleAlert className="text-alpha-600 mt-0.5 size-5 shrink-0" />
            <div className="text-sm">
              <p className="text-ink-900 font-semibold">
                O Android vai avisar sobre “fonte desconhecida”
              </p>
              <p className="text-ink-600 mt-1 leading-relaxed">
                É o aviso padrão para qualquer app instalado fora da Play Store —
                não indica problema com o arquivo. Basta permitir a instalação
                pelo seu navegador quando ele perguntar.
              </p>
            </div>
          </div>

          <ol className="mt-10 space-y-5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="bg-alpha-500 text-ink-900 font-display flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold">
                  {i + 1}
                </span>
                <div>
                  <p className="font-display text-ink-900 font-bold">{step.title}</p>
                  <p className="text-ink-500 mt-1 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="border-ink-100 mt-10 flex gap-3 rounded-xl border bg-white p-5">
            <ShieldCheck className="text-sage-500 mt-0.5 size-5 shrink-0" />
            <div className="text-sm">
              <p className="text-ink-900 font-semibold">Atualizações automáticas</p>
              <p className="text-ink-600 mt-1 leading-relaxed">
                Você instala uma vez. As melhorias chegam sozinhas ao abrir o
                app, sem precisar baixar de novo.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-ink-500">
              Ainda não tem assinatura? O app precisa de uma para liberar os
              treinos.
            </p>
            <Button asChild variant="outline" className="mt-3">
              <Link href={routes.subscribe}>Ver planos</Link>
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
