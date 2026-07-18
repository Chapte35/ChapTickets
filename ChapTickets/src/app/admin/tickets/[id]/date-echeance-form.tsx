"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateDateEcheance, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function DateEcheanceForm({
  ticketId,
  dateActuelle,
}: {
  ticketId: string;
  dateActuelle: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateDateEcheance, initialState);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Échéance (calendrier)</span>
        <Input
          type="date"
          name="date_prevue"
          defaultValue={dateActuelle ?? ""}
          className="h-8 w-[160px] text-sm"
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? "..." : "Enregistrer"}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-destructive self-center">
          {state.error}
        </p>
      )}
    </form>
  );
}
