"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navLinks, routes } from "@/lib/routes";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  // Trava o scroll do fundo enquanto o menu está aberto.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={open}
        className="text-ink-700 hover:bg-ink-100 rounded-field inline-flex h-10 w-10 items-center justify-center transition-colors md:hidden"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="bg-bone fixed inset-0 z-50 flex flex-col md:hidden">
          <div className="flex h-16 items-center justify-end px-5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="text-ink-700 hover:bg-ink-100 rounded-field inline-flex h-10 w-10 items-center justify-center transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav aria-label="Principal" className="flex flex-col gap-1 px-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-display text-ink-900 border-ink-100 border-b py-4 text-xl font-bold"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto p-5">
            <Button asChild size="lg" block onClick={() => setOpen(false)}>
              <Link href={routes.quiz}>Montar o plano do meu cão</Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
