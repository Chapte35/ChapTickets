// Ce fichier est importé par les composants sprint.
// Les types Sprint vivent ici plutôt que dans types.ts pour ne pas allonger
// davantage ce fichier déjà dense.

export type SprintStatut = "ouvert" | "cloture";

export type Sprint = {
  id: string;
  projet_id: string;
  nom: string;
  date_debut: string; // ISO date
  date_fin: string | null;
  statut: SprintStatut;
  release_id: string | null;
  created_at: string;
};

export type SprintAvecTickets = Sprint & {
  tickets: { id: string; titre: string; statut: string; priorite: string }[];
};

export const SPRINT_STATUT_LABELS: Record<SprintStatut, string> = {
  ouvert: "En cours",
  cloture: "Clôturé",
};
