"use client";

import { useEffect, useRef } from "react";

/**
 * Parallax de ponteiro para a cena do hero.
 *
 * Escreve direto em CSS custom properties via rAF em vez de passar por estado
 * do React: `mousemove` dispara dezenas de vezes por segundo e um setState por
 * evento renderizaria a árvore inteira nessa frequência. Aqui o React não
 * re-renderiza nenhuma vez — só o compositor trabalha.
 *
 * As variáveis (--px, --py) alimentam apenas transform, então não há reflow.
 */
export function usePointerParallax<T extends HTMLElement>({
  strength = 1,
  damping = 0.09,
}: { strength?: number; damping?: number } = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respeita a preferência do sistema: sem movimento, sem listener.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    // Ponteiro grosso (touch) não tem hover — o efeito não faz sentido e só
    // custaria bateria.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;
    let running = false;

    const tick = () => {
      // Interpolação exponencial: o alvo é perseguido, nunca alcançado de
      // imediato — é isso que dá o easing contínuo em vez de um salto.
      currentX += (targetX - currentX) * damping;
      currentY += (targetY - currentY) * damping;

      el.style.setProperty("--px", currentX.toFixed(4));
      el.style.setProperty("--py", currentY.toFixed(4));

      const settled =
        Math.abs(targetX - currentX) < 0.0005 && Math.abs(targetY - currentY) < 0.0005;

      if (settled) {
        running = false;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const { innerWidth, innerHeight } = window;
      // Normaliza para -1..1 com o centro da janela na origem.
      targetX = ((e.clientX / innerWidth) * 2 - 1) * strength;
      targetY = ((e.clientY / innerHeight) * 2 - 1) * strength;
      start();
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      start();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, [strength, damping]);

  return ref;
}
