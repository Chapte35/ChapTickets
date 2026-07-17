import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  TICKET_STATUTS,
  TICKET_STATUT_LABELS,
  TICKET_PRIORITE_LABELS,
  ticketPrioriteBadgeVariant,
  type TicketStatut,
  type TicketPriorite,
} from "@/lib/types";

export type TicketKanbanItem = {
  id: string;
  titre: string;
  statut: TicketStatut;
  priorite: TicketPriorite;
};

export function TicketKanbanReadonly({
  tickets,
  basePath,
}: {
  tickets: TicketKanbanItem[];
  basePath: string;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {TICKET_STATUTS.map((statut) => {
        const colonne = tickets.filter((t) => t.statut === statut);
        return (
          <div key={statut} className="flex flex-col gap-2 min-w-[220px] w-[220px] shrink-0">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold text-muted-foreground">
                {TICKET_STATUT_LABELS[statut]}
              </h3>
              <span className="text-xs text-muted-foreground">{colonne.length}</span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-1.5 min-h-[80px]">
              {colonne.map((t) => (
                <Link
                  key={t.id}
                  href={`${basePath}/${t.id}`}
                  className="flex flex-col gap-1.5 rounded-md border bg-card p-2 text-xs hover:shadow-sm transition-shadow"
                >
                  <span className="font-medium leading-snug">{t.titre}</span>
                  <Badge variant={ticketPrioriteBadgeVariant(t.priorite)} className="w-fit text-[10px]">
                    {TICKET_PRIORITE_LABELS[t.priorite]}
                  </Badge>
                </Link>
              ))}
              {colonne.length === 0 && (
                <p className="text-[11px] text-muted-foreground text-center py-4">Vide</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
