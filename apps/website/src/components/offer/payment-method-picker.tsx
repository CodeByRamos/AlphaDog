"use client";

import { useState } from "react";
import { Check, CreditCard, Landmark, QrCode } from "lucide-react";
import { paymentMethods, type PaymentMethod } from "@/features/billing/payment-methods";
import { cn } from "@/lib/utils";

const ICON: Record<PaymentMethod, typeof QrCode> = {
  pix: QrCode,
  credit_card: CreditCard,
  debit_card: Landmark,
};

/**
 * Escolha do meio de pagamento.
 *
 * Só apresentação: nenhum gateway está integrado, então o componente informa a
 * escolha para cima e para por aí.
 */
export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value?: PaymentMethod;
  onChange?: (method: PaymentMethod) => void;
}) {
  const [internal, setInternal] = useState<PaymentMethod>("pix");
  const selected = value ?? internal;

  function select(method: PaymentMethod) {
    setInternal(method);
    onChange?.(method);
  }

  return (
    <fieldset>
      <legend className="font-display mb-3 text-sm font-bold">
        Como você prefere pagar?
      </legend>

      <div className="space-y-2.5">
        {paymentMethods.map((method) => {
          const Icon = ICON[method.id];
          const active = method.id === selected;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => select(method.id)}
              aria-pressed={active}
              className={cn(
                "rounded-field flex w-full items-center gap-3.5 border-2 bg-white p-4 text-left transition-all duration-150",
                active
                  ? "border-alpha-500 bg-alpha-50"
                  : "border-ink-100 hover:border-ink-300",
              )}
            >
              <Icon
                aria-hidden
                className={cn(
                  "size-5 shrink-0",
                  active ? "text-alpha-700" : "text-ink-400",
                )}
              />
              <span className="flex-1">
                <span className="font-display block text-sm font-bold">
                  {method.label}
                </span>
                <span className="text-ink-500 text-xs">{method.description}</span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  active ? "border-alpha-500 bg-alpha-500" : "border-ink-200",
                )}
              >
                {active && <Check className="text-ink-900 size-3" strokeWidth={4} />}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
