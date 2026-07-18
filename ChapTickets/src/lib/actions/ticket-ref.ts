"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error: string | null };

/**
 * Pas de requireAdmin/requireClient : la vraie protection est en base
 * (policy RLS client_update_own_ticket_ref + trigger
 * restreindre_update_ticket_client, migration 0014) — un client ne peut de
 * toute façon toucher que ref_client sur ses propres tickets, peu importe
 * ce que cette action laisserait passer. On vérifie juste que la ligne a
 * réellement été modifiée (`.select("id")` après l'update) pour donner un
 * vrai message d'erreur si l'update a été silencieusement filtré par RLS
 * (ticket qui n'appartient pas à l'appelant).
 */
export async function updateRefClient(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const ticketId = formData.get("ticket_id");
  const refClientBrut = formData.get("ref_client");

  if (typeof ticketId !== "string" || !ticketId) {
    return { error: "Ticket invalide." };
  }

  const refClient =
    typeof refClientBrut === "string" && refClientBrut.trim()
      ? refClientBrut.trim().slice(0, 100)
      : null;

  const { data, error } = await supabase
    .from("tickets")
    .update({ ref_client: refClient })
    .eq("id", ticketId)
    .select("id");

  if (error) {
    return { error: `Erreur de mise à jour : ${error.message}` };
  }
  if (!data || data.length === 0) {
    return { error: "Ticket introuvable, ou tu n'as pas le droit de le modifier." };
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { error: null };
}
