"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import { updateRefClient, type FormState } from "@/lib/actions/ticket-ref";

const initialState: FormState = { error: null };

/**
 * Éditable par l'admin ET le client (cf. clarification sprint 12) — même
 * composant monté des deux côtés, la sécurité réelle vit en base (RLS +
 * trigger, migration 0014), pas dans ce composant.
 */
export function RefClientDisplay({
  ticketId,
  refClient,
}: {
  ticketId: string;
  refClient: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(updateRefClient, initialState);

  useToastOnSuccess(isPending, state.error, "Référence enregistrée.");

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) setEditing(false);
    wasPending.current = isPending;
  }, [isPending, state.error]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground group"
      >
        <span>Réf. client : {refClient || <span className="italic">non renseignée</span>}</span>
        <Pencil className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <Input
        name="ref_client"
        defaultValue={refClient ?? ""}
        placeholder="Ta référence..."
        autoFocus
        className="h-7 text-xs w-[160px]"
        maxLength={100}
      />
      <Button type="submit" size="icon" variant="ghost" className="size-6" disabled={isPending}>
        <Check className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-6"
        onClick={() => setEditing(false)}
      >
        <X className="size-3.5" />
      </Button>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
