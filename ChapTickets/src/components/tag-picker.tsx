"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TAG_COLOR_CLASSES, type Tag } from "@/lib/types";

export function TagPicker({
  tags,
  name = "tag_ids",
  defaultSelected = [],
  onSelectionChange,
}: {
  tags: Tag[];
  name?: string;
  defaultSelected?: string[];
  /** Optionnel : reçoit la liste des tags sélectionnés à chaque changement. Sert à l'aperçu live (création de ticket), pas nécessaire pour un simple usage dans un formulaire. */
  onSelectionChange?: (tagsSelectionnes: Tag[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange?.(tags.filter((t) => next.has(t.id)));
      return next;
    });
  }

  if (tags.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Aucun tag n&apos;existe encore.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isSelected = selected.has(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
              TAG_COLOR_CLASSES[tag.couleur],
              isSelected
                ? "opacity-100 ring-2 ring-offset-1 ring-offset-background ring-current"
                : "opacity-40 hover:opacity-70"
            )}
          >
            {tag.nom}
          </button>
        );
      })}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
    </div>
  );
}
