import type { SupabaseClient } from "@supabase/supabase-js";
import type { TicketStatut, TicketPriorite } from "@/lib/types";

export type TicketSummary = {
  id: string;
  rang_projet: number;
  titre: string;
  description: string | null;
  statut: TicketStatut;
  priorite: TicketPriorite;
  created_at: string;
  projets: { nom: string } | null;
  profiles: { email: string | null; full_name: string | null } | null;
};

export type ProjetSummary = {
  id: string;
  nom: string;
  ticketsCount: number;
};

export type TicketAvecNonLus = {
  id: string;
  titre: string;
  statut: TicketStatut;
  nonLus: number;
};

export async function getAdminDashboardData(supabase: SupabaseClient, projetId?: string) {
  let urgentsQuery = supabase
    .from("tickets_avec_rang")
    .select(
      "id, rang_projet, titre, description, statut, priorite, created_at, projets(nom), profiles:profiles!tickets_client_id_fkey(email, full_name)"
    )
    .eq("priorite", "urgente")
    .not("statut", "in", "(resolu,ferme)")
    .order("rang_projet", { ascending: false })
    .limit(5);

  let recentsQuery = supabase
    .from("tickets_avec_rang")
    .select(
      "id, rang_projet, titre, description, statut, priorite, created_at, projets(nom), profiles:profiles!tickets_client_id_fkey(email, full_name)"
    )
    .order("rang_projet", { ascending: false })
    .limit(5);

  let projetsQuery = supabase
    .from("projets")
    .select("id, nom, tickets(count)")
    .eq("statut", "en_cours")
    .order("created_at", { ascending: false })
    .limit(5);

  if (projetId) {
    urgentsQuery = urgentsQuery.eq("projet_id", projetId);
    recentsQuery = recentsQuery.eq("projet_id", projetId);
    projetsQuery = projetsQuery.eq("id", projetId);
  }

  const [{ data: urgents }, { data: recents }, { data: projetsEnCours }] =
    await Promise.all([urgentsQuery, recentsQuery, projetsQuery]);

  const projets: ProjetSummary[] = (projetsEnCours ?? []).map((p) => ({
    id: p.id,
    nom: p.nom,
    ticketsCount: (p.tickets as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }));

  return {
    urgents: (urgents ?? []) as unknown as TicketSummary[],
    recents: (recents ?? []) as unknown as TicketSummary[],
    projetsEnCours: projets,
  };
}

export async function getClientDashboardData(
  supabase: SupabaseClient,
  userId: string,
  projetId?: string
) {
  let ticketsQuery = supabase
    .from("tickets_avec_rang")
    .select("id, rang_projet, titre, description, statut, priorite, created_at, projets(nom)")
    .order("rang_projet", { ascending: false })
    .limit(10);

  if (projetId) ticketsQuery = ticketsQuery.eq("projet_id", projetId);

  const { data: tickets } = await ticketsQuery;

  const ticketIds = (tickets ?? []).map((t) => t.id);

  if (ticketIds.length === 0) {
    return { recents: [] as TicketSummary[], nonLus: [] as TicketAvecNonLus[] };
  }

  const [{ data: lectures }, { data: messages }] = await Promise.all([
    supabase
      .from("lectures_tickets")
      .select("ticket_id, vu_jusqu_a")
      .eq("user_id", userId)
      .in("ticket_id", ticketIds),
    supabase
      .from("messages")
      .select("ticket_id, created_at, auteur_id")
      .in("ticket_id", ticketIds)
      .neq("auteur_id", userId),
  ]);

  const vuParTicket = new Map(
    (lectures ?? []).map((l) => [l.ticket_id, l.vu_jusqu_a as string])
  );

  const nonLusParTicket = new Map<string, number>();
  for (const m of messages ?? []) {
    const seuil = vuParTicket.get(m.ticket_id);
    const estNonLu = !seuil || new Date(m.created_at) > new Date(seuil);
    if (estNonLu) {
      nonLusParTicket.set(m.ticket_id, (nonLusParTicket.get(m.ticket_id) ?? 0) + 1);
    }
  }

  const nonLus: TicketAvecNonLus[] = (tickets ?? [])
    .filter((t) => (nonLusParTicket.get(t.id) ?? 0) > 0)
    .map((t) => ({
      id: t.id,
      titre: t.titre,
      statut: t.statut as TicketStatut,
      nonLus: nonLusParTicket.get(t.id) ?? 0,
    }));

  return {
    recents: (tickets ?? []).slice(0, 5) as unknown as TicketSummary[],
    nonLus,
  };
}
