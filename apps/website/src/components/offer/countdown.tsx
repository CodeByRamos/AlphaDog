"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/**
 * Contador do preço reservado.
 *
 * O prazo vem do servidor (`expiresAt` da Offer). Isto aqui só desenha — zerar
 * o contador na tela não libera nem revoga desconto nenhum; quem decide é o
 * servidor, que revalida na hora do checkout.
 */
export function Countdown({ expiresAt }: { expiresAt: string }) {
  const target = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    const timer = setInterval(() => setRemaining(target - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  const expired = remaining <= 0;
  const totalSeconds = Math.max(Math.floor(remaining / 1000), 0);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return (
    <div className="bg-alpha-50 border-alpha-200 text-ink-700 sticky top-0 z-20 border-b">
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-3 px-5 py-3 text-sm">
        <Timer aria-hidden className="text-alpha-700 size-4" />
        {expired ? (
          <span>Seu desconto expirou — recarregue para ver o preço atual.</span>
        ) : (
          <>
            <span className="text-ink-500">Preço reservado por</span>
            <span
              className="font-display text-alpha-800 text-base font-extrabold tabular-nums"
              aria-live="off"
            >
              {minutes}:{seconds}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
