"use server";

import { createClient } from "@/lib/supabase/server";
import { formatRefTicket } from "@/lib/types";

export type SearchResult = {
  tickets: { id: string; titre: string; ref: string; description: string | null }[];
  projets: { id: string; nom: string }[];
};

type TicketRow = {
  id: string;
  titre: string;
  ref: string;
  description: string | null;
};

export async function globalSearch(query: string): Promise<SearchResult> {
  const q = query.trim();
  if (!q || q.length < 2) return { tickets: [], projets: [] };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { tickets: [], projets: [] };

  const like = `%${q}%`;
  const dejaInclus = new Set<string>();

  function mapTicket(t: Record<string, unknown>): TicketRow {
    const projet = t.projets as { code_court: string | null } | null;
    return {
      id: t.id as string,
      titre: t.titre as string,
      ref: formatRefTicket(t.rang_projet as number, projet?.code_court),
      description: t.description as string | null,
    };
  }

  // ── 1. Recherche texte : titre + description ──────────────────────────────
  const [{ data: ticketsTexte }, { data: projets }] = await Promise.all([
    supabase
      .from("tickets_avec_rang")
      .select("id, rang_projet, titre, description, projets(code_court)")
      .or(`titre.ilike.${like},description.ilike.${like}`)
      .limit(8),
    supabase
      .from("projets")
      .select("id, nom")
      .ilike("nom", like)
      .limit(6),
  ]);

  const ticketsList: TicketRow[] = (ticketsTexte ?? []).map((t) => {
    const row = mapTicket(t as Record<string, unknown>);
    dejaInclus.add(row.id);
    return row;
  });

  // ── 2. Recherche par numéro pur (ex: "12" → rang_projet = 12) ─────────────
  const numeroMatch = q.match(/^\d+$/);
  if (numeroMatch && ticketsList.length < 8) {
    const rang = parseInt(q);
    const { data: parNumero } = await supabase
      .from("tickets_avec_rang")
      .select("id, rang_projet, titre, description, projets(code_court)")
      .eq("rang_projet", rang)
      .not("id", "in", `(${[...dejaInclus].join(",") || "00000000-0000-0000-0000-000000000000"})`)
      .limit(8 - ticketsList.length);

    for (const t of parNumero ?? []) {
      const row = mapTicket(t as Record<string, unknown>);
      dejaInclus.add(row.id);
      ticketsList.push(row);
    }
  }

  // ── 3. Recherche par ref formatée (ex: "CHAP#12", "CHAP", "CHAP12") ───────
  const qUpper = q.toUpperCase();
  const refMatch = qUpper.match(/^([A-Z]+)#?(\d*)$/);
  if (refMatch && !numeroMatch && ticketsList.length < 8) {
    const [, codeCourt, rang] = refMatch;
    let refQuery = supabase
      .from("tickets_avec_rang")
      .select("id, rang_projet, titre, description, projets(code_court)")
      .ilike("projets.code_court", `${codeCourt}%`)
      .not("id", "in", `(${[...dejaInclus].join(",") || "00000000-0000-0000-0000-000000000000"})`);

    if (rang) refQuery = refQuery.eq("rang_projet", parseInt(rang));

    const { data: parRef } = await refQuery.limit(8 - ticketsList.length);
    for (const t of parRef ?? []) {
      const row = mapTicket(t as Record<string, unknown>);
      dejaInclus.add(row.id);
      ticketsList.push(row);
    }
  }

  return {
    tickets: ticketsList.slice(0, 8),
    projets: projets ?? [],
  };
}
