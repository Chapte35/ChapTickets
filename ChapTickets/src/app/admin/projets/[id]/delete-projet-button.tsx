"use client";

import { Button } from "@/components/ui/button";
import { deleteProjet } from "../actions";

export function DeleteProjetButton({ projetId }: { projetId: string }) {
  return (
    <form
      action={deleteProjet}
      onSubmit={(e) => {
        if (
          !confirm(
            "Supprimer ce projet ? Les tickets qui y sont rattachés ne pourront pas être supprimés en cascade (contrainte on delete restrict) — il faut d'abord les traiter."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projet_id" value={projetId} />
      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
        Supprimer
      </Button>
    </form>
  );
}
