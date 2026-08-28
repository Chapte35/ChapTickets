"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, type AvatarCouleur } from "@/components/avatar";
import {
  TICKET_STATUT_LABELS,
  TICKET_PRIORITE_LABELS,
  TICKET_TYPE_LABELS,
  type TicketStatut,
  type TicketPriorite,
  type TicketType,
} from "@/lib/types";

type Profil = {
  id: string;
  full_name: string | null;
  email: string | null;
  pseudo: string | null;
  role: string;
  avatar_couleur: string | null;
  initiales: string | null;
};

type EntreeHistorique = {
  id: string;
  champ: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  created_at: string;
  profil: Profil | null;
};

/** Formate une valeur brute selon le champ pour l'affichage. */
function formaterValeur(
  champ: string,
  valeur: string | null,
  profilsMap: Map<string, Profil>
): string {
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
    case "assigne_a": {
      // La valeur est un UUID — on résout vers le pseudo/nom du profil
      const p = profilsMap.get(valeur);
      if (!p) return valeur; // fallback UUID si profil introuvable
      return p.pseudo || p.full_name || p.email || valeur;
    }
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
  ref_client: "Réf. client",
};

function ProfilAvatar({ profil }: { profil: Profil | null }) {
  const nom = profil?.pseudo || profil?.full_name || profil?.email || "Système";
  const estAdmin = profil?.role === "admin";

  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <Avatar
        nom={nom}
        size="sm"
        couleur={(profil?.avatar_couleur as AvatarCouleur | null) ?? null}
        initiales={profil?.initiales ?? null}
      />
      <span className={estAdmin ? "font-medium text-foreground" : "font-medium"}>
        {estAdmin ? (profil?.pseudo || "Admin") : nom}
      </span>
    </span>
  );
}

export function TicketHistorique({ ticketId }: { ticketId: string }) {
  const [entrees, setEntrees] = useState<EntreeHistorique[]>([]);
  const [profilsMap, setProfilsMap] = useState<Map<string, Profil>>(new Map());
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

      // Collecter tous les UUIDs à résoudre : auteurs + valeurs assigne_a
      const uuidsAuteurs = [...new Set(data.map((e) => e.changed_by).filter(Boolean))];
      const uuidsAssigne = [
        ...new Set(
          data
            .filter((e) => e.champ === "assigne_a")
            .flatMap((e) => [e.ancienne_valeur, e.nouvelle_valeur])
            .filter((v): v is string => !!v && v.length === 36)
        ),
      ];
      const tousLesUuids = [...new Set([...uuidsAuteurs, ...uuidsAssigne])];

      const { data: profils } = tousLesUuids.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name, email, pseudo, role, avatar_couleur, initiales")
            .in("id", tousLesUuids)
        : { data: [] };

      const map = new Map((profils ?? []).map((p) => [p.id, p as unknown as Profil]));
      setProfilsMap(map);

      setEntrees(
        data.map((e) => ({
          ...e,
          profil: map.get(e.changed_by) ?? null,
        }))
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
      <ol className="flex flex-col gap-2.5">
        {entrees.map((e) => {
          const champLabel = CHAMP_LABELS[e.champ] ?? e.champ;
          const ancienne = formaterValeur(e.champ, e.ancienne_valeur, profilsMap);
          const nouvelle = formaterValeur(e.champ, e.nouvelle_valeur, profilsMap);
          const heure = new Date(e.created_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const jour = new Date(e.created_at).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          });

          return (
            <li key={e.id} className="flex items-start gap-2 text-xs text-muted-foreground">
              {/* Date + heure en colonne fixe */}
              <span className="shrink-0 w-24 opacity-60 tabular-nums pt-0.5">
                {heure} · {jour}
              </span>
              <span className="flex-1 leading-relaxed flex flex-wrap items-center gap-x-1 gap-y-0.5">
                <ProfilAvatar profil={e.profil} />
                <span>a modifié</span>
                <span className="font-medium text-foreground/80">{champLabel}</span>
                {e.ancienne_valeur && (
                  <>
                    <span>:</span>
                    <span className="line-through opacity-50">{ancienne}</span>
                    <span>→</span>
                  </>
                )}
                {!e.ancienne_valeur && <span>:</span>}
                <span className="text-foreground">{nouvelle}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
