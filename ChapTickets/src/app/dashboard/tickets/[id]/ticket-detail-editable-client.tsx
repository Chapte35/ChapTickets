"use client";

import { useActionState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InlineEditField } from "@/components/inline-edit-field";
import { TicketTagsEditor } from "@/components/ticket-tags-editor";
import { TicketTypeBadge } from "@/components/ticket-type-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  TICKET_STATUT_LABELS,
  ticketStatutBadgeVariant,
  TICKET_TYPES,
  TICKET_TYPE_LABELS,
  type TicketPriorite,
  type TicketStatut,
  type TicketType,
  type Tag,
} from "@/lib/types";
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import {
  updateTicketTitreClient,
  updateTicketDescriptionClient,
  updateTicketPrioriteClient,
  updateTicketTypeClient,
} from "../actions";
import { MarkdownRenderer } from "@/components/markdown-renderer";

type FormState = { error: string | null };
const initialState: FormState = { error: null };
const AUCUN_TYPE = "__aucun__";

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
function ClientTypeForm({
  ticketId,
  currentType,
}: {
  ticketId: string;
  currentType: TicketType | null;
}) {
  const [state, formAction, isPending] = useActionState(updateTicketTypeClient, initialState);
  useToastOnSuccess(isPending, state.error, "Type mis à jour.");

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <Select name="type_ticket" defaultValue={currentType ?? AUCUN_TYPE}>
        <SelectTrigger size="sm" className="w-[200px]">
          <SelectValue placeholder="Aucun type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AUCUN_TYPE}>— Aucun type</SelectItem>
          {TICKET_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              <span className="flex items-center gap-1.5">
                <TicketTypeBadge type={t} variant="icon" />
                {TICKET_TYPE_LABELS[t]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? "..." : "Mettre à jour"}
      </Button>
      {state.error && <p role="alert" className="text-sm text-destructive self-center">{state.error}</p>}
    </form>
  );
}

export function TicketDetailEditableClient({
  ticketId,
  titre,
  description,
  priorite,
  statut,
  projetNom,
  dateEcheance,
  tags,
  tousLesTags,
  refAffichee,
  typeTicket,
  assigneNom,
  releaseNom,
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
  typeTicket?: TicketType | null;
  assigneNom?: string | null;
  releaseNom?: string | null;
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
        {/* Description éditable — éditeur riche Tiptap */}
        <InlineEditField
          ticketId={ticketId}
          valeurInitiale={description}
          mode="richtext"
          action={updateTicketDescriptionClient}
          placeholderVide="Ajouter une description…"
          renderRempli={(v) => <MarkdownRenderer content={v} />}
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

        {/* Priorité — éditable par tout client ayant accès au ticket */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Priorité</span>
          <ClientPriorityForm ticketId={ticketId} currentPriorite={priorite} />
        </div>

        {/* Statut — lecture seule côté client */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Statut</span>
          <Badge variant={ticketStatutBadgeVariant(statut)} className="w-fit">
            {TICKET_STATUT_LABELS[statut]}
          </Badge>
        </div>

        {/* Type — éditable */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Type</span>
          <ClientTypeForm ticketId={ticketId} currentType={typeTicket ?? null} />
        </div>

        {/* Assigné — lecture seule */}
        {assigneNom && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Assigné à</span>
            <span className="text-sm">{assigneNom}</span>
          </div>
        )}

        {releaseNom && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Version</span>
            <span className="text-sm">{releaseNom}</span>
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
