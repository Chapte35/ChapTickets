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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  TICKET_STATUTS,
  TICKET_PRIORITES,
  TICKET_STATUT_LABELS,
  TICKET_PRIORITE_LABELS,
  TICKET_TRIS,
  TICKET_TRI_LABELS,
} from "@/lib/types";
import type { ClientOption } from "@/lib/queries/tickets";

const ALL = "__all__";

/**
 * Barre de filtres tickets — statut, priorité, client (admin only), tri, fermés.
 *
 * Le filtre projet est géré exclusivement par le sélecteur de la sidebar
 * (cookie `chaptickets_selected_projet_id` lu côté serveur). Ce composant
 * n'a plus aucune logique projet : pas de select, pas de param URL ?projet,
 * pas de lecture/écriture de cookie projet ici.
 *
 * Quand la sidebar change de projet, elle émet "projet-sidebar-change" et
 * écrit le cookie — on déclenche un router.refresh() pour que le Server
 * Component recharge avec le nouveau filtre.
 */
export function TicketFiltersBar({
  clients,
}: {
  clients?: ClientOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const inclureFermes = searchParams.get("inclure_fermes") === "1";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleInclureFermes(checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set("inclure_fermes", "1");
    } else {
      params.delete("inclure_fermes");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const paramsHorsFermes = new URLSearchParams(searchParams.toString());
  paramsHorsFermes.delete("inclure_fermes");
  const hasFilters = paramsHorsFermes.size > 0;

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

      <div className="flex items-center gap-2">
        <Checkbox
          id="inclure-fermes"
          checked={inclureFermes}
          onCheckedChange={(v) => toggleInclureFermes(v === true)}
        />
        <Label htmlFor="inclure-fermes" className="text-sm cursor-pointer select-none">
          Afficher les fermés
        </Label>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const params = new URLSearchParams();
            if (inclureFermes) params.set("inclure_fermes", "1");
            const url = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
            router.push(url);
          }}
        >
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
