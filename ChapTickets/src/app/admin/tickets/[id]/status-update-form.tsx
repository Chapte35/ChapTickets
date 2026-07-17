"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TICKET_STATUTS, TICKET_STATUT_LABELS, type TicketStatut } from "@/lib/types";
import { updateTicketStatus, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function StatusUpdateForm({
  ticketId,
  currentStatut,
}: {
  ticketId: string;
  currentStatut: TicketStatut;
}) {
  const [state, formAction, isPending] = useActionState(
    updateTicketStatus,
    initialState
  );

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Statut</span>
        <Select name="statut" defaultValue={currentStatut}>
          <SelectTrigger size="sm" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TICKET_STATUTS.map((s) => (
              <SelectItem key={s} value={s}>
                {TICKET_STATUT_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
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
