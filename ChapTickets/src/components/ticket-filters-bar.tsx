"use client";

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
  TICKET_STATUTS,
  TICKET_PRIORITES,
  TICKET_STATUT_LABELS,
  TICKET_PRIORITE_LABELS,
  TICKET_TRIS,
  TICKET_TRI_LABELS,
} from "@/lib/types";
import type { ProjetOption, ClientOption } from "@/lib/queries/tickets";

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

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
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
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
