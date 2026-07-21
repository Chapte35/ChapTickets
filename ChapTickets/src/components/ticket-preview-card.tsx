import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TagChip } from "@/components/tag-badge";
import { PrioriteBadge } from "@/components/priorite-badge";
import {
  TICKET_STATUT_LABELS,
  ticketStatutBadgeVariant,
  type TicketPriorite,
  type TicketStatut,
  type Tag,
} from "@/lib/types";

/**
 * Rendu de la fiche telle qu'elle apparaîtra une fois le ticket créé — même
 * composant, littéralement, que la fiche réelle (admin ET client) : cf.
 * ticket "Aperçu du ticket non exploité" (sprint 12), le rendu montré à la
 * création n'était jamais réutilisé ailleurs, donc rien ne garantissait
 * qu'il corresponde vraiment à la fiche finale. `statut`/`numero` absents
 * (undefined) = mode aperçu à la création (pas encore de statut ni de
 * numéro attribués) ; fournis = mode réel, monté depuis la fiche.
 */
export function TicketPreviewCard({
  titre,
  description,
  priorite,
  projetNom,
  clientNom,
  dateEcheance,
  tags,
  statut,
  numero,
}: {
  titre: string;
  description: string;
  priorite: TicketPriorite;
  projetNom: string | null;
  clientNom: string | null;
  dateEcheance: string | null;
  tags: Tag[];
  statut?: TicketStatut;
  numero?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold leading-snug">
              {numero != null && (
                <span className="text-muted-foreground font-normal">#{numero} </span>
              )}
              {titre || <span className="text-muted-foreground">Titre du ticket…</span>}
            </p>
            <p className="text-sm text-muted-foreground">
              {projetNom ?? "—"} · {clientNom ?? "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <PrioriteBadge priorite={priorite} />
            {statut && (
              <Badge variant={ticketStatutBadgeVariant(statut)}>
                {TICKET_STATUT_LABELS[statut]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {description ? (
          <p className="text-sm whitespace-pre-wrap">{description}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Pas de description.</p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <TagChip key={t.id} tag={t} />
            ))}
          </div>
        )}

        {dateEcheance && (
          <p className="text-xs text-muted-foreground">
            Échéance :{" "}
            {new Date(dateEcheance).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
