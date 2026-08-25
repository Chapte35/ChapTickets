"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  TICKET_STATUT_LABELS,
  TICKET_PRIORITE_LABELS,
  TICKET_TYPE_LABELS,
  type TicketStatut,
  type TicketPriorite,
  type TicketType,
} from "@/lib/types";

type EntreeHistorique = {
  id: string;
  champ: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null; role: string } | null;
};

/** Formate une valeur brute selon le champ pour l'affichage. */
function formaterValeur(champ: string, valeur: string | null): string {
  if (!valeur) return "—";
  switch (champ) {
    case "statut":
      return TICKET_STATUT_LABELS[valeur as TicketStatut] ?? valeur;
    case "priorite":
      return TICKET_PRIORITE_LABELS[valeur as TicketPriorite] ?? valeur;
    case "type_ticket":
      return TICKET_TYPE_LABELS[valeur as TicketType] ?? valeur;
    case "description":
      return valeur.length > 60 ? valeur.slice(0, 60) + "…" : valeur;
    default:
      return valeur;
  }
}

const CHAMP_LABELS: Record<string, string> = {
  statut: "Statut",
  priorite: "Priorité",
  type_ticket: "Type",
  titre: "Titre",
  description: "Description",
  assigne_a: "Assigné à",
};

export function TicketHistorique({ ticketId }: { ticketId: string }) {
  const [entrees, setEntrees] = useState<EntreeHistorique[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function charger() {
      const supabase = createClient();
      const { data } = await supabase
        .from("ticket_historique")
        .select("id, champ, ancienne_valeur, nouvelle_valeur, created_at, changed_by")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      // Récupérer les profils séparément — changed_by référence auth.users
      // que PostgREST ne peut pas joindre directement, on passe par profiles.
      const changedByIds = [...new Set(data.map((e) => e.changed_by).filter(Boolean))];
      const { data: profils } = changedByIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name, email, role")
            .in("id", changedByIds)
        : { data: [] };

      const profilsMap = new Map((profils ?? []).map((p) => [p.id, p]));

      setEntrees(
        data.map((e) => ({
          ...e,
          profiles: profilsMap.get(e.changed_by) ?? null,
        })) as unknown as EntreeHistorique[]
      );
      setLoading(false);
    }
    charger();
  }, [ticketId]);

  if (loading) return null;
  if (entrees.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <History className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Historique</span>
      </div>
      <ol className="flex flex-col gap-2">
        {entrees.map((e) => {
          const auteur = e.profiles?.full_name || e.profiles?.email || "Système";
          const estAdmin = e.profiles?.role === "admin";
          const champLabel = CHAMP_LABELS[e.champ] ?? e.champ;
          const ancienne = formaterValeur(e.champ, e.ancienne_valeur);
          const nouvelle = formaterValeur(e.champ, e.nouvelle_valeur);
          const date = new Date(e.created_at).toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <li key={e.id} className="flex items-start gap-2 text-xs text-muted-foreground">
              {/* Point de timeline */}
              <span className="mt-1 size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
              <span className="flex-1 leading-relaxed">
                <span className={estAdmin ? "font-medium text-foreground" : "font-medium"}>
                  {estAdmin ? "Admin" : auteur}
                </span>
                {" a modifié "}
                <span className="font-medium">{champLabel}</span>
                {e.ancienne_valeur && (
                  <>
                    {" : "}
                    <span className="line-through opacity-60">{ancienne}</span>
                    {" → "}
                  </>
                )}
                {!e.ancienne_valeur && " : "}
                <span className="text-foreground">{nouvelle}</span>
                <span className="ml-1 opacity-50">· {date}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
