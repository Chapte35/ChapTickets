"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InlineEditField } from "@/components/inline-edit-field";
import { TicketTagsEditor } from "@/components/ticket-tags-editor";
import { PriorityUpdateForm } from "./priority-update-form";
import { StatusUpdateForm } from "./status-update-form";
import {
  type TicketPriorite,
  type TicketStatut,
  type Tag,
} from "@/lib/types";
import type { ClientOption } from "@/lib/queries/tickets";
import { updateTicketTitre, updateTicketDescription } from "../actions";

/**
 * Fiche ticket admin : titre, description, priorité, statut et tags
 * regroupés dans une seule Card pour une expérience cohérente.
 * Les champs secondaires (assigné, échéance) restent dans la colonne droite.
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
  tousLesTags,
  refAffichee,
  clientsDuProjet,
  clientIdActuel,
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
  tousLesTags: Tag[];
  refAffichee?: string;
  /** Clients rattachés au projet — pour la modal d'assignation en_attente_client. */
  clientsDuProjet: ClientOption[];
  /** client_id du ticket — pré-sélectionné dans la modal. */
  clientIdActuel: string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        {/* Référence + projet + client */}
        <p className="text-xs text-muted-foreground">
          {refAffichee && <span className="font-mono mr-1">{refAffichee}</span>}
          {projetNom ?? "—"} · {clientNom ?? "—"}
        </p>

        {/* Titre éditable — textarea auto-height, confortable sur mobile */}
        <InlineEditField
          ticketId={ticketId}
          valeurInitiale={titre}
          mode="title"
          action={updateTicketTitre}
          renderRempli={(v) => (
            <p className="font-semibold text-base leading-snug">{v}</p>
          )}
          renderVide={
            <p className="font-semibold text-base leading-snug text-muted-foreground italic">
              Sans titre…
            </p>
          }
        />
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

        {/* Tags — intégrés ici pour éviter le dropdown hors-zone de la colonne droite */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Tags</span>
          <TicketTagsEditor
            ticketId={ticketId}
            tagsActuels={tags}
            tousLesTags={tousLesTags}
          />
        </div>

        {/* Priorité */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Priorité</span>
          <PriorityUpdateForm ticketId={ticketId} currentPriorite={priorite} />
        </div>

        {/* Statut */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Statut</span>
          <StatusUpdateForm
            ticketId={ticketId}
            currentStatut={statut}
            clientsDuProjet={clientsDuProjet}
            clientIdActuel={clientIdActuel}
          />
        </div>

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
