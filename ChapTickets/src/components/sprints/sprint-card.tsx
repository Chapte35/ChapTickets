import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PrioriteBadge } from "@/components/priorite-badge";
import { CloturerSprintDialog } from "@/components/sprints/cloturer-sprint-dialog";
import { TICKET_STATUT_LABELS, ticketStatutBadgeVariant, type TicketStatut, type TicketPriorite } from "@/lib/types";
import { SPRINT_STATUT_LABELS, type SprintAvecTickets } from "@/lib/sprint-types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function SprintCard({
  sprint,
  basePath,
}: {
  sprint: SprintAvecTickets;
  /** ex: "/admin/tickets" pour les liens vers les fiches ticket */
  basePath: string;
}) {
  const estCloture = sprint.statut === "cloture";
  const total = sprint.tickets.length;
  const resolus = sprint.tickets.filter(
    (t) => t.statut === "resolu" || t.statut === "ferme"
  ).length;
  const pct = total > 0 ? Math.round((resolus / total) * 100) : 0;

  return (
    <Card className={estCloture ? "opacity-70" : undefined}>
      <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
        <div className="flex flex-col gap-1 min-w-0">
          <CardTitle className="text-base">{sprint.nom}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {formatDate(sprint.date_debut)}
            {sprint.date_fin ? ` → ${formatDate(sprint.date_fin)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={estCloture ? "outline" : "secondary"}>
            {SPRINT_STATUT_LABELS[sprint.statut]}
          </Badge>
          {!estCloture && (
            <CloturerSprintDialog sprintId={sprint.id} sprintNom={sprint.nom} />
          )}
          {estCloture && sprint.release_id && (
            <span className="text-xs text-muted-foreground">
              Release créée
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Barre de progression */}
        {total > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{resolus}/{total} tickets résolus</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Liste des tickets */}
        {sprint.tickets.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Aucun ticket dans ce sprint.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {sprint.tickets.map((t) => (
              <li key={t.id} className="py-1.5">
                <Link
                  href={`${basePath}/${t.id}`}
                  className="flex items-center justify-between gap-2 group"
                >
                  <span className="text-sm truncate group-hover:underline underline-offset-2">
                    {t.titre}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <PrioriteBadge priorite={t.priorite as TicketPriorite} />
                    <Badge
                      variant={ticketStatutBadgeVariant(t.statut as TicketStatut)}
                      className="text-[10px]"
                    >
                      {TICKET_STATUT_LABELS[t.statut as TicketStatut]}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
