import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { totalPages, type DeliverablesPage } from "@/features/deliverables/types";

/**
 * Paginação da grade.
 *
 * A estrutura existe e reflete o envelope da API; a navegação é ligada quando
 * a fonte de dados real entrar no lugar do mock.
 */
export function DeliverablePagination({ page }: { page: DeliverablesPage }) {
  const pages = totalPages(page);
  if (pages <= 1) return null;

  return (
    <nav
      aria-label="Paginação dos materiais"
      className="mt-10 flex items-center justify-center gap-2"
    >
      <Button variant="outline" size="sm" disabled={page.page <= 1}>
        <ChevronLeft aria-hidden />
        Anterior
      </Button>

      <p className="text-ink-500 px-3 text-sm tabular-nums">
        {page.page} de {pages}
      </p>

      <Button variant="outline" size="sm" disabled={page.page >= pages}>
        Próxima
        <ChevronRight aria-hidden />
      </Button>
    </nav>
  );
}
