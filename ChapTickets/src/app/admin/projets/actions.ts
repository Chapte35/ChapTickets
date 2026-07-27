"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { PROJET_STATUTS } from "@/lib/types";

export type FormState = { error: string | null };

export async function createProjet(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const nom = formData.get("nom");
  const description = formData.get("description");
  const codeCourt = formData.get("code_court");

  if (typeof nom !== "string" || !nom.trim()) {
    return { error: "Nom requis." };
  }

  const codeCourtNormalise =
    typeof codeCourt === "string" && codeCourt.trim()
      ? codeCourt.trim().toUpperCase().slice(0, 10)
      : null;

  const { data: projet, error } = await supabase
    .from("projets")
    .insert({
      nom: nom.trim(),
      description: typeof description === "string" ? description.trim() : null,
      statut: "a_demarrer",
      code_court: codeCourtNormalise,
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Erreur de création : ${error.message}` };
  }

  revalidatePath("/admin/projets");
  redirect(`/admin/projets/${projet.id}`);
}

export async function updateProjet(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const projetId = formData.get("projet_id");
  const nom = formData.get("nom");
  const description = formData.get("description");
  const codeCourt = formData.get("code_court");

  if (typeof projetId !== "string" || !projetId) {
    return { error: "Projet invalide." };
  }
  if (typeof nom !== "string" || !nom.trim()) {
    return { error: "Nom requis." };
  }

  const codeCourtNormalise =
    typeof codeCourt === "string" && codeCourt.trim()
      ? codeCourt.trim().toUpperCase().slice(0, 10)
      : null;

  const { error } = await supabase
    .from("projets")
    .update({
      nom: nom.trim(),
      description: typeof description === "string" ? description.trim() : null,
      code_court: codeCourtNormalise,
    })
    .eq("id", projetId);

  if (error) {
    return { error: `Erreur de mise à jour : ${error.message}` };
  }

  revalidatePath(`/admin/projets/${projetId}`);
  revalidatePath("/admin/projets");
  return { error: null };
}

/**
 * Appelée directement depuis le kanban (onDragEnd), pas via un <form> —
 * une Server Action reste un appel de fonction normal depuis un Client
 * Component, pas obligatoirement lié à une soumission de formulaire.
 * Retourne un objet simple (pas de FormState/useActionState ici) : le
 * composant kanban gère lui-même l'optimistic update et le rollback.
 */
export async function updateProjetStatut(projetId: string, statut: string) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  if (!PROJET_STATUTS.includes(statut as (typeof PROJET_STATUTS)[number])) {
    return { error: "Statut invalide." };
  }

  const { error } = await supabase
    .from("projets")
    .update({ statut })
    .eq("id", projetId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/projets");
  return { error: null };
}

export async function updateProjetStatutForm(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const projetId = formData.get("projet_id");
  const statut = formData.get("statut");

  if (typeof projetId !== "string" || typeof statut !== "string") {
    return { error: "Requête invalide." };
  }

  return updateProjetStatut(projetId, statut);
}

export async function deleteProjet(formData: FormData) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return;

  const projetId = formData.get("projet_id");
  if (typeof projetId !== "string" || !projetId) return;

  await supabase.from("projets").delete().eq("id", projetId);

  revalidatePath("/admin/projets");
  redirect("/admin/projets");
}

export async function attacherClient(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const projetId = formData.get("projet_id");
  const clientId = formData.get("client_id");

  if (typeof projetId !== "string" || !projetId) {
    return { error: "Projet invalide." };
  }
  if (typeof clientId !== "string" || !clientId) {
    return { error: "Client requis." };
  }

  const { error } = await supabase
    .from("client_projets")
    .insert({ projet_id: projetId, client_id: clientId });

  if (error) {
    // Cas fréquent : le client est déjà rattaché (violation de la clé
    // primaire composite). Message reformulé plutôt que l'erreur Postgres brute.
    return { error: "Impossible de rattacher ce client (déjà rattaché ?)." };
  }

  revalidatePath(`/admin/projets/${projetId}`);
  return { error: null };
}

export async function detacherClient(formData: FormData) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return;

  const projetId = formData.get("projet_id");
  const clientId = formData.get("client_id");
  if (typeof projetId !== "string" || typeof clientId !== "string") return;

  await supabase
    .from("client_projets")
    .delete()
    .eq("projet_id", projetId)
    .eq("client_id", clientId);

  revalidatePath(`/admin/projets/${projetId}`);
}
