"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bouton "retour" générique basé sur l'historique du navigateur
 * (`router.back()`), pas un lien statique vers une route fixe : la page
 * précédente dépend d'où l'utilisateur venait (liste filtrée, kanban,
 * résultat de recherche ⌘K...), un lien en dur vers "/admin/tickets" par
 * exemple perdrait ce contexte (filtres, scroll).
 */
export function BackButton({ label = "Retour" }: { label?: string }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-fit gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
      onClick={() => router.back()}
    >
      <ArrowLeft className="size-4" />
      {label}
    </Button>
  );
}
