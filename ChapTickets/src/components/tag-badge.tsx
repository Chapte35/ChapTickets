import { cn } from "@/lib/utils";
import { TAG_COLOR_CLASSES, type Tag } from "@/lib/types";

export function TagChip({ tag, className }: { tag: Pick<Tag, "nom" | "couleur">; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        TAG_COLOR_CLASSES[tag.couleur],
        className
      )}
    >
      {tag.nom}
    </span>
  );
}
