import Image from "next/image";
import {
  Award,
  Download,
  FileText,
  Headphones,
  PlayCircle,
  Sparkles,
  Table,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Deliverable, DeliverableKind } from "@/features/deliverables/types";
import { StatusBadge } from "./status-badge";

const KIND_ICON: Record<DeliverableKind, typeof FileText> = {
  guia: FileText,
  video: PlayCircle,
  planilha: Table,
  audio: Headphones,
  certificado: Award,
};

/**
 * Card de um material.
 *
 * Apresentação apenas. Os handlers ficam de fora de propósito: a entrega em si
 * (assinar URL, liberar acesso, cobrar upgrade) ainda não existe, e um botão
 * que finge funcionar é pior que um botão claramente inativo.
 */
export function DeliverableCard({ item }: { item: Deliverable }) {
  const Icon = KIND_ICON[item.kind];
  const canDownload = item.status === "available";

  return (
    <li className="group border-ink-100 rounded-card hover:shadow-lift flex flex-col overflow-hidden border bg-white transition-shadow duration-300">
      <div className="bg-ink-50 relative aspect-16/10 overflow-hidden">
        <Image
          src={item.coverUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 90vw"
          className="object-cover transition-transform duration-500 ease-[var(--ease-out-quart)] group-hover:scale-105"
        />
        <span className="absolute top-3 left-3">
          <StatusBadge status={item.status} />
        </span>
        <span className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-xl bg-white/90 backdrop-blur">
          <Icon aria-hidden className="text-ink-700 size-4" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base">{item.name}</h3>
        <p className="text-ink-500 mt-1.5 flex-1 text-sm leading-relaxed">
          {item.description}
        </p>

        <p className="text-ink-400 mt-3 text-xs">
          {item.status === "scheduled" && item.unlockHint}
          {item.status === "available" && item.fileSize}
          {item.status === "processing" && "Ficará pronto em alguns minutos"}
          {item.status === "locked" && "Não incluso no seu plano"}
        </p>

        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!canDownload}
            aria-disabled={!canDownload}
            className="flex-1"
          >
            <Download aria-hidden />
            Download
          </Button>

          {!canDownload && (
            <Button size="sm" className="flex-1">
              <Sparkles aria-hidden />
              Liberar
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
