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
import type { ClientOption } from "@/lib/queries/tickets";
import { attacherClient, detacherClient, type FormState } from "../actions";

const initialState: FormState = { error: null };

function DetachButton({ projetId, clientId }: { projetId: string; clientId: string }) {
  return (
    <form action={detacherClient}>
      <input type="hidden" name="projet_id" value={projetId} />
      <input type="hidden" name="client_id" value={clientId} />
      <Button type="submit" variant="ghost" size="sm" className="text-destructive h-7 px-2">
        Retirer
      </Button>
    </form>
  );
}

export function ClientsRattachesPanel({
  projetId,
  clientsRattaches,
  clientsDisponibles,
}: {
  projetId: string;
  clientsRattaches: ClientOption[];
  /** Tous les clients existants, moins ceux déjà rattachés (calculé côté page). */
  clientsDisponibles: ClientOption[];
}) {
  const [state, formAction, isPending] = useActionState(attacherClient, initialState);

  return (
    <div className="flex flex-col gap-3">
      {clientsRattaches.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun client rattaché.</p>
      )}
      {clientsRattaches.length > 0 && (
        <ul className="flex flex-col divide-y">
          {clientsRattaches.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-1.5">
              <span className="text-sm">{c.full_name || c.email || c.id}</span>
              <DetachButton projetId={projetId} clientId={c.id} />
            </li>
          ))}
        </ul>
      )}

      {clientsDisponibles.length > 0 && (
        <form action={formAction} className="flex items-end gap-2 border-t pt-3">
          <input type="hidden" name="projet_id" value={projetId} />
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-muted-foreground">Rattacher un client</span>
            <Select name="client_id" required>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder="Choisir un client" />
              </SelectTrigger>
              <SelectContent>
                {clientsDisponibles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name || c.email || c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "..." : "Ajouter"}
          </Button>
        </form>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </div>
  );
}
