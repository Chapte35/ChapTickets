import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTicketStats, type TicketPourStats } from "@/lib/stats/ticket-stats";
import { calculerProgressionReleases, getReleasesDuProjet } from "@/lib/queries/releases";
import type { TicketStatut, TicketPriorite } from "@/lib/types";

export async function getProjetOverviewData(supabase: SupabaseClient, projetId: string) {
  const [{ data: projet, error }, { data: ticketsRows }, { data: clientsRows }, releases] =
    await Promise.all([
      supabase.from("projets").select("id, nom, description, statut").eq("id", projetId).single(),
      supabase
        .from("tickets_avec_rang")
        .select("id, titre, statut, priorite, created_at, updated_at, release_id, rang_projet, projets(code_court)")
        .eq("projet_id", projetId),
      supabase.from("client_projets").select("profiles(id, full_name, email)").eq("projet_id", projetId),
      getReleasesDuProjet(supabase, projetId),
    ]);

  // Distinction volontaire : une vraie erreur Supabase (RLS, table
  // manquante, etc.) n'est PAS la même chose qu'un projet qui n'existe
  // juste pas. Avant, les deux cas étaient avalés dans un même `return
  // null` -> 404 générique, ce qui rend un vrai bug indiscernable d'un ID
  // invalide. On les distingue pour que l'appelant puisse afficher l'erreur
  // réelle plutôt qu'un 404 qui ne dit rien.
  if (error) {
    return { ok: false as const, notFound: false as const, erreur: error.message };
  }
  if (!projet) {
    return { ok: false as const, notFound: true as const, erreur: null };
  }

  const tickets = (ticketsRows ?? []) as unknown as (TicketPourStats & {
    titre: string;
    release_id: string | null;
    rang_projet: number;
    projets: { code_court: string | null } | null;
  })[];

  const stats = buildTicketStats(tickets, 14);

  const clients = (clientsRows ?? [])
    .map((r) => r.profiles as unknown as { id: string; full_name: string | null; email: string | null } | null)
    .filter((c): c is { id: string; full_name: string | null; email: string | null } => c !== null);

  const kanbanItems = tickets.map((t) => ({
    id: t.id,
    titre: t.titre,
    statut: t.statut as TicketStatut,
    priorite: t.priorite as TicketPriorite,
    rang_projet: t.rang_projet,
    code_court: t.projets?.code_court ?? null,
  }));

  const releasesAvecProgression = calculerProgressionReleases(releases, tickets);

  return {
    ok: true as const,
    projet,
    tickets,
    stats,
    clients,
    kanbanItems,
    releasesAvecProgression,
  };
}
