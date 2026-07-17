"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { transformerEnProjet, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function TransformerEnProjetForm({
  ideeId,
  titreInitial,
}: {
  ideeId: string;
  titreInitial: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    transformerEnProjet,
    initialState
  );

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Transformer en projet
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 max-w-sm">
      <input type="hidden" name="idee_id" value={ideeId} />
      <label className="text-xs text-muted-foreground" htmlFor="titre-projet">
        Nom du projet (modifiable, pré-rempli avec le titre de l&apos;idée)
      </label>
      <Input id="titre-projet" name="titre" defaultValue={titreInitial} required />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Création..." : "Confirmer"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
