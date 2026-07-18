import type { SupabaseClient } from "@supabase/supabase-js";
import type { Release, TicketStatut } from "@/lib/types";

export type TicketPourRelease = { id: string; statut: TicketStatut; created_at: string };

export type ReleaseAvecProgression = Release & {
  total: number;
  resolus: number;
};

/**
 * Calcule, pour une liste de releases d'un même projet (triées par date),
 * quels tickets "appartiennent" à chacune : tous ceux créés après la
 * release précédente (exclu) et jusqu'à la date de celle-ci (incluse).
 * Un ticket né d'une réouverture (ticket_origine_id non null) est un
 * NOUVEAU ticket avec sa propre date de création — il tombe naturellement
 * dans la release suivante, jamais dans celle de son ticket d'origine.
 */
export function calculerProgressionReleases(
  releases: Release[],
  tickets: TicketPourRelease[]
): ReleaseAvecProgression[] {
  const triees = [...releases].sort((a, b) => a.date.localeCompare(b.date));

  return triees.map((release, i) => {
    const precedente = i > 0 ? triees[i - 1] : null;
    // Fin de journée pour inclure tout ticket créé le jour même de la release.
    const fin = new Date(`${release.date}T23:59:59.999`);
    const debut = precedente ? new Date(`${precedente.date}T23:59:59.999`) : null;

    const ticketsDeLaRelease = tickets.filter((t) => {
      const cree = new Date(t.created_at);
      return cree <= fin && (debut === null || cree > debut);
    });

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
