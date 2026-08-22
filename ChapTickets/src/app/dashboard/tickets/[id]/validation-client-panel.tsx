"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DEMANDE_REOUVERTURE_STATUT_LABELS,
  type DemandeReouvertureStatut,
} from "@/lib/types";
import { validerTicketClient, demanderReouverture, type FormState } from "../actions";

const initialState: FormState = { error: null };

type Mode = null | "valider" | "bug";

/**
 * Panneau affiché sur la fiche ticket client quand le statut est
 * "en_attente_client". Deux actions :
 *
 * - Valider → passe en "resolu" + commentaire optionnel dans le thread
 * - Bug persistant → crée une demande de réouverture (admin valide)
 *
 * Une fois une demande de réouverture en attente, on masque les deux
 * boutons et on affiche l'état de la demande.
 */
export function ValidationClientPanel({
  ticketId,
  demandeEnCours,
}: {
  ticketId: string;
  demandeEnCours: { statut: DemandeReouvertureStatut } | null;
}) {
  const [mode, setMode] = useState<Mode>(null);

  const [validerState, validerAction, validerPending] = useActionState(
    validerTicketClient,
    initialState
  );
  const [bugState, bugAction, bugPending] = useActionState(
    demanderReouverture,
    initialState
  );

  // Demande de réouverture déjà en attente — on ne propose plus rien
  if (demandeEnCours?.statut === "en_attente") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Signalement envoyé, en attente de traitement
        </span>
        <Badge>{DEMANDE_REOUVERTURE_STATUT_LABELS.en_attente}</Badge>
      </div>
    );
  }

  // Choix initial
  if (mode === null) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Le ticket est en attente de ton retour.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => setMode("valider")}>
            ✓ Valider — tout est bon
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMode("bug")}
          >
            Le bug persiste
          </Button>
        </div>
      </div>
    );
  }

  // Formulaire de validation
  if (mode === "valider") {
    return (
      <form action={validerAction} className="flex flex-col gap-2 max-w-sm">
        <input type="hidden" name="ticket_id" value={ticketId} />
        <Textarea
          name="commentaire"
          placeholder="Commentaire optionnel (merci, retour, précision…)"
          rows={3}
        />
        {validerState.error && (
          <p role="alert" className="text-sm text-destructive">
            {validerState.error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={validerPending}>
            {validerPending ? "Validation..." : "Confirmer la validation"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setMode(null)}
            disabled={validerPending}
          >
            Retour
          </Button>
        </div>
      </form>
    );
  }

  // Formulaire bug persistant → demande de réouverture
  return (
    <form action={bugAction} className="flex flex-col gap-2 max-w-sm">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <Textarea
        name="message"
        placeholder="Décris ce qui ne fonctionne pas encore…"
        rows={3}
      />
      {bugState.error && (
        <p role="alert" className="text-sm text-destructive">
          {bugState.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={bugPending}>
          {bugPending ? "Envoi..." : "Signaler le problème"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setMode(null)}
          disabled={bugPending}
        >
          Retour
        </Button>
      </div>
    </form>
  );
}
