"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TICKET_STATUTS,
  TICKET_PRIORITES,
  TICKET_STATUT_LABELS,
  TICKET_PRIORITE_LABELS,
  TICKET_TRIS,
  TICKET_TRI_LABELS,
} from "@/lib/types";
import type { ProjetOption, ClientOption } from "@/lib/queries/tickets";
import { PROJET_SELECTOR_STORAGE_KEY } from "@/components/projet-selector-sidebar";

const ALL = "__all__";

/**
 * `clients` est optionnel : côté client (dashboard), il n'y a pas de filtre
 * "client" puisqu'il n'y a que soi-même.
 */
export function TicketFiltersBar({
  projets,
  clients,
}: {
  projets: ProjetOption[];
  clients?: ClientOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [projetSidebarId, setProjetSidebarId] = useState<string | null>(null);

  // Au montage : restaure le projet depuis localStorage et l'injecte dans l'URL
  // Écoute aussi l'événement dispatché par ProjetSelectorSidebar quand
  // l'utilisateur change de projet pendant qu'il est déjà sur la page tickets.
  useEffect(() => {
    function appliquerProjet(id: string | null) {
      setProjetSidebarId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("projet", id);
      } else {
        params.delete("projet");
      }
      const url = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
      router.replace(url);
    }

    // Lecture initiale au montage
    const stored = localStorage.getItem(PROJET_SELECTOR_STORAGE_KEY);
    if (stored) {
      const valide = projets.some((p) => p.id === stored);
      if (valide) {
        if (searchParams.get("projet") !== stored) {
          appliquerProjet(stored);
        } else {
          setProjetSidebarId(stored);
        }
      } else {
        localStorage.removeItem(PROJET_SELECTOR_STORAGE_KEY);
      }
    }

    // Écoute les changements depuis la sidebar
    function onSidebarChange(e: Event) {
      const id = (e as CustomEvent<string | null>).detail;
      appliquerProjet(id);
    }
    window.addEventListener("projet-sidebar-change", onSidebarChange);
    return () => window.removeEventListener("projet-sidebar-change", onSidebarChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtreProjétVerrouille = projetSidebarId !== null;

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    // Si un projet sidebar est actif et que ce n'est pas lui qu'on modifie,
    // on s'assure qu'il reste dans les params (défense en profondeur au cas
    // où le replace du montage ne serait pas encore reflété dans searchParams).
    if (projetSidebarId && key !== "projet") {
      params.set("projet", projetSidebarId);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = searchParams.size > 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={searchParams.get("statut") ?? ALL}
        onValueChange={(v) => setParam("statut", v)}
      >
        <SelectTrigger size="sm" className="w-[180px]">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les statuts</SelectItem>
          {TICKET_STATUTS.map((s) => (
            <SelectItem key={s} value={s}>
              {TICKET_STATUT_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("priorite") ?? ALL}
        onValueChange={(v) => setParam("priorite", v)}
      >
        <SelectTrigger size="sm" className="w-[160px]">
          <SelectValue placeholder="Priorité" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Toutes priorités</SelectItem>
          {TICKET_PRIORITES.map((p) => (
            <SelectItem key={p} value={p}>
              {TICKET_PRIORITE_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filtreProjétVerrouille ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex">
              <Select
                value={searchParams.get("projet") ?? projetSidebarId ?? ALL}
                disabled
              >
                <SelectTrigger size="sm" className="w-[180px] opacity-60 cursor-not-allowed">
                  <SelectValue placeholder="Projet" />
                </SelectTrigger>
                <SelectContent>
                  {projets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Projet fixé via le sélecteur de la sidebar
          </TooltipContent>
        </Tooltip>
      ) : (
        <Select
          value={searchParams.get("projet") ?? ALL}
          onValueChange={(v) => setParam("projet", v)}
        >
          <SelectTrigger size="sm" className="w-[180px]">
            <SelectValue placeholder="Projet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les projets</SelectItem>
            {projets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {clients && (
        <Select
          value={searchParams.get("client") ?? ALL}
          onValueChange={(v) => setParam("client", v)}
        >
          <SelectTrigger size="sm" className="w-[200px]">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name || c.email || c.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={searchParams.get("tri") ?? ALL}
        onValueChange={(v) => setParam("tri", v)}
      >
        <SelectTrigger size="sm" className="w-[200px]">
          <SelectValue placeholder="Trier par" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{TICKET_TRI_LABELS.recent} (défaut)</SelectItem>
          {TICKET_TRIS.filter((t) => t !== "recent").map((t) => (
            <SelectItem key={t} value={t}>
              {TICKET_TRI_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // On réinitialise tous les filtres sauf le projet sidebar s'il est actif
            if (projetSidebarId) {
              router.push(`${pathname}?projet=${projetSidebarId}`);
            } else {
              router.push(pathname);
            }
          }}
        >
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
