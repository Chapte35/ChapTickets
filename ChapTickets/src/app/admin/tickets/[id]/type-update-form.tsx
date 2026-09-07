"use client";

import { useActionState, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  TICKET_TYPES,
  TICKET_TYPE_LABELS,
  type TicketType,
} from "@/lib/types";
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import { updateTicketType, type FormState } from "../actions";
import { TicketTypeBadge } from "@/components/ticket-type-badge";

const initialState: FormState = { error: null };
const AUCUN_TYPE = "__aucun__";

export function TypeUpdateForm({
  ticketId,
  currentType,
}: {
  ticketId: string;
  currentType: TicketType | null;
}) {
  const [typeLocal, setTypeLocal] = useState<string>(currentType ?? AUCUN_TYPE);
  // Garde la valeur soumise pour pouvoir la restaurer après le refresh
  const typeSubmis = useRef<string>(currentType ?? AUCUN_TYPE);
  const [state, formAction, isPending] = useActionState(updateTicketType, initialState);
  const router = useRouter();

  useToastOnSuccess(isPending, state.error, "Type mis à jour.", () => {
    window.dispatchEvent(new CustomEvent("ticket-historique-refresh"));
    // Mettre à jour l'affichage local avec la valeur effectivement sauvegardée
    setTypeLocal(typeSubmis.current);
    router.refresh();
  });

  return (
    <form
      action={formAction}
      className="flex items-end gap-2"
      onSubmit={() => {
        // Mémoriser la valeur en cours de soumission
        typeSubmis.current = typeLocal;
      }}
    >
      <input type="hidden" name="ticket_id" value={ticketId} />
      <Select
        name="type_ticket"
        value={typeLocal}
        onValueChange={setTypeLocal}
      >
        <SelectTrigger size="sm" className="w-[220px]">
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
      {state.error && (
        <p role="alert" className="text-sm text-destructive self-center">
          {state.error}
        </p>
      )}
    </form>
  );
}
