import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolutionParProjet = {
  projetId: string;
  projetNom: string;
  total: number;
  resolus: number;
  /** Ratio 0-1 */
  taux: number;
};

export type PeriodeStats = "jour" | "semaine" | "mois";

export const PERIODE_LABELS: Record<PeriodeStats, string> = {
  jour: "Aujourd'hui",
  semaine: "7 derniers jours",
  mois: "30 derniers jours",
};

function dateDebut(periode: PeriodeStats): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (periode === "jour") return now;
  if (periode === "semaine") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d;
  }
  const d = new Date(now);
  d.setDate(d.getDate() - 29);
  return d;
}

/**
 * Proportion de tickets résolus/fermés par rapport au total des tickets
 * créés sur la période, pour chaque projet. Filtrable par projet et par
 * période (jour / semaine / mois).
 *
 * On filtre sur `created_at` (pas `updated_at`) pour avoir la
 * photo des tickets nés dans la fenêtre, pas des tickets résolus récemment
 * qui auraient pu être créés il y a des mois. C'est la définition la plus
 * utile pour mesurer l'avancement d'une période.
 */
export async function getResolutionParProjet(
  supabase: SupabaseClient,
  periode: PeriodeStats,
  projetId?: string
): Promise<ResolutionParProjet[]> {
  const debut = dateDebut(periode);

  let query = supabase
    .from("tickets")
    .select("id, statut, projet_id, projets(id, nom)")
    .gte("created_at", debut.toISOString());

  if (projetId) query = query.eq("projet_id", projetId);

  const { data, error } = await query;
  if (error || !data) return [];

  // Regrouper par projet
  const map = new Map<string, { nom: string; total: number; resolus: number }>();
  for (const t of data) {
    const projet = t.projets as unknown as { id: string; nom: string } | null;
    if (!projet) continue;
    const existing = map.get(t.projet_id) ?? { nom: projet.nom, total: 0, resolus: 0 };
    existing.total += 1;
    if (t.statut === "resolu" || t.statut === "ferme") existing.resolus += 1;
    map.set(t.projet_id, existing);
  }

  return Array.from(map.entries())
    .map(([id, v]) => ({
      projetId: id,
      projetNom: v.nom,
      total: v.total,
      resolus: v.resolus,
      taux: v.total > 0 ? v.resolus / v.total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
