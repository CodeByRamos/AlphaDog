"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Answers, AnswerValue, Step } from "../types";

/** Contrato único de todo passo do funil — é o que o registry garante. */
export type StepProps<T extends Step = Step> = {
  step: T;
  value?: AnswerValue;
  answers: Answers;
  onAnswer: (value: AnswerValue) => void;
  onNext: () => void;
};

/** Cabeçalho e largura padrão. Nenhum passo repete esse layout. */
export function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col">
      <div className="space-y-2.5 text-center">
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {subtitle && <p className="text-ink-500 leading-relaxed">{subtitle}</p>}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

/** Cartão de opção — compartilhado por list e statement. */
export function OptionCard({
  label,
  hint,
  icon,
  selected,
  multiple,
  onClick,
}: {
  label: string;
  hint?: string;
  icon?: string;
  selected: boolean;
  multiple?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-card flex w-full items-center gap-4 border-2 bg-white p-4 text-left transition-all duration-150",
        selected
          ? "border-alpha-500 bg-alpha-50 shadow-card"
          : "border-ink-100 hover:border-ink-300 hover:shadow-card",
      )}
    >
      {icon && (
        <span aria-hidden className="text-2xl leading-none">
          {icon}
        </span>
      )}

      <span className="flex-1">
        <span className="font-display block font-bold">{label}</span>
        {hint && <span className="text-ink-500 text-sm">{hint}</span>}
      </span>

      {multiple && (
        <span
          aria-hidden
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
            selected ? "border-alpha-500 bg-alpha-500" : "border-ink-200",
          )}
        >
          {selected && <Check className="text-ink-900 size-4" strokeWidth={3} />}
        </span>
      )}
    </button>
  );
}
