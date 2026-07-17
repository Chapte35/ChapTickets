"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { IDEE_STATUTS } from "@/lib/types";

export type FormState = { error: string | null };

export async function createIdee(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const titre = formData.get("titre");
  const description = formData.get("description");

  if (typeof titre !== "string" || !titre.trim()) {
    return { error: "Titre requis." };
  }

  const { data: idee, error } = await supabase
    .from("idees_projets")
    .insert({
      titre: titre.trim(),
      description: typeof description === "string" ? description.trim() : null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Erreur de création : ${error.message}` };
  }

  revalidatePath("/admin/idees");
  redirect(`/admin/idees/${idee.id}`);
}

export async function updateIdee(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const ideeId = formData.get("idee_id");
  const titre = formData.get("titre");
  const description = formData.get("description");
  const statut = formData.get("statut");

  if (typeof ideeId !== "string" || !ideeId) {
    return { error: "Idée invalide." };
  }
  if (typeof titre !== "string" || !titre.trim()) {
    return { error: "Titre requis." };
  }
  if (
    typeof statut !== "string" ||
    !IDEE_STATUTS.includes(statut as (typeof IDEE_STATUTS)[number])
  ) {
    return { error: "Statut invalide." };
  }

  const { error } = await supabase
    .from("idees_projets")
    .update({
      titre: titre.trim(),
      description: typeof description === "string" ? description.trim() : null,
      statut,
    })
    .eq("id", ideeId);

  if (error) {
    return { error: `Erreur de mise à jour : ${error.message}` };
  }

  revalidatePath(`/admin/idees/${ideeId}`);
  revalidatePath("/admin/idees");
  return { error: null };
}

export async function deleteIdee(formData: FormData) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return;

  const ideeId = formData.get("idee_id");
  if (typeof ideeId !== "string" || !ideeId) return;

  await supabase.from("idees_projets").delete().eq("id", ideeId);

  revalidatePath("/admin/idees");
  redirect("/admin/idees");
}

/**
 * Transforme une idée en projet formel : crée une ligne dans `projets`
 * (nom = titre de l'idée, modifiable ensuite depuis la gestion des projets
 * au Sprint 5) et rattache l'idée à ce projet via `idees_projets.projet_id`.
 * Ne touche PAS au statut de l'idée : rien n'oblige une idée "transformée"
 * à porter un statut particulier (cf. décision : pas de lien obligatoire).
 */
export async function transformerEnProjet(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const ideeId = formData.get("idee_id");
  const titre = formData.get("titre"); // titre courant de l'idée, pré-rempli côté UI

  if (typeof ideeId !== "string" || !ideeId) {
    return { error: "Idée invalide." };
  }
  if (typeof titre !== "string" || !titre.trim()) {
    return { error: "Nom du projet requis." };
  }

  const { data: projet, error: projetError } = await supabase
    .from("projets")
    .insert({ nom: titre.trim() })
    .select("id")
    .single();

  if (projetError) {
    return { error: `Erreur de création du projet : ${projetError.message}` };
  }

  const { error: linkError } = await supabase
    .from("idees_projets")
    .update({ projet_id: projet.id })
    .eq("id", ideeId);

  if (linkError) {
    return { error: `Projet créé mais lien échoué : ${linkError.message}` };
  }

  revalidatePath(`/admin/idees/${ideeId}`);
  revalidatePath("/admin/idees");
  return { error: null };
}
