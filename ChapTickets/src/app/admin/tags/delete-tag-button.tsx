"use client";

import { X } from "lucide-react";
import { deleteTag } from "./actions";

export function DeleteTagButton({ tagId }: { tagId: string }) {
  return (
    <form
      action={deleteTag}
      onSubmit={(e) => {
        if (!confirm("Supprimer ce tag ? Il sera retiré de tous les tickets qui l'utilisent.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="tag_id" value={tagId} />
      <button
        type="submit"
        className="text-muted-foreground hover:text-destructive"
        aria-label="Supprimer le tag"
      >
        <X className="size-3.5" />
      </button>
    </form>
  );
}
