import Link from "next/link";
import {
  TICKET_STATUTS,
  TICKET_STATUT_LABELS,
  formatRefTicket,
  type TicketStatut,
  type TicketPriorite,
} from "@/lib/types";
import { PrioriteBadge } from "@/components/priorite-badge";

export type TicketKanbanItem = {
  id: string;
  titre: string;
  statut: TicketStatut;
  priorite: TicketPriorite;
  rang_projet?: number;
  code_court?: string | null;
};

export function TicketKanbanReadonly({
  tickets,
  basePath,
  /**
   * Statuts à masquer. Par défaut : ["ferme"] — les tickets fermés
   * encombrent la vue sans valeur ajoutée (feedback client FEAT0.1).
   */
  hideStatuts = ["ferme"],
}: {
  tickets: TicketKanbanItem[];
  basePath: string;
  hideStatuts?: TicketStatut[];
}) {
  const statutsVisibles = TICKET_STATUTS.filter((s) => !hideStatuts.includes(s));

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {statutsVisibles.map((statut) => {
        const colonne = tickets.filter((t) => t.statut === statut);
        return (
          <div key={statut} className="flex flex-col gap-2 min-w-[220px] w-[220px] shrink-0">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold text-muted-foreground">
                {TICKET_STATUT_LABELS[statut]}
              </h3>
              <span className="text-xs text-muted-foreground">{colonne.length}</span>
            </div>
            <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-1.5 min-h-[80px] max-h-[380px] overflow-y-auto">
              {colonne.map((t) => (
                <Link
                  key={t.id}
                  href={`${basePath}/${t.id}`}
                  className="flex flex-col gap-1.5 rounded-md border bg-card p-2 text-xs hover:shadow-sm transition-shadow"
                >
                  {t.rang_projet != null && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatRefTicket(t.rang_projet, t.code_court)}
                    </span>
                  )}
                  <span className="font-medium leading-snug">{t.titre}</span>
                  <PrioriteBadge priorite={t.priorite} />
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
