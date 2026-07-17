"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <input type="hidden" name="demande_id" value={demandeId} />
      <Button
        type="submit"
        name="decision"
        value="acceptee"
        size="sm"
        disabled={isPending}
      >
        Accepter
      </Button>
      <Button
        type="submit"
        name="decision"
        value="refusee"
        size="sm"
        variant="outline"
        disabled={isPending}
      >
        Refuser
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
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
          {d.statut === "en_attente" && (
            <DecisionButtons ticketId={ticketId} demandeId={d.id} />
          )}
        </div>
      ))}
    </div>
  );
}
