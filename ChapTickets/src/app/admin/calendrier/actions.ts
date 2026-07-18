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
  const ticketIds = formData
    .getAll("ticket_ids")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  if (typeof projetId !== "string" || !projetId) {
    return { error: "Projet requis." };
  }
  if (typeof nom !== "string" || !nom.trim()) {
    return { error: "Nom requis." };
  }
  if (typeof date !== "string" || !date) {
    return { error: "Date requise." };
  }

  const { data: release, error } = await supabase
    .from("releases")
    .insert({
      projet_id: projetId,
      nom: nom.trim(),
      date,
      description: typeof description === "string" && description.trim() ? description.trim() : null,
    })
    .select("id")
    .single();

  if (error || !release) {
    return { error: `Erreur de création : ${error?.message ?? "inconnue"}` };
  }

  if (ticketIds.length > 0) {
    const { error: assignError } = await supabase
      .from("tickets")
      .update({ release_id: release.id })
      .in("id", ticketIds);
    if (assignError) {
      // La release existe déjà à ce stade — pas la peine de tout annuler
      // pour un échec d'assignation, mais on prévient que c'est partiel.
      return { error: `Release créée, mais échec d'assignation des tickets : ${assignError.message}` };
    }
  }

  revalidatePath("/admin/calendrier");
  revalidatePath(`/admin/projets/${projetId}/overview`);
  revalidatePath("/admin/tickets");
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
