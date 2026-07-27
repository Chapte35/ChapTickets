"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import { updateProjet, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function ProjetEditForm({
  projetId,
  nom,
  description,
  codeCourt,
}: {
  projetId: string;
  nom: string;
  description: string | null;
  codeCourt: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateProjet, initialState);

  useToastOnSuccess(isPending, state.error, "Projet mis à jour.");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="projet_id" value={projetId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="nom">Nom</Label>
        <Input id="nom" name="nom" defaultValue={nom} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="code_court">
          Code court{" "}
          <span className="text-muted-foreground font-normal text-xs">(ex : CHAP → CHAP#32)</span>
        </Label>
        <Input
          id="code_court"
          name="code_court"
          defaultValue={codeCourt ?? ""}
          maxLength={10}
          placeholder="CHAP"
          className="uppercase"
        />
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
