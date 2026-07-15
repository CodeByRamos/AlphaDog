"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PLAN_ID,
  formatBRL,
  type PlanId,
  type PlanPricing,
} from "@/features/billing/pricing";
import { cn } from "@/lib/utils";

export function PlanSelector({ pricing }: { pricing: PlanPricing[] }) {
  const [selected, setSelected] = useState<PlanId>(DEFAULT_PLAN_ID);
  const current = pricing.find((p) => p.plan.id === selected) ?? pricing[0];

  return (
    <div>
      <ul className="space-y-3">
        {pricing.map((item) => {
          const active = item.plan.id === selected;
          return (
            <li key={item.plan.id}>
              <button
                type="button"
                onClick={() => setSelected(item.plan.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-card relative flex w-full items-center gap-4 border-2 bg-white p-5 text-left transition-all duration-150",
                  active
                    ? "border-alpha-500 bg-alpha-50 shadow-card"
                    : "border-ink-100 hover:border-ink-300",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    active ? "border-alpha-500 bg-alpha-500" : "border-ink-200",
                  )}
                >
                  {active && <Check className="text-ink-900 size-4" strokeWidth={3} />}
                </span>

                <span className="flex-1">
                  <span className="font-display block text-lg font-extrabold">
                    {item.plan.name}
                  </span>
                  <span className="text-ink-400 text-sm line-through">
                    {formatBRL(item.listPriceCents)}
                  </span>{" "}
                  <span className="text-ink-700 text-sm font-semibold">
                    {formatBRL(item.finalPriceCents)}
                  </span>
                </span>

                <span className="text-right">
                  <span className="font-display text-alpha-700 block text-2xl font-extrabold">
                    {formatBRL(item.perDayCents)}
                  </span>
                  <span className="text-ink-400 text-xs">por dia</span>
                </span>

                {item.plan.badge && (
                  <span className="bg-ink-900 text-bone font-display absolute -top-2.5 right-5 rounded-full px-2.5 py-0.5 text-[0.625rem] font-bold tracking-wide uppercase">
                    {item.plan.badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <Button size="lg" block className="mt-6">
        Começar o treino do meu cão
      </Button>

      <p className="text-ink-500 mt-4 flex items-center justify-center gap-2 text-center text-sm">
        <ShieldCheck aria-hidden className="text-sage-500 size-4" />
        {formatBRL(current.finalPriceCents)} agora · cancele quando quiser
      </p>
    </div>
  );
}
