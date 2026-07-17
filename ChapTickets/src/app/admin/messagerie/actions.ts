"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";

export type FormState = { error: string | null };

export async function postMessageProjetAdmin(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin, userId } = await requireAdmin();
  if (!isAdmin || !userId) return { error: "Action réservée à l'admin." };

  const projetId = formData.get("projet_id");
  const contenu = formData.get("contenu");

  if (typeof projetId !== "string" || !projetId) {
    return { error: "Projet invalide." };
  }
  if (typeof contenu !== "string" || !contenu.trim()) {
    return { error: "Message vide." };
  }

  const { error } = await supabase.from("messages_projet").insert({
    projet_id: projetId,
    auteur_id: userId,
    contenu: contenu.trim(),
  });

  if (error) {
    return { error: `Erreur d'envoi : ${error.message}` };
  }

  revalidatePath(`/admin/messagerie/${projetId}`);
  return { error: null };
}
