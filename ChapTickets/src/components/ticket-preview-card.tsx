import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TagChip } from "@/components/tag-badge";
import {
  TICKET_PRIORITE_LABELS,
  ticketPrioriteBadgeVariant,
  type TicketPriorite,
  type Tag,
} from "@/lib/types";

/**
 * Rendu de la fiche telle qu'elle apparaîtra une fois le ticket créé —
 * mêmes badges/variants que src/app/*\/tickets/[id]/page.tsx, pour que
 * l'aperçu ne mente pas sur le rendu réel. Volontairement sans statut
 * (toujours "ouvert" à la création, pas informatif ici) ni sans les
 * panneaux qui n'existent qu'une fois le ticket en base (checklist, PJ,
 * messages, demandes de réouverture).
 */
export function TicketPreviewCard({
  titre,
  description,
  priorite,
  projetNom,
  clientNom,
  dateEcheance,
  tags,
}: {
  titre: string;
  description: string;
  priorite: TicketPriorite;
  projetNom: string | null;
  clientNom: string | null;
  dateEcheance: string | null;
  tags: Tag[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold leading-snug">
              {titre || <span className="text-muted-foreground">Titre du ticket…</span>}
            </p>
            <p className="text-sm text-muted-foreground">
              {projetNom ?? "—"} · {clientNom ?? "—"}
            </p>
          </div>
          <Badge variant={ticketPrioriteBadgeVariant(priorite)}>
            {TICKET_PRIORITE_LABELS[priorite]}
          </Badge>
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
