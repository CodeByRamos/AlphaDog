"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ConfirmStep,
  DropdownStep,
  EmailStep,
  ListStep,
  StatementStep,
  TextStep,
} from "../types";
import { OptionCard, StepShell, type StepProps } from "./shell";

/** Escala de concordância reutilizada pelo passo `statement`. */
const AGREEMENT = [
  { value: "strongly-agree", label: "Concordo muito", icon: "💯" },
  { value: "agree", label: "Concordo", icon: "👍" },
  { value: "neutral", label: "Mais ou menos", icon: "🤷" },
  { value: "disagree", label: "Discordo", icon: "👎" },
] as const;

export function ListStepView({ step, value, onAnswer, onNext }: StepProps<ListStep>) {
  const selected = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );

  function toggle(optionValue: string) {
    if (!step.multiple) {
      onAnswer(optionValue);
      onNext();
      return;
    }

    // "Nenhum desses" é exclusivo: marcar limpa o resto, e vice-versa.
    const isExclusive = optionValue === "none";
    const next = selected.includes(optionValue)
      ? selected.filter((v) => v !== optionValue)
      : isExclusive
        ? [optionValue]
        : [...selected.filter((v) => v !== "none"), optionValue];

    onAnswer(next);
  }

  return (
    <StepShell title={step.title} subtitle={step.subtitle}>
      <div className="space-y-3">
        {step.options.map((option) => (
          <OptionCard
            key={option.value}
            label={option.label}
            hint={option.hint}
            icon={option.icon}
            multiple={step.multiple}
            selected={selected.includes(option.value)}
            onClick={() => toggle(option.value)}
          />
        ))}
      </div>

      {step.multiple && (
        <Button
          size="lg"
          block
          className="mt-6"
          disabled={selected.length === 0}
          onClick={onNext}
        >
          Continuar
        </Button>
      )}
    </StepShell>
  );
}

export function StatementStepView({
  step,
  value,
  onAnswer,
  onNext,
}: StepProps<StatementStep>) {
  return (
    <StepShell title={step.title}>
      <blockquote className="border-alpha-500 bg-alpha-50 rounded-card font-display mb-6 border-l-4 p-5 text-lg font-bold">
        “{step.statement}”
      </blockquote>

      <div className="space-y-3">
        {AGREEMENT.map((option) => (
          <OptionCard
            key={option.value}
            label={option.label}
            icon={option.icon}
            selected={value === option.value}
            onClick={() => {
              onAnswer(option.value);
              onNext();
            }}
          />
        ))}
      </div>
    </StepShell>
  );
}

export function DropdownStepView({
  step,
  value,
  onAnswer,
  onNext,
}: StepProps<DropdownStep>) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return step.options;
    return step.options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, step.options]);

  return (
    <StepShell title={step.title} subtitle={step.subtitle}>
      <div className="relative">
        <Search
          aria-hidden
          className="text-ink-400 pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={step.placeholder}
          aria-label={step.placeholder}
          className="border-ink-200 rounded-field focus:border-alpha-500 h-14 w-full border-2 bg-white pr-4 pl-12 outline-none"
        />
      </div>

      <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
        {filtered.map((option) => (
          <OptionCard
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onClick={() => {
              onAnswer(option.value);
              onNext();
            }}
          />
        ))}

        {filtered.length === 0 && (
          <p className="text-ink-500 py-8 text-center">
            Nenhuma raça encontrada. Tente “SRD” ou “Outra raça”.
          </p>
        )}
      </div>
    </StepShell>
  );
}

export function TextStepView({ step, value, onAnswer, onNext }: StepProps<TextStep>) {
  const text = typeof value === "string" ? value : "";
  const valid = text.trim().length > 0;

  return (
    <StepShell title={step.title} subtitle={step.subtitle}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onNext();
        }}
      >
        <input
          type="text"
          autoFocus
          value={text}
          maxLength={step.maxLength}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder={step.placeholder}
          aria-label={step.title}
          className="border-ink-200 rounded-field focus:border-alpha-500 font-display h-16 w-full border-2 bg-white px-5 text-center text-xl font-bold outline-none"
        />
        <Button type="submit" size="lg" block className="mt-6" disabled={!valid}>
          Continuar
        </Button>
      </form>
    </StepShell>
  );
}

export function EmailStepView({ step, value, onAnswer, onNext }: StepProps<EmailStep>) {
  const email = typeof value === "string" ? value : "";
  const [touched, setTouched] = useState(false);

  // Validação leve no cliente; a Server Action valida de verdade com Zod.
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const showError = touched && email.length > 0 && !valid;

  return (
    <StepShell title={step.title} subtitle={step.subtitle}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (valid) onNext();
        }}
      >
        <input
          type="email"
          autoFocus
          inputMode="email"
          autoComplete="email"
          value={email}
          onBlur={() => setTouched(true)}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder={step.placeholder}
          aria-label={step.title}
          aria-invalid={showError}
          className={cn(
            "rounded-field h-16 w-full border-2 bg-white px-5 text-center text-lg outline-none",
            showError ? "border-red-400" : "border-ink-200 focus:border-alpha-500",
          )}
        />

        {showError && (
          <p role="alert" className="mt-2 text-center text-sm text-red-600">
            Confira o e-mail — parece que falta algo.
          </p>
        )}

        <Button type="submit" size="lg" block className="mt-6" disabled={!valid}>
          {step.cta}
        </Button>

        <p className="text-ink-400 mt-4 text-center text-xs leading-relaxed">
          {step.disclaimer}
        </p>
      </form>
    </StepShell>
  );
}

export function ConfirmStepView({ step, onAnswer, onNext }: StepProps<ConfirmStep>) {
  function choose(answer: "yes" | "no") {
    onAnswer(answer);
    onNext();
  }

  return (
    <StepShell title={step.title} subtitle={step.subtitle}>
      <div className="space-y-3">
        <Button size="lg" block onClick={() => choose("yes")}>
          {step.cta}
        </Button>
        <Button variant="ghost" size="lg" block onClick={() => choose("no")}>
          {step.declineLabel}
        </Button>
      </div>
    </StepShell>
  );
}
