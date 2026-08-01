import type { Detection } from "@alphadog/core";
import { useCallback, useEffect, useRef, useState } from "react";

export type ScanPhase =
  /** Procurando o cão no quadro. */
  | "scanning"
  /** Achou e travou o alvo; mostrando a confirmação. */
  | "locked"
  /** Liberado: o treino pode começar. */
  | "done";

/**
 * Máquina de estado da identificação do cão antes do treino.
 *
 * Duas decisões que importam:
 *
 * 1. Exige `HITS_TO_LOCK` detecções seguidas para travar o alvo. Uma detecção
 *    isolada pisca em qualquer modelo — travar no primeiro quadro faria a mira
 *    prender e soltar sozinha, que é a sensação de app quebrado.
 *
 * 2. Quando não há visão disponível, devolve `done` na hora. O treino com o
 *    tutor marcando o acerto é o produto e não pode depender de um recurso
 *    opcional: um APK sem o motor de visão ficaria com o treino inacessível
 *    para sempre, esperando um cão que ninguém vai procurar.
 */
const HITS_TO_LOCK = 3;
const LOCK_DURATION_MS = 1300;

export function useScanPhase(visionActive: boolean) {
  const [phase, setPhase] = useState<ScanPhase>(visionActive ? "scanning" : "done");
  const [detection, setDetection] = useState<Detection | null>(null);
  const hits = useRef(0);

  /**
   * Acompanha a visão nos DOIS sentidos.
   *
   * A versão anterior só tratava a queda: `if (!visionActive) setPhase("done")`.
   * Como o modelo carrega de forma assíncrona, o primeiro render sempre chega
   * com a visão inativa — a fase nascia em "done" e nunca voltava para
   * "scanning" quando o modelo ficava pronto. A identificação do cão era
   * pulada silenciosamente, e o treino começava sem a mira travar.
   */
  useEffect(() => {
    setPhase(visionActive ? "scanning" : "done");
  }, [visionActive]);

  // A confirmação tem duração fixa: é um momento de UI, não um estado que
  // depende do que o modelo faz a seguir.
  useEffect(() => {
    if (phase !== "locked") return;
    const t = setTimeout(() => setPhase("done"), LOCK_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  /** Recebe cada detecção do frame processor. */
  const observe = useCallback((next: Detection | null) => {
    setDetection(next);

    if (next === null) {
      // Perder o cão zera a contagem: exigimos quadros CONSECUTIVOS.
      hits.current = 0;
      return;
    }

    hits.current += 1;
    if (hits.current >= HITS_TO_LOCK) {
      setPhase((current) => (current === "scanning" ? "locked" : current));
    }
  }, []);

  return {
    phase,
    detection,
    observe,
    /** O treino já pode rodar? */
    ready: phase === "done",
  };
}
