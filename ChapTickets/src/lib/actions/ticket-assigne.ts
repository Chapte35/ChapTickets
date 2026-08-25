"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { logHistorique, creerNotification } from "@/lib/historique";

export type FormState = { error: string | null };

/**
 * Met à jour le champ assigne_a d'un ticket (admin uniquement).
 * Si le ticket est en en_attente_client et qu'on assigne un client :
 *   1. Log dans ticket_historique
 *   2. Crée une notification in-app
 *   3. Déclenche l'Edge Function email (rate limitée à 1/heure/ticket)
 */
export async function updateAssigneA(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin, userId } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const ticketId = formData.get("ticket_id");
  const assigneA = formData.get("assigne_a");

  if (typeof ticketId !== "string" || !ticketId) {
    return { error: "Ticket invalide." };
  }

  const valeur =
    typeof assigneA === "string" && assigneA.trim() && assigneA !== "__aucun__"
      ? assigneA.trim()
      : null;

  // Lire l'état avant modification
  const { data: avant } = await supabase
    .from("tickets")
    .select("assigne_a, statut, titre, profiles:profiles!tickets_client_id_fkey(email, full_name)")
    .eq("id", ticketId)
    .single();

  const { error } = await supabase
    .from("tickets")
    .update({ assigne_a: valeur, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { error: `Erreur : ${error.message}` };

  const ancienAssigne = (avant as unknown as { assigne_a: string | null })?.assigne_a ?? null;

  await logHistorique(supabase, {
    ticketId,
    champ: "assigne_a",
    ancienneValeur: ancienAssigne,
    nouvelleValeur: valeur,
    changedBy: userId,
  });

  // Notif + email si on assigne un client sur un ticket en_attente_client
  const statut = (avant as unknown as { statut: string })?.statut;
  if (valeur && valeur !== ancienAssigne && statut === "en_attente_client") {
    // Vérifie que la personne assignée est bien un client (pas l'admin)
    const { data: profil } = await supabase
      .from("profiles")
      .select("role, email, full_name")
      .eq("id", valeur)
      .single();

    if (profil?.role === "client") {
      // Notification in-app — l'email partira dans le récap quotidien à 20h
      await creerNotification(supabase, { userId: valeur, ticketId });
    }
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return { error: null };
}
