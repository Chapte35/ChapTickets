"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Composant sans rendu visuel monté dans les layouts admin et dashboard.
 * Écoute l'événement "projet-sidebar-change" émis par ProjetSelectorSidebar
 * et déclenche un router.refresh() pour que le Server Component de la page
 * courante relise le cookie et recharge son contenu filtré.
 *
 * Un seul composant pour toutes les pages — plus besoin de dupliquer
 * la logique dans chaque TicketFiltersBar ou page individuelle.
 */
export function ProjetRefreshListener() {
  const router = useRouter();

  useEffect(() => {
    function onSidebarChange() {
      router.refresh();
    }
    window.addEventListener("projet-sidebar-change", onSidebarChange);
    return () => window.removeEventListener("projet-sidebar-change", onSidebarChange);
  }, [router]);

  return null;
}
