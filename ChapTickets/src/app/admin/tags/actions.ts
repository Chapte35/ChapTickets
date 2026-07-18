"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { TAG_COLORS, TAG_PORTEE_GENERIQUE } from "@/lib/types";

export type FormState = { error: string | null };

export async function createTag(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const nom = formData.get("nom");
  const couleur = formData.get("couleur");
  const projetIdBrut = formData.get("projet_id");

  if (typeof nom !== "string" || !nom.trim()) {
    return { error: "Nom requis." };
  }
  if (typeof couleur !== "string" || !TAG_COLORS.includes(couleur as (typeof TAG_COLORS)[number])) {
    return { error: "Couleur invalide." };
  }

  const projetId =
    typeof projetIdBrut === "string" && projetIdBrut && projetIdBrut !== TAG_PORTEE_GENERIQUE
      ? projetIdBrut
      : null;

  const { error } = await supabase
    .from("tags")
    .insert({ nom: nom.trim(), couleur, projet_id: projetId });

  if (error) {
    // Cas fréquent : nom déjà pris (contrainte unique).
    return { error: `Erreur de création : ${error.message}` };
  }

  revalidatePath("/admin/tags");
  return { error: null };
}

export async function deleteTag(formData: FormData) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return;

  const tagId = formData.get("tag_id");
  if (typeof tagId !== "string" || !tagId) return;

  await supabase.from("tags").delete().eq("id", tagId);

  revalidatePath("/admin/tags");
}
