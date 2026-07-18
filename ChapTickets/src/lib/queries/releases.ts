import type { SupabaseClient } from "@supabase/supabase-js";
import type { Release, TicketStatut } from "@/lib/types";

export type TicketPourRelease = { id: string; statut: TicketStatut; release_id: string | null };

export type ReleaseAvecProgression = Release & {
  total: number;
  resolus: number;
};

/**
 * Regroupe les tickets par release_id (colonne stockée depuis la migration
 * 0013). Remplace l'ancien calcul par plage de dates (created_at entre deux
 * releases) : décision prise en clarification sprint 12, ce calcul
 * automatique ne fonctionnait pas correctement en pratique. Un ticket
 * appartient désormais à au plus une release, choisie explicitement.
 */
export function calculerProgressionReleases(
  releases: Release[],
  tickets: TicketPourRelease[]
): ReleaseAvecProgression[] {
  return releases.map((release) => {
    const ticketsDeLaRelease = tickets.filter((t) => t.release_id === release.id);
    const resolus = ticketsDeLaRelease.filter(
      (t) => t.statut === "resolu" || t.statut === "ferme"
    ).length;
    return { ...release, total: ticketsDeLaRelease.length, resolus };
  });
}

export async function getReleasesDuProjet(
  supabase: SupabaseClient,
  projetId: string
): Promise<Release[]> {
  const { data, error } = await supabase
    .from("releases")
    .select("id, projet_id, nom, date, description")
    .eq("projet_id", projetId)
    .order("date", { ascending: false });

  if (error || !data) return [];
  return data as unknown as Release[];
}

/** Toutes les releases visibles par l'utilisateur courant (RLS filtre déjà), avec le nom du projet pour l'affichage global du calendrier admin. */
export async function getToutesLesReleases(
  supabase: SupabaseClient,
  projetId?: string
): Promise<(Release & { projet_nom: string })[]> {
  let query = supabase
    .from("releases")
    .select("id, projet_id, nom, date, description, projets(nom)")
    .order("date", { ascending: false });

  if (projetId) query = query.eq("projet_id", projetId);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    projet_id: r.projet_id,
    nom: r.nom,
    date: r.date,
    description: r.description,
    projet_nom: (r.projets as unknown as { nom: string } | null)?.nom ?? "—",
  }));
}

export type TicketSansRelease = { id: string; titre: string };

/**
 * Tickets sans release, groupés par projet — pour le sélecteur multiple du
 * formulaire de création de release (sprint 12). Tous projets confondus
 * (le formulaire filtre côté client selon le projet choisi dans son propre
 * select), comme clientsParProjet dans queries/tickets.ts.
 */
export async function getTicketsSansReleaseParProjet(
  supabase: SupabaseClient
): Promise<Record<string, TicketSansRelease[]>> {
  const { data, error } = await supabase
    .from("tickets")
    .select("id, titre, projet_id")
    .is("release_id", null)
    .order("titre");

  if (error || !data) return {};

  const parProjet: Record<string, TicketSansRelease[]> = {};
  for (const t of data) {
    const liste = parProjet[t.projet_id] ?? [];
    liste.push({ id: t.id, titre: t.titre });
    parProjet[t.projet_id] = liste;
  }
  return parProjet;
}
