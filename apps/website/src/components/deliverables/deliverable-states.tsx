import { AlertTriangle, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Skeleton com o mesmo esqueleto do card — evita salto de layout ao carregar. */
export function DeliverableSkeleton() {
  return (
    <li className="border-ink-100 rounded-card overflow-hidden border bg-white">
      <div className="bg-ink-100 aspect-16/10 animate-pulse" />
      <div className="space-y-3 p-5">
        <div className="bg-ink-100 h-4 w-2/3 animate-pulse rounded" />
        <div className="bg-ink-100 h-3 w-full animate-pulse rounded" />
        <div className="bg-ink-100 h-3 w-4/5 animate-pulse rounded" />
        <div className="bg-ink-100 mt-4 h-9 w-full animate-pulse rounded-lg" />
      </div>
    </li>
  );
}

export function DeliverableGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <DeliverableSkeleton key={i} />
      ))}
    </ul>
  );
}

export function DeliverableEmpty() {
  return (
    <div className="border-ink-200 rounded-card flex flex-col items-center border-2 border-dashed bg-white px-6 py-16 text-center">
      <span className="bg-ink-50 text-ink-400 mb-4 flex size-14 items-center justify-center rounded-full">
        <PackageOpen className="size-7" />
      </span>
      <h3 className="text-lg">Nada por aqui ainda</h3>
      <p className="text-ink-500 mt-2 max-w-sm leading-relaxed">
        Seus materiais aparecem aqui assim que o plano do seu cão for ativado.
      </p>
    </div>
  );
}

export function DeliverableError({ message }: { message: string }) {
  return (
    <div className="rounded-card flex flex-col items-center border-2 border-dashed border-red-200 bg-red-50/50 px-6 py-16 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle className="size-7" />
      </span>
      <h3 className="text-lg">Não foi possível carregar</h3>
      <p className="text-ink-500 mt-2 max-w-sm leading-relaxed">{message}</p>
      <Button variant="outline" size="sm" className="mt-5">
        Tentar de novo
      </Button>
    </div>
  );
}
