"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Premier clic : arme (icône devient une croix rouge). Deuxième clic tant
 * qu'armé : confirme et déclenche onConfirm. Se désarme tout seul après
 * quelques secondes si on ne reclique pas — évite de laisser un bouton
 * "prêt à supprimer" actif indéfiniment si l'utilisateur change d'avis en
 * silence (survol ailleurs, distraction, etc.).
 */
export function ConfirmDeleteButton({
  onConfirm,
  label = "Supprimer",
  size = "icon",
  delaiRearmementMs = 3000,
}: {
  onConfirm: () => void;
  label?: string;
  size?: "icon" | "text";
  delaiRearmementMs?: number;
}) {
  const [arme, setArme] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (arme) {
      timeoutRef.current = setTimeout(() => setArme(false), delaiRearmementMs);
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [arme, delaiRearmementMs]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!arme) {
      setArme(true);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setArme(false);
    onConfirm();
  }

  if (size === "text") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
          arme
            ? "border-destructive bg-destructive text-destructive-foreground"
            : "border-input hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
        )}
      >
        {arme ? <X className="size-3.5" /> : <Trash2 className="size-3.5" />}
        {arme ? "Confirmer ?" : label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={arme ? "Confirmer la suppression" : label}
      className={cn(
        "rounded p-1 transition-colors",
        arme
          ? "bg-destructive text-destructive-foreground"
          : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      )}
    >
      {arme ? <X className="size-3.5" /> : <Trash2 className="size-3.5" />}
    </button>
  );
}
