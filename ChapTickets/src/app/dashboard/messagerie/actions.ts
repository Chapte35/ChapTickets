"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth/guards";

export type FormState = { error: string | null };

export async function postMessageProjetClient(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isClient, userId } = await requireClient();
  if (!isClient || !userId) return { error: "Action réservée aux clients." };

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
    // La policy RLS refuse si le client n'est plus rattaché à ce projet.
    return { error: "Impossible d'envoyer le message." };
  }

  revalidatePath(`/dashboard/messagerie/${projetId}`);
  return { error: null };
}
