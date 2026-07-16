import type { DeliverablesState } from "@/features/deliverables/types";
import { DeliverableCard } from "./deliverable-card";
import { DeliverablePagination } from "./deliverable-pagination";
import {
  DeliverableEmpty,
  DeliverableError,
  DeliverableGridSkeleton,
} from "./deliverable-states";

/**
 * Grade de materiais.
 *
 * Recebe o estado inteiro em vez de flags soltas (`isLoading`, `error`, `data`):
 * a união discriminada torna impossível renderizar "carregando com erro" ou
 * "vazio com itens", e o compilador cobra o caso que faltou.
 */
export function DeliverableGrid({ state }: { state: DeliverablesState }) {
  switch (state.status) {
    case "loading":
      return <DeliverableGridSkeleton />;
    case "error":
      return <DeliverableError message={state.message} />;
    case "empty":
      return <DeliverableEmpty />;
    case "ready":
      return (
        <>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {state.data.items.map((item) => (
              <DeliverableCard key={item.id} item={item} />
            ))}
          </ul>
          <DeliverablePagination page={state.data} />
        </>
      );
  }
}
