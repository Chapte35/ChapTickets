import { Badge } from "@/components/ui/badge";
import { TICKET_STATUT_LABELS, TICKET_STATUT_CLASSES, type TicketStatut } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Badge de statut ticket avec couleurs distinctes par statut.
 * Remplace <Badge variant={ticketStatutBadgeVariant(statut)}>{label}</Badge>.
 */
export function StatutBadge({
  statut,
  className,
}: {
  statut: TicketStatut;
  className?: string;
}) {
  return (
    <Badge className={cn(TICKET_STATUT_CLASSES[statut], className)}>
      {TICKET_STATUT_LABELS[statut]}
    </Badge>
  );
}
