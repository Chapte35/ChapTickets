import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  TICKET_STATUT_LABELS,
  ticketStatutBadgeVariant,
  formatRefTicket,
  type TicketStatut,
  type TicketPriorite,
} from "@/lib/types";
import { PrioriteBadge } from "@/components/priorite-badge";
import { TicketPreviewPopover } from "@/components/ticket-preview-popover";

export type TicketRow = {
  id: string;
  rang_projet: number;
  titre: string;
  description: string | null;
  statut: TicketStatut;
  priorite: TicketPriorite;
  created_at: string;
  projets: { nom: string; code_court?: string | null } | null;
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
      {tickets.map((t) => {
        const ref = formatRefTicket(t.rang_projet, t.projets?.code_court);
        return (
          <li key={t.id}>
            <div className="flex items-center justify-between gap-4 py-3 -mx-2 px-2">
              <Link
                href={`${basePath}/${t.id}`}
                className="flex items-center gap-2 flex-1 min-w-0 hover:bg-accent/50 rounded-md transition-colors"
              >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-medium truncate">
                  <span className="text-muted-foreground font-normal">{ref}</span>{" "}
                  {t.titre}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {t.projets?.nom ?? "—"}
                  {showClient && t.profiles
                    ? ` · ${t.profiles.full_name || t.profiles.email}`
                    : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PrioriteBadge priorite={t.priorite} />
                <Badge variant={ticketStatutBadgeVariant(t.statut)}>
                  {TICKET_STATUT_LABELS[t.statut]}
                </Badge>
              </div>
              </Link>
              <TicketPreviewPopover
                ticketId={t.id}
                titre={t.titre}
                statut={t.statut}
                priorite={t.priorite}
                description={t.description}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
