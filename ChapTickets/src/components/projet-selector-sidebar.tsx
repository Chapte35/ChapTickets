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

export const PROJET_SELECTOR_COOKIE = "chaptickets_selected_projet_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an
const ALL = "__all__";

/**
 * Sélecteur de projet persisté en cookie (path=/, max-age 1 an).
 * Remplace l'ancienne persistance localStorage qui causait un flash au
 * chargement : le cookie est lu directement par le Server Component de la
 * page tickets sans attendre le JS client.
 *
 * Rôle unique : stocker le projet actif.
 * Ce composant ne navigue jamais, ne touche pas à l'URL directement.
 * Il émet un CustomEvent "projet-sidebar-change" écouté par TicketFiltersBar
 * pour appliquer le filtre dans l'URL quand l'utilisateur change de projet
 * pendant qu'il est déjà sur la page tickets.
 *
 * Masqué si sidebar collapsed ou si l'utilisateur n'a qu'un seul projet.
 */
export function ProjetSelectorSidebar({
  projets,
  collapsed,
  projetInitial,
}: {
  projets: ProjetOption[];
  collapsed: boolean;
  basePath: "/admin" | "/dashboard"; // conservé pour compatibilité prop
  /** Valeur lue côté serveur depuis le cookie — évite le flash au montage. */
  projetInitial?: string | null;
}) {
  const [projetId, setProjetId] = useState<string>(
    projetInitial && projets.some((p) => p.id === projetInitial)
      ? projetInitial
      : ALL
  );

  // Nettoyage de l'ancienne clé localStorage si elle trainait
  useEffect(() => {
    try {
      localStorage.removeItem("chaptickets_selected_projet_id");
    } catch {
      // localStorage peut être inaccessible en contexte privé/SSR
    }
  }, []);

  function handleChange(value: string) {
    setProjetId(value);
    if (value === ALL) {
      // Expire le cookie immédiatement
      document.cookie = `${PROJET_SELECTOR_COOKIE}=; path=/; max-age=0`;
    } else {
      document.cookie = `${PROJET_SELECTOR_COOKIE}=${value}; path=/; max-age=${COOKIE_MAX_AGE}`;
    }
    window.dispatchEvent(
      new CustomEvent("projet-sidebar-change", {
        detail: value === ALL ? null : value,
      })
    );
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

// Compat : ancienne clé localStorage gardée pour la migration (nettoyage côté client)
export const PROJET_SELECTOR_STORAGE_KEY = "chaptickets_selected_projet_id";
