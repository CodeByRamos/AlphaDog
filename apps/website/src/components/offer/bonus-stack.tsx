import { Gift } from "lucide-react";
import { bonuses, bonusTotalCents, formatBRL } from "@/features/billing/pricing";

export function BonusStack() {
  return (
    <div className="border-ink-100 rounded-card border bg-white p-7">
      <div className="flex items-center gap-3">
        <span className="bg-alpha-50 text-alpha-700 flex size-10 items-center justify-center rounded-full">
          <Gift className="size-5" />
        </span>
        <div>
          <h2 className="text-lg">Bônus inclusos</h2>
          <p className="text-ink-500 text-sm">
            {formatBRL(bonusTotalCents)} em guias, sem custo adicional
          </p>
        </div>
      </div>

      <ul className="divide-ink-100 mt-5 divide-y">
        {bonuses.map((bonus) => (
          <li key={bonus.title} className="flex items-start justify-between gap-4 py-4">
            <div>
              <p className="font-display font-bold">{bonus.title}</p>
              <p className="text-ink-500 text-sm leading-relaxed">
                {bonus.description}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-ink-400 text-sm line-through">
                {formatBRL(bonus.valueCents)}
              </p>
              <p className="font-display text-sage-600 text-sm font-bold">Grátis</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
