import { CalendarClock, CheckCircle2, Loader2, Lock } from "lucide-react";
import { STATUS_LABEL, type DeliverableStatus } from "@/features/deliverables/types";
import { cn } from "@/lib/utils";

const STYLE: Record<DeliverableStatus, { className: string; icon: typeof Lock }> = {
  available: {
    className: "bg-sage-50 text-sage-700 ring-sage-200",
    icon: CheckCircle2,
  },
  processing: {
    className: "bg-alpha-50 text-alpha-800 ring-alpha-200",
    icon: Loader2,
  },
  locked: { className: "bg-ink-50 text-ink-500 ring-ink-200", icon: Lock },
  scheduled: {
    className: "bg-trust-50 text-trust-600 ring-trust-200",
    icon: CalendarClock,
  },
};

export function StatusBadge({ status }: { status: DeliverableStatus }) {
  const { className, icon: Icon } = STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ring-1 ring-inset",
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn("size-3", status === "processing" && "animate-spin")}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
