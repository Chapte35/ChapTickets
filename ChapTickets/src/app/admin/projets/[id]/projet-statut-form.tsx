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
import { PROJET_STATUTS, PROJET_STATUT_LABELS, type ProjetStatut } from "@/lib/types";
import { updateProjetStatutForm, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function ProjetStatutForm({
  projetId,
  currentStatut,
}: {
  projetId: string;
  currentStatut: ProjetStatut;
}) {
  const [state, formAction, isPending] = useActionState(
    updateProjetStatutForm,
    initialState
  );

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="projet_id" value={projetId} />
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Statut</span>
        <Select name="statut" defaultValue={currentStatut}>
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROJET_STATUTS.map((s) => (
              <SelectItem key={s} value={s}>
                {PROJET_STATUT_LABELS[s]}
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
