"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";

export type FormState = { error: string | null };

export async function createRelease(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const projetId = formData.get("projet_id");
  const nom = formData.get("nom");
  const date = formData.get("date");
  const description = formData.get("description");

  if (typeof projetId !== "string" || !projetId) {
    return { error: "Projet requis." };
  }
  if (typeof nom !== "string" || !nom.trim()) {
    return { error: "Nom requis." };
  }
  if (typeof date !== "string" || !date) {
    return { error: "Date requise." };
  }

  const { error } = await supabase.from("releases").insert({
    projet_id: projetId,
    nom: nom.trim(),
    date,
    description: typeof description === "string" && description.trim() ? description.trim() : null,
  });

  if (error) {
    return { error: `Erreur de création : ${error.message}` };
  }

  revalidatePath("/admin/calendrier");
  revalidatePath(`/admin/projets/${projetId}/overview`);
  return { error: null };
}

export async function deleteRelease(formData: FormData) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return;

  const releaseId = formData.get("release_id");
  if (typeof releaseId !== "string" || !releaseId) return;

  await supabase.from("releases").delete().eq("id", releaseId);

  revalidatePath("/admin/calendrier");
}
