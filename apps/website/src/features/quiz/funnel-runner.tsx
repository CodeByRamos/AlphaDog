"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AlphaDogMark } from "@/components/brand/logo";
import { saveQuizAnswers, startQuizSession } from "@/server/actions/quiz";
import {
  getFirstStepKey,
  getNextStepKey,
  getPrevStepKey,
  getProgress,
  getResumeStepKey,
  getStepByKey,
} from "./engine";
import { stepRegistry } from "./step-registry";
import type { Answers, AnswerValue } from "./types";

const STORAGE_KEY = "alphadog:quiz";

type FunnelState = {
  answers: Answers;
  stepKey: string;
  /** Falso até o cliente restaurar o sessionStorage — evita gravar por cima. */
  hydrated: boolean;
};

const initialState = (): FunnelState => ({
  answers: {},
  stepKey: getFirstStepKey(),
  hydrated: false,
});

/**
 * Roda o funil inteiro no cliente.
 *
 * A navegação é local (sem round-trip por passo) para que cada toque responda
 * na hora — é o que faz um questionário de 40 passos não parecer um formulário.
 * A persistência acontece em segundo plano; se falhar, o usuário nem percebe,
 * porque o sessionStorage já garante a retomada.
 */
export function FunnelRunner({ utmSource }: { utmSource?: string }) {
  const router = useRouter();
  const [state, setState] = useState<FunnelState>(initialState);
  const { answers, stepKey, hydrated } = state;
  const pending = useRef<Answers>({});

  /**
   * Espelho das respostas sempre atual.
   *
   * Um passo de escolha única chama `onAnswer` e `onNext` no mesmo handler, e
   * nesse instante o `answers` do closure ainda é o anterior. Como `showWhen`
   * decide o próximo passo a partir da resposta recém-dada, ler do state daria
   * a decisão errada.
   */
  const answersRef = useRef<Answers>(answers);

  const setStepKey = useCallback(
    (key: string) => setState((s) => ({ ...s, stepKey: key })),
    [],
  );

  /**
   * Retomada. Só roda no cliente, porque sessionStorage não existe no servidor
   * — por isso é um efeito e não um inicializador de estado: ler no primeiro
   * render quebraria a hidratação. É uma única atualização, não uma cascata.
   */
  useEffect(() => {
    void startQuizSession(utmSource);

    let saved: Answers | null = null;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw) as Answers;
    } catch {
      // sessionStorage indisponível (modo privado): segue do zero.
    }

    if (saved) answersRef.current = saved;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- restauração pós-hidratação: sessionStorage não existe no servidor, então ler no inicializador quebraria a hidratação. Roda uma vez, numa atualização só.
    setState(
      saved
        ? { answers: saved, stepKey: getResumeStepKey(saved), hydrated: true }
        : (s) => ({ ...s, hydrated: true }),
    );
  }, [utmSource]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch {
      // Sem persistência local: o funil ainda funciona nesta aba.
    }
  }, [answers, hydrated]);

  // Agrupa gravações para não disparar uma action por clique.
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      if (Object.keys(pending.current).length === 0) return;
      const batch = pending.current;
      pending.current = {};
      void saveQuizAnswers(batch);
    }, 900);
    return () => clearTimeout(timer);
  }, [answers, hydrated]);

  const handleAnswer = useCallback((key: string, value: AnswerValue) => {
    pending.current[key] = value;
    answersRef.current = { ...answersRef.current, [key]: value };
    setState((s) => ({ ...s, answers: answersRef.current }));
  }, []);

  const goNext = useCallback(
    (fromKey: string) => {
      const next = getNextStepKey(fromKey, answersRef.current);
      if (next) {
        setStepKey(next);
        window.scrollTo({ top: 0 });
        return;
      }
      // Fim do funil: a oferta é território da Fase 4.
      router.push("/oferta");
    },
    [router, setStepKey],
  );

  const goBack = useCallback(() => {
    const prev = getPrevStepKey(stepKey, answersRef.current);
    if (prev) setStepKey(prev);
    else router.push("/");
  }, [stepKey, router, setStepKey]);

  const step = getStepByKey(stepKey);
  if (!step) return null;

  const StepView = stepRegistry[step.type];
  const progress = getProgress(stepKey, answers);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-ink-100 bg-bone/90 sticky top-0 z-10 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-lg items-center gap-3 px-5">
          <button
            type="button"
            onClick={goBack}
            aria-label="Voltar"
            className="text-ink-500 hover:bg-ink-100 hover:text-ink-900 rounded-field -ml-2 inline-flex size-10 items-center justify-center transition-colors"
          >
            <ArrowLeft className="size-5" />
          </button>

          <AlphaDogMark className="text-ink-900 size-6" />

          <div className="flex-1">
            <div
              role="progressbar"
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progresso do questionário"
              className="bg-ink-100 h-1.5 overflow-hidden rounded-full"
            >
              <div
                className="bg-alpha-500 h-full rounded-full transition-[width] duration-300 ease-[var(--ease-out-quart)]"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          <span className="text-ink-400 w-12 text-right text-xs font-semibold tabular-nums">
            {progress.answered}/{progress.total}
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-start px-5 py-10 sm:py-14">
        <StepView
          key={step.key}
          step={step}
          value={answers[step.key]}
          answers={answers}
          onAnswer={(value: AnswerValue) => handleAnswer(step.key, value)}
          onNext={() => goNext(step.key)}
        />
      </main>
    </div>
  );
}
