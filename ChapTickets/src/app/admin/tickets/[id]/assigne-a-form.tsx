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
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import { updateAssigneA, type FormState } from "@/lib/actions/ticket-assigne";
import type { ClientOption } from "@/lib/queries/tickets";

const initialState: FormState = { error: null };

const NON_ASSIGNE = "__aucun__";

export function AssigneAForm({
  ticketId,
  assigneAId,
  profils,
}: {
  ticketId: string;
  assigneAId: string | null;
  profils: ClientOption[];
}) {
  const [state, formAction, isPending] = useActionState(updateAssigneA, initialState);

  useToastOnSuccess(isPending, state.error, "Assignation mise à jour.");

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <Select
        name="assigne_a"
        defaultValue={assigneAId ?? NON_ASSIGNE}
      >
        <SelectTrigger size="sm" className="w-[180px]">
          <SelectValue placeholder="Non assigné" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NON_ASSIGNE}>— Non assigné</SelectItem>
          {profils.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.full_name || p.email || p.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "..." : "OK"}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-destructive self-center">
          {state.error}
        </p>
      )}
    </form>
  );
}
