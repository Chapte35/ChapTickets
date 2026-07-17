import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  TICKET_STATUT_LABELS,
  TICKET_PRIORITE_LABELS,
  ticketStatutBadgeVariant,
  ticketPrioriteBadgeVariant,
  type TicketStatut,
  type TicketPriorite,
} from "@/lib/types";

export type TicketRow = {
  id: string;
  titre: string;
  statut: TicketStatut;
  priorite: TicketPriorite;
  created_at: string;
  projets: { nom: string } | null;
  profiles: { email: string | null; full_name: string | null } | null;
};

export function TicketList({
  tickets,
  basePath,
  showClient,
}: {
  tickets: TicketRow[];
  basePath: string;
  showClient?: boolean;
}) {
  if (tickets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6">
        Aucun ticket ne correspond à ces critères.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y">
      {tickets.map((t) => (
        <li key={t.id}>
          <Link
            href={`${basePath}/${t.id}`}
            className="flex items-center justify-between gap-4 py-3 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors"
          >
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-medium truncate">{t.titre}</span>
              <span className="text-xs text-muted-foreground truncate">
                {t.projets?.nom ?? "—"}
                {showClient && t.profiles
                  ? ` · ${t.profiles.full_name || t.profiles.email}`
                  : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={ticketPrioriteBadgeVariant(t.priorite)}>
                {TICKET_PRIORITE_LABELS[t.priorite]}
              </Badge>
              <Badge variant={ticketStatutBadgeVariant(t.statut)}>
                {TICKET_STATUT_LABELS[t.statut]}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
