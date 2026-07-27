"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";

export type FormState = { error: string | null };

/**
 * Met à jour le champ assigne_a d'un ticket (admin uniquement).
 * La valeur vide ("") est traitée comme null (désassignation).
 */
export async function updateAssigneA(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const ticketId = formData.get("ticket_id");
  const assigneA = formData.get("assigne_a");

  if (typeof ticketId !== "string" || !ticketId) {
    return { error: "Ticket invalide." };
  }

  const valeur =
    typeof assigneA === "string" && assigneA.trim() ? assigneA.trim() : null;

  const { error } = await supabase
    .from("tickets")
    .update({ assigne_a: valeur, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { error: `Erreur : ${error.message}` };

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return { error: null };
}
