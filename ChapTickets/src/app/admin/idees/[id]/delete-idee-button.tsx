"use client";

import { Button } from "@/components/ui/button";
import { deleteIdee } from "../actions";

export function DeleteIdeeButton({ ideeId }: { ideeId: string }) {
  return (
    <form
      action={deleteIdee}
      onSubmit={(e) => {
        if (!confirm("Supprimer définitivement cette idée ?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="idee_id" value={ideeId} />
      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
        Supprimer
      </Button>
    </form>
  );
}
