"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjetOption } from "@/lib/queries/tickets";

const STORAGE_KEY = "chaptickets_selected_projet_id";
const ALL = "__all__";

/**
 * Sélecteur de projet persisté en localStorage, affiché dans la sidebar
 * au-dessus des liens de navigation (admin ET dashboard).
 *
 * Rôle unique : stocker le projet actif. C'est tout.
 * La page tickets lit ce localStorage au montage et applique le filtre.
 * Ce composant ne navigue jamais, ne touche pas à l'URL.
 *
 * Masqué si sidebar collapsed ou si l'utilisateur n'a qu'un seul projet.
 */
export function ProjetSelectorSidebar({
  projets,
  collapsed,
}: {
  projets: ProjetOption[];
  collapsed: boolean;
  basePath: "/admin" | "/dashboard"; // conservé pour compatibilité prop, non utilisé
}) {
  const [projetId, setProjetId] = useState<string>(ALL);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const valide = projets.some((p) => p.id === stored);
      if (valide) {
        setProjetId(stored);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [projets]);

  function handleChange(value: string) {
    setProjetId(value);
    if (value === ALL) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, value);
    }
    // Signale aux autres composants (TicketFiltersBar) que le projet actif a changé
    window.dispatchEvent(new CustomEvent("projet-sidebar-change", { detail: value === ALL ? null : value }));
  }

  if (projets.length <= 1 || collapsed) return null;

  const projetActif = projets.find((p) => p.id === projetId);

  return (
    <div className="px-2 pb-2">
      <Select value={projetId} onValueChange={handleChange}>
        <SelectTrigger
          size="sm"
          className="w-full h-7 text-xs"
          title={projetActif ? `Projet actif : ${projetActif.nom}` : "Tous les projets"}
        >
          <SelectValue placeholder="Tous les projets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            <span className="text-muted-foreground">Tous les projets</span>
          </SelectItem>
          {projets.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { STORAGE_KEY as PROJET_SELECTOR_STORAGE_KEY };
