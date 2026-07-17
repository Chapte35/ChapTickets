"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IDEE_STATUTS, IDEE_STATUT_LABELS, type IdeeProjetStatut } from "@/lib/types";
import { updateIdee, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function IdeeEditForm({
  ideeId,
  titre,
  description,
  statut,
}: {
  ideeId: string;
  titre: string;
  description: string | null;
  statut: IdeeProjetStatut;
}) {
  const [state, formAction, isPending] = useActionState(updateIdee, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="idee_id" value={ideeId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="titre">Titre</Label>
        <Input id="titre" name="titre" defaultValue={titre} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={description ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Statut</Label>
        <Select name="statut" defaultValue={statut}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IDEE_STATUTS.map((s) => (
              <SelectItem key={s} value={s}>
                {IDEE_STATUT_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
