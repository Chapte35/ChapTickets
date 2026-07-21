"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { creerSprint, type SprintFormState } from "@/lib/actions/sprints";

const initialState: SprintFormState = { error: null };

export function SprintForm({
  projetId,
  ticketsDisponibles,
  onSuccess,
}: {
  projetId: string;
  ticketsDisponibles: { id: string; titre: string }[];
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(creerSprint, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!isPending && state.error === null && state !== initialState) {
      router.refresh();
      onSuccess?.();
    }
  }, [isPending, state, router, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="projet_id" value={projetId} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nom">Nom du sprint</Label>
        <Input id="nom" name="nom" placeholder="Sprint 1" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date_debut">Date de début</Label>
        <Input id="date_debut" name="date_debut" type="date" required />
      </div>

      {ticketsDisponibles.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Tickets à inclure (optionnel)</Label>
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto rounded-md border p-2">
            {ticketsDisponibles.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <Checkbox
                  id={`ticket-${t.id}`}
                  name="ticket_ids[]"
                  value={t.id}
                />
                <label
                  htmlFor={`ticket-${t.id}`}
                  className="text-sm cursor-pointer truncate"
                >
                  {t.titre}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Création…" : "Créer le sprint"}
      </Button>
    </form>
  );
}
