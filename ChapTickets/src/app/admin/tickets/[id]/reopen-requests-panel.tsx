"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DEMANDE_REOUVERTURE_STATUT_LABELS,
  type DemandeReouvertureStatut,
} from "@/lib/types";
import { traiterDemandeReouverture, type FormState } from "../actions";

const initialState: FormState = { error: null };

export type DemandeReouverture = {
  id: string;
  message: string | null;
  statut: DemandeReouvertureStatut;
  created_at: string;
  nouveau_ticket_id: string | null;
  commentaire_refus: string | null;
  profiles: { email: string | null; full_name: string | null } | null;
};

function DecisionButtons({
  ticketId,
  demandeId,
}: {
  ticketId: string;
  demandeId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    traiterDemandeReouverture,
    initialState
  );
  const [showRefus, setShowRefus] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <input type="hidden" name="demande_id" value={demandeId} />
      {showRefus && (
        <Textarea
          name="commentaire_refus"
          placeholder="Motif du refus (optionnel, visible par le client)"
          rows={2}
          className="text-sm"
        />
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" name="decision" value="acceptee" size="sm" disabled={isPending}>
          Accepter
        </Button>
        {!showRefus ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowRefus(true)}
          >
            Refuser
          </Button>
        ) : (
          <Button type="submit" name="decision" value="refusee" size="sm" variant="outline" disabled={isPending}>
            Confirmer le refus
          </Button>
        )}
        {showRefus && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowRefus(false)}>
            Annuler
          </Button>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
    </form>
  );
}

export function ReopenRequestsPanel({
  ticketId,
  demandes,
}: {
  ticketId: string;
  demandes: DemandeReouverture[];
}) {
  if (demandes.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <h2 className="text-sm font-semibold">Demandes de réouverture</h2>
      {demandes.map((d) => (
        <div key={d.id} className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {d.profiles?.full_name || d.profiles?.email || "Client"}
            </span>
            <Badge variant={d.statut === "en_attente" ? "default" : "outline"}>
              {DEMANDE_REOUVERTURE_STATUT_LABELS[d.statut]}
            </Badge>
          </div>
          {d.message && (
            <p className="text-sm text-muted-foreground">{d.message}</p>
          )}
          {d.commentaire_refus && (
            <p className="text-sm text-muted-foreground italic">
              Motif du refus : {d.commentaire_refus}
            </p>
          )}
          {d.statut === "acceptee" && d.nouveau_ticket_id && (
            <Link
              href={`/admin/tickets/${d.nouveau_ticket_id}`}
              className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground w-fit"
            >
              Voir le nouveau ticket →
            </Link>
          )}
          {d.statut === "en_attente" && (
            <DecisionButtons ticketId={ticketId} demandeId={d.id} />
          )}
        </div>
      ))}
    </div>
  );
}
