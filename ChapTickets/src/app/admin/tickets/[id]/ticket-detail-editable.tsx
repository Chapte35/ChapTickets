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
import { updateTicketTitre, updateTicketDescription } from "../actions";

/**
 * Version éditable de TicketPreviewCard pour la fiche admin.
 * Titre et description sont modifiables via click-to-edit inline.
 * Les autres champs (priorité, statut, tags, échéance) restent dans la
 * colonne de droite via leurs propres forms (StatusUpdateForm, etc.).
 */
export function TicketDetailEditable({
  ticketId,
  titre,
  description,
  priorite,
  statut,
  projetNom,
  clientNom,
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
  clientNom: string | null;
  dateEcheance: string | null;
  tags: Tag[];
  refAffichee?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Titre éditable */}
            <InlineEditField
              ticketId={ticketId}
              valeurInitiale={titre}
              mode="input"
              action={updateTicketTitre}
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
              {projetNom ?? "—"} · {clientNom ?? "—"}
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
        {/* Description éditable */}
        <InlineEditField
          ticketId={ticketId}
          valeurInitiale={description}
          mode="textarea"
          action={updateTicketDescription}
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
