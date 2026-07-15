"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ShieldCheck, Sparkles, Stethoscope, Users } from "lucide-react";
import { AlphaDogMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { claimOffer } from "@/server/actions/offer";
import { BREEDS } from "../funnel-config";
import type { LoadingStep, ProfileStep, ScratchCardStep, StaticStep } from "../types";
import { StepShell, type StepProps } from "./shell";

const VARIANT_ICON = {
  "social-proof": Users,
  science: Sparkles,
  reviewed: Stethoscope,
  support: ShieldCheck,
  "almost-ready": Sparkles,
} as const;

export function StaticStepView({ step, onNext }: StepProps<StaticStep>) {
  const Icon = VARIANT_ICON[step.variant];

  return (
    <StepShell title={step.title}>
      <div className="flex flex-col items-center text-center">
        <span className="bg-alpha-50 text-alpha-700 mb-6 flex size-16 items-center justify-center rounded-full">
          <Icon className="size-8" />
        </span>

        <p className="text-ink-600 leading-relaxed">{step.body}</p>

        {step.bullets && (
          <ul className="mt-6 w-full space-y-3 text-left">
            {step.bullets.map((bullet) => (
              <li
                key={bullet}
                className="border-ink-100 rounded-card flex items-start gap-3 border bg-white p-4"
              >
                <Check className="text-sage-500 mt-0.5 size-5 shrink-0" />
                <span className="text-ink-700">{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        <Button size="lg" block className="mt-8" onClick={onNext}>
          {step.cta}
        </Button>
      </div>
    </StepShell>
  );
}

export function LoadingStepView({ step, onNext }: StepProps<LoadingStep>) {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const total = 4200;
    const tick = 40;
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = p + (tick / total) * 100;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        setPhase(Math.floor((next / 100) * step.phases.length));
        return next;
      });
    }, tick);

    return () => clearInterval(timer);
  }, [step.phases.length]);

  const done = progress >= 100;

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onNext, 700);
    return () => clearTimeout(t);
  }, [done, onNext]);

  return (
    <StepShell title={step.title}>
      <div className="flex flex-col items-center">
        <div className="relative mb-8 flex size-28 items-center justify-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="6"
              className="stroke-ink-100"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className="stroke-alpha-500 transition-[stroke-dashoffset] duration-100 ease-linear"
              strokeDasharray={2 * Math.PI * 45}
              strokeDashoffset={2 * Math.PI * 45 * (1 - progress / 100)}
            />
          </svg>
          <AlphaDogMark className="text-ink-900 size-10" />
        </div>

        <p aria-live="polite" className="font-display text-lg font-bold">
          {Math.round(progress)}%
        </p>

        <ul className="mt-6 w-full space-y-2.5">
          {step.phases.map((label, i) => {
            const complete = i < phase || done;
            const active = i === phase && !done;
            return (
              <li
                key={label}
                className={cn(
                  "rounded-field flex items-center gap-3 p-3 transition-colors",
                  complete && "text-ink-900",
                  active && "bg-alpha-50 text-ink-900",
                  !complete && !active && "text-ink-300",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    complete
                      ? "border-sage-500 bg-sage-500"
                      : active
                        ? "border-alpha-500 animate-pulse"
                        : "border-ink-200",
                  )}
                >
                  {complete && <Check className="size-3 text-white" strokeWidth={3} />}
                </span>
                <span className="text-sm">{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </StepShell>
  );
}

const AGE_LABEL: Record<string, string> = {
  puppy: "Filhote",
  adolescent: "Adolescente",
  adult: "Adulto",
  senior: "Idoso",
};

/** Barras derivadas das respostas — o mesmo cálculo alimenta o paywall depois. */
function scoreFromAnswers(answers: Record<string, unknown>) {
  const problems = Array.isArray(answers.problems) ? answers.problems.length : 0;
  const cues = Array.isArray(answers.cues)
    ? answers.cues.filter((c) => c !== "none").length
    : 0;

  return [
    {
      label: "Obediência",
      value: Math.min(20 + cues * 12, 90),
      target: Math.min(20 + cues * 12 + 45, 98),
    },
    {
      label: "Foco",
      value: answers.motivation_during_training === "long" ? 70 : 35,
      target: 92,
    },
    {
      label: "Comportamento",
      value: Math.max(80 - problems * 14, 20),
      target: 95,
    },
  ];
}

export function ProfileStepView({ step, answers, onNext }: StepProps<ProfileStep>) {
  const name = typeof answers.petName === "string" ? answers.petName : "seu cão";
  const breed =
    BREEDS.find((b) => b.value === answers.petBreed)?.label ?? "Raça não informada";
  const age = AGE_LABEL[String(answers.petAge)] ?? "";
  const scores = scoreFromAnswers(answers);

  return (
    <StepShell title={step.title}>
      <div className="bg-ink-900 text-bone rounded-card shadow-lift p-7">
        <div className="flex items-center gap-4">
          <span className="bg-alpha-500/15 flex size-14 items-center justify-center rounded-full">
            <AlphaDogMark className="text-alpha-500 size-8" />
          </span>
          <div>
            <p className="font-display text-2xl font-extrabold">{name}</p>
            <p className="text-ink-400 text-sm">
              {breed} · {age}
            </p>
          </div>
        </div>

        <dl className="mt-7 space-y-5">
          {scores.map((score) => (
            <div key={score.label}>
              <div className="mb-2 flex items-baseline justify-between">
                <dt className="text-ink-300 text-sm">{score.label}</dt>
                <dd className="font-display text-alpha-500 text-sm font-bold">
                  {score.value}% → {score.target}%
                </dd>
              </div>
              <div className="bg-ink-700 h-2 overflow-hidden rounded-full">
                <div
                  className="bg-alpha-500 h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-quart)]"
                  style={{ width: `${score.value}%` }}
                />
              </div>
            </div>
          ))}
        </dl>

        <p className="text-ink-400 mt-6 text-xs leading-relaxed">
          Projeção com base nas suas respostas, seguindo o plano por 4 semanas.
        </p>
      </div>

      <Button size="lg" block className="mt-6" onClick={onNext}>
        {step.cta}
      </Button>
    </StepShell>
  );
}

export function ScratchCardStepView({
  step,
  onAnswer,
  onNext,
}: StepProps<ScratchCardStep>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [discount, setDiscount] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Camada raspável: âmbar sólido sobre o prêmio.
    ctx.fillStyle = "#F0A73C";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0B0E14";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Raspe aqui", canvas.width / 2, canvas.height / 2 + 6);
  }, []);

  function scratch(e: React.PointerEvent<HTMLCanvasElement>) {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();

    // Revela sozinho quando já raspou o suficiente — ninguém raspa tudo.
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let clear = 0;
    for (let i = 3; i < data.length; i += 4 * 40) {
      if (data[i] === 0) clear++;
    }
    if (clear / (data.length / (4 * 40)) > 0.42 && !revealed) {
      setRevealed(true);
      // O servidor decide o desconto e a validade; aqui só exibimos.
      void claimOffer("scratch-card").then((result) => {
        if (!result.ok) return;
        setDiscount(result.percentOff);
        onAnswer(String(result.percentOff));
      });
    }
  }

  return (
    <StepShell title={step.title} subtitle={step.subtitle}>
      <div className="rounded-card border-alpha-500 relative mx-auto h-44 w-full max-w-sm overflow-hidden border-2 border-dashed bg-white">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-alpha-600 text-5xl font-extrabold">
            {discount === null ? "…" : `${discount}%`}
          </p>
          <p className="text-ink-500 mt-1 text-sm">de desconto no seu plano</p>
        </div>

        <canvas
          ref={canvasRef}
          width={400}
          height={176}
          onPointerMove={(e) => e.buttons === 1 && scratch(e)}
          onPointerDown={scratch}
          className={cn(
            "absolute inset-0 h-full w-full touch-none transition-opacity duration-500",
            revealed ? "pointer-events-none opacity-0" : "cursor-grab",
          )}
        />
      </div>

      <Button
        size="lg"
        block
        className="mt-6"
        disabled={discount === null}
        onClick={onNext}
      >
        {discount === null ? "Raspe para continuar" : step.cta}
      </Button>
    </StepShell>
  );
}
