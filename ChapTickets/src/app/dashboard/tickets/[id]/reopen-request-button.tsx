"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DEMANDE_REOUVERTURE_STATUT_LABELS,
  type DemandeReouvertureStatut,
} from "@/lib/types";
import { demanderReouverture, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function ReopenRequestButton({
  ticketId,
  demandeEnCours,
}: {
  ticketId: string;
  /** Demande la plus récente pour ce ticket, si elle existe déjà. */
  demandeEnCours: { statut: DemandeReouvertureStatut } | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    demanderReouverture,
    initialState
  );

  if (demandeEnCours?.statut === "en_attente") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Demande de réouverture envoyée
        </span>
        <Badge>{DEMANDE_REOUVERTURE_STATUT_LABELS.en_attente}</Badge>
      </div>
    );
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Demander une réouverture
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 max-w-sm">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <Textarea
        name="message"
        placeholder="Pourquoi souhaites-tu rouvrir ce ticket ? (optionnel)"
        rows={3}
      />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Envoi..." : "Envoyer la demande"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
