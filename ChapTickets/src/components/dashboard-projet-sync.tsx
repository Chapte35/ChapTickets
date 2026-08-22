"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PROJET_SELECTOR_STORAGE_KEY } from "@/components/projet-selector-sidebar";
import type { ProjetOption } from "@/lib/queries/tickets";

/**
 * Composant sans rendu visuel monté sur les pages dashboard (admin et client).
 * Même logique que TicketFiltersBar pour la synchronisation projet :
 * - Au montage : lit le localStorage, injecte ?projet=xxx dans l'URL si absent
 * - Écoute "projet-sidebar-change" : met à jour l'URL quand le sélecteur change
 *
 * On passe `projets` pour valider que le projet stocké existe toujours.
 */
export function DashboardProjetSync({ projets }: { projets: ProjetOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    function appliquerProjet(id: string | null) {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("projet", id);
      } else {
        params.delete("projet");
      }
      const url = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
      router.replace(url);
    }

    // Lecture initiale
    const stored = localStorage.getItem(PROJET_SELECTOR_STORAGE_KEY);
    if (stored) {
      const valide = projets.some((p) => p.id === stored);
      if (valide) {
        if (searchParams.get("projet") !== stored) {
          appliquerProjet(stored);
        }
      } else {
        localStorage.removeItem(PROJET_SELECTOR_STORAGE_KEY);
      }
    }

    // Écoute les changements depuis la sidebar
    function onSidebarChange(e: Event) {
      appliquerProjet((e as CustomEvent<string | null>).detail);
    }
    window.addEventListener("projet-sidebar-change", onSidebarChange);
    return () => window.removeEventListener("projet-sidebar-change", onSidebarChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
