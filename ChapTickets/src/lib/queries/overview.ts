import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTicketStats, type TicketPourStats } from "@/lib/stats/ticket-stats";
import type { TicketStatut, TicketPriorite } from "@/lib/types";

export async function getProjetOverviewData(supabase: SupabaseClient, projetId: string) {
  const [{ data: projet, error }, { data: ticketsRows }, { data: clientsRows }] =
    await Promise.all([
      supabase.from("projets").select("id, nom, description, statut").eq("id", projetId).single(),
      supabase
        .from("tickets")
        .select("id, titre, statut, priorite, created_at, updated_at")
        .eq("projet_id", projetId),
      supabase.from("client_projets").select("profiles(id, full_name, email)").eq("projet_id", projetId),
    ]);

  if (error || !projet) return null;

  const tickets = (ticketsRows ?? []) as unknown as (TicketPourStats & {
    titre: string;
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
  }));

  return { projet, tickets, stats, clients, kanbanItems };
}
