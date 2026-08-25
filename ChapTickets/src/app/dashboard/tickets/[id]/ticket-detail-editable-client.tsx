"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InlineEditField } from "@/components/inline-edit-field";
import { TicketTagsEditor } from "@/components/ticket-tags-editor";
import { PrioriteBadge } from "@/components/priorite-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TICKET_PRIORITES,
  TICKET_PRIORITE_LABELS,
  type TicketPriorite,
  type TicketStatut,
  type Tag,
} from "@/lib/types";
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import {
  updateTicketTitreClient,
  updateTicketDescriptionClient,
  updateTicketPrioriteClient,
} from "../actions";

type FormState = { error: string | null };
const initialState: FormState = { error: null };

/**
 * Sélecteur de priorité pour le client — uniquement rendu si le client
 * est l'auteur du ticket (estAuteur = true). Sinon badge lecture seule.
 */
function ClientPriorityForm({
  ticketId,
  currentPriorite,
}: {
  ticketId: string;
  currentPriorite: TicketPriorite;
}) {
  const [state, formAction, isPending] = useActionState(
    updateTicketPrioriteClient,
    initialState
  );

  useToastOnSuccess(isPending, state.error, "Priorité mise à jour.");

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <Select name="priorite" defaultValue={currentPriorite}>
        <SelectTrigger size="sm" className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TICKET_PRIORITES.map((p) => (
            <SelectItem key={p} value={p}>
              {TICKET_PRIORITE_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? "..." : "Mettre à jour"}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-destructive self-center">
          {state.error}
        </p>
      )}
    </form>
  );
}

/**
 * Fiche ticket client : titre, description, tags et priorité regroupés
 * dans une seule Card.
 * La priorité est éditable uniquement si le client est l'auteur du ticket
 * (estAuteur = true). Dans le cas contraire un badge lecture seule est affiché.
 * Les champs structurels (assigné, statut…) restent dans la colonne droite.
 */
export function TicketDetailEditableClient({
  ticketId,
  titre,
  description,
  priorite,
  statut: _statut,
  projetNom,
  dateEcheance,
  tags,
  tousLesTags,
  refAffichee,
  estAuteur,
}: {
  ticketId: string;
  titre: string;
  description: string;
  priorite: TicketPriorite;
  statut: TicketStatut;
  projetNom: string | null;
  dateEcheance: string | null;
  tags: Tag[];
  tousLesTags: Tag[];
  refAffichee?: string;
  /** True si auth.uid() === created_by — autorise la modification de priorité. */
  estAuteur: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <p className="text-xs text-muted-foreground">
          {refAffichee && <span className="font-mono mr-1">{refAffichee}</span>}
          {projetNom ?? "—"}
        </p>

        {/* Titre éditable — textarea auto-height */}
        <InlineEditField
          ticketId={ticketId}
          valeurInitiale={titre}
          mode="title"
          action={updateTicketTitreClient}
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

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Tags</span>
          <TicketTagsEditor
            ticketId={ticketId}
            tagsActuels={tags}
            tousLesTags={tousLesTags}
          />
        </div>

        {/* Priorité — éditable si auteur, lecture seule sinon */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Priorité</span>
          {estAuteur ? (
            <ClientPriorityForm ticketId={ticketId} currentPriorite={priorite} />
          ) : (
            <PrioriteBadge priorite={priorite} />
          )}
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
