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
import { TICKET_PRIORITES, TICKET_PRIORITE_LABELS, type TicketPriorite } from "@/lib/types";
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import { updateTicketPriorite, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function PriorityUpdateForm({
  ticketId,
  currentPriorite,
}: {
  ticketId: string;
  currentPriorite: TicketPriorite;
}) {
  const [state, formAction, isPending] = useActionState(
    updateTicketPriorite,
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
