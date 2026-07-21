"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";

export type SprintFormState = { error: string | null };

// ---------------------------------------------------------------------------
// Créer un sprint
// ---------------------------------------------------------------------------
export async function creerSprint(
  _prev: SprintFormState,
  formData: FormData
): Promise<SprintFormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const projetId = formData.get("projet_id") as string;
  const nom = (formData.get("nom") as string)?.trim();
  const dateDebut = formData.get("date_debut") as string;
  const ticketIds = formData.getAll("ticket_ids[]") as string[];

  if (!nom) return { error: "Le nom du sprint est requis." };
  if (!dateDebut) return { error: "La date de début est requise." };
  if (!projetId) return { error: "Projet manquant." };

  const { data: sprint, error } = await supabase
    .from("sprints")
    .insert({ projet_id: projetId, nom, date_debut: dateDebut })
    .select("id")
    .single();

  if (error || !sprint) {
    return { error: error?.message ?? "Erreur lors de la création." };
  }

  // Assigner les tickets sélectionnés au sprint
  if (ticketIds.length > 0) {
    const { error: ticketError } = await supabase
      .from("tickets")
      .update({ sprint_id: sprint.id })
      .in("id", ticketIds);

    if (ticketError) {
      return { error: `Sprint créé, mais erreur sur les tickets : ${ticketError.message}` };
    }
  }

  revalidatePath(`/admin/projets/${projetId}/sprints`);
  return { error: null };
}

// ---------------------------------------------------------------------------
// Clôturer un sprint — crée une release et ferme le sprint
// ---------------------------------------------------------------------------
export async function cloturerSprint(
  _prev: SprintFormState,
  formData: FormData
): Promise<SprintFormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const sprintId = formData.get("sprint_id") as string;
  const versionRelease = (formData.get("version_release") as string)?.trim();
  const descriptionRelease = (formData.get("description_release") as string)?.trim() || null;

  if (!versionRelease) return { error: "Le numéro de version est requis pour créer la release." };

  // Récupérer le sprint pour avoir le projet et la date de fin
  const { data: sprint, error: sprintError } = await supabase
    .from("sprints")
    .select("id, projet_id, statut, date_debut")
    .eq("id", sprintId)
    .single();

  if (sprintError || !sprint) return { error: "Sprint introuvable." };
  if (sprint.statut === "cloture") return { error: "Ce sprint est déjà clôturé." };

  const aujourd_hui = new Date().toISOString().slice(0, 10);

  // Créer la release associée
  const { data: release, error: releaseError } = await supabase
    .from("releases")
    .insert({
      projet_id: sprint.projet_id,
      nom: versionRelease,
      date: aujourd_hui,
      description: descriptionRelease,
    })
    .select("id")
    .single();

  if (releaseError || !release) {
    return { error: releaseError?.message ?? "Erreur lors de la création de la release." };
  }

  // Clôturer le sprint : date de fin + statut + lien release
  const { error: updateError } = await supabase
    .from("sprints")
    .update({
      statut: "cloture",
      date_fin: aujourd_hui,
      release_id: release.id,
    })
    .eq("id", sprintId);

  if (updateError) return { error: updateError.message };

  // Assigner les tickets du sprint à la release
  await supabase
    .from("tickets")
    .update({ release_id: release.id })
    .eq("sprint_id", sprintId)
    .is("release_id", null); // ne pas écraser une assignation manuelle existante

  revalidatePath(`/admin/projets/${sprint.projet_id}/sprints`);
  revalidatePath(`/admin/projets/${sprint.projet_id}/overview`);
  return { error: null };
}

// ---------------------------------------------------------------------------
// Supprimer un sprint (tickets remis à sprint_id null)
// ---------------------------------------------------------------------------
export async function supprimerSprint(sprintId: string, projetId: string): Promise<{ error: string | null }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Non autorisé." };

  const { error } = await supabase.from("sprints").delete().eq("id", sprintId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/projets/${projetId}/sprints`);
  return { error: null };
}
