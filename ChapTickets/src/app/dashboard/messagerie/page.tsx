import { MessageCircle } from "lucide-react";

/**
 * La liste des conversations vit désormais dans layout.tsx (sidebar
 * persistante, façon Instagram) — cette page ne s'affiche que quand
 * aucune conversation n'est sélectionnée.
 */
export default function MessagerieClientIndexPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <MessageCircle className="size-8" />
      <p className="text-sm">Sélectionne une conversation à gauche.</p>
    </div>
  );
}
