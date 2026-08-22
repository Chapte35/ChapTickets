"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TagChip } from "@/components/tag-badge";
import { PrioriteBadge } from "@/components/priorite-badge";
import { InlineEditField } from "@/components/inline-edit-field";
import {
  TICKET_STATUT_LABELS,
  ticketStatutBadgeVariant,
  type TicketPriorite,
  type TicketStatut,
  type Tag,
} from "@/lib/types";
import { updateTicketTitreClient, updateTicketDescriptionClient } from "../actions";

/**
 * Version éditable de TicketPreviewCard pour la fiche client.
 * Même structure que TicketDetailEditable (admin) mais appelle les
 * Server Actions client qui passent par requireClient().
 *
 * Note : le client n'a pas de clientNom ici (c'est lui-même) et les
 * actions RLS garantissent qu'il ne peut modifier que ses propres tickets.
 */
export function TicketDetailEditableClient({
  ticketId,
  titre,
  description,
  priorite,
  statut,
  projetNom,
  dateEcheance,
  tags,
  refAffichee,
}: {
  ticketId: string;
  titre: string;
  description: string;
  priorite: TicketPriorite;
  statut: TicketStatut;
  projetNom: string | null;
  dateEcheance: string | null;
  tags: Tag[];
  refAffichee?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <InlineEditField
              ticketId={ticketId}
              valeurInitiale={titre}
              mode="input"
              action={updateTicketTitreClient}
              renderRempli={(v) => (
                <p className="font-semibold leading-snug">
                  {refAffichee && (
                    <span className="text-muted-foreground font-normal">{refAffichee} </span>
                  )}
                  {v}
                </p>
              )}
              renderVide={
                <p className="font-semibold leading-snug text-muted-foreground italic">
                  {refAffichee && (
                    <span className="font-normal">{refAffichee} </span>
                  )}
                  Sans titre…
                </p>
              }
            />
            <p className="text-sm text-muted-foreground mt-0.5">
              {projetNom ?? "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <PrioriteBadge priorite={priorite} />
            <Badge variant={ticketStatutBadgeVariant(statut)}>
              {TICKET_STATUT_LABELS[statut]}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <InlineEditField
          ticketId={ticketId}
          valeurInitiale={description}
          mode="textarea"
          action={updateTicketDescriptionClient}
          placeholderVide="Ajouter une description…"
          renderRempli={(v) => (
            <p className="text-sm whitespace-pre-wrap">{v}</p>
          )}
          renderVide={
            <p className="text-sm text-muted-foreground italic">
              Pas de description. Cliquer pour en ajouter une.
            </p>
          }
        />

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
