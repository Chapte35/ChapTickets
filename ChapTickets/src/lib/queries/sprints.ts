import type { SupabaseClient } from "@supabase/supabase-js";
import type { Sprint, SprintAvecTickets } from "@/lib/sprint-types";
import type { TicketStatut, TicketPriorite } from "@/lib/types";

export async function getSprintsDuProjet(
  supabase: SupabaseClient,
  projetId: string
): Promise<Sprint[]> {
  const { data, error } = await supabase
    .from("sprints")
    .select("id, projet_id, nom, date_debut, date_fin, statut, release_id, created_at")
    .eq("projet_id", projetId)
    .order("date_debut", { ascending: false });

  if (error || !data) return [];
  return data as unknown as Sprint[];
}

export async function getSprintAvecTickets(
  supabase: SupabaseClient,
  sprintId: string
): Promise<SprintAvecTickets | null> {
  const [{ data: sprint, error }, { data: tickets }] = await Promise.all([
    supabase
      .from("sprints")
      .select("id, projet_id, nom, date_debut, date_fin, statut, release_id, created_at")
      .eq("id", sprintId)
      .single(),
    supabase
      .from("tickets")
      .select("id, titre, statut, priorite")
      .eq("sprint_id", sprintId)
      .order("created_at"),
  ]);

  if (error || !sprint) return null;

  return {
    ...(sprint as unknown as Sprint),
    tickets: (tickets ?? []) as unknown as {
      id: string;
      titre: string;
      statut: TicketStatut;
      priorite: TicketPriorite;
    }[],
  };
}

/**
 * Tickets du projet sans sprint (ou appartenant au sprint donné) —
 * pour le formulaire de création/édition de sprint.
 */
export async function getTicketsSansSprintDuProjet(
  supabase: SupabaseClient,
  projetId: string,
  sprintIdActuel?: string
): Promise<{ id: string; titre: string; sprint_id: string | null }[]> {
  let query = supabase
    .from("tickets")
    .select("id, titre, sprint_id")
    .eq("projet_id", projetId)
    .not("statut", "in", "(resolu,ferme)")
    .order("created_at", { ascending: false });

  // Inclure les tickets déjà dans ce sprint (pour l'édition)
  if (sprintIdActuel) {
    query = query.or(`sprint_id.is.null,sprint_id.eq.${sprintIdActuel}`);
  } else {
    query = query.is("sprint_id", null);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as { id: string; titre: string; sprint_id: string | null }[];
}
