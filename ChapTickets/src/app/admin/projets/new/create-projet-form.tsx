"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProjet, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function CreateProjetForm() {
  const [state, formAction, isPending] = useActionState(createProjet, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nom">Nom</Label>
        <Input id="nom" name="nom" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Création..." : "Créer le projet"}
      </Button>
    </form>
  );
}
