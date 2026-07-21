import { cn } from "@/lib/utils";
import {
  TICKET_PRIORITE_LABELS,
  TICKET_PRIORITE_COLOR_CLASSES,
  type TicketPriorite,
} from "@/lib/types";

/**
 * Badge de priorité avec code couleur cohérent partout dans l'app.
 * Source unique de vérité : tous les composants qui affichent une priorité
 * passent par ici (liste tickets admin/client, kanban readonly, fiche ticket,
 * preview popover, dashboard). Ne jamais reconstruire ce badge manuellement
 * avec ticketPrioriteBadgeVariant + TICKET_PRIORITE_LABELS ailleurs.
 */
export function PrioriteBadge({
  priorite,
  className,
}: {
  priorite: TicketPriorite;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        TICKET_PRIORITE_COLOR_CLASSES[priorite],
        className
      )}
    >
      {TICKET_PRIORITE_LABELS[priorite]}
    </span>
  );
}
