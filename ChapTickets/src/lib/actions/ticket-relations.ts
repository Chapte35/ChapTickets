"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { requireClient } from "@/lib/auth/guards";

export type FormState = { error: string | null };

/**
 * Ajoute une relation entre deux tickets (admin ou client).
 * Le trigger DB crée automatiquement la relation inverse.
 */
export async function ajouterRelation(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const ticketId = formData.get("ticket_id");
  const cibleId = formData.get("ticket_cible_id");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };
  if (typeof cibleId !== "string" || !cibleId) return { error: "Ticket cible invalide." };
  if (ticketId === cibleId) return { error: "Un ticket ne peut pas être lié à lui-même." };

  // Tente admin d'abord, sinon client
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  let userId: string | null = null;

  const adminResult = await requireAdmin();
  if (adminResult.isAdmin) {
    supabase = adminResult.supabase;
    userId = adminResult.userId ?? null;
  } else {
    const clientResult = await requireClient();
    if (!clientResult.isClient) return { error: "Non autorisé." };
    supabase = clientResult.supabase;
    userId = clientResult.userId ?? null;
  }

  const { error } = await supabase.from("ticket_relations").insert({
    ticket_id: ticketId,
    ticket_cible_id: cibleId,
    type: "en_relation_avec",
    created_by: userId,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ces tickets sont déjà liés." };
    return { error: `Erreur : ${error.message}` };
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { error: null };
}

/**
 * Supprime une relation (les deux sens supprimés par le trigger).
 */
export async function supprimerRelation(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const ticketId = formData.get("ticket_id");
  const cibleId = formData.get("ticket_cible_id");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };
  if (typeof cibleId !== "string" || !cibleId) return { error: "Ticket cible invalide." };

  const adminResult = await requireAdmin();
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];

  if (adminResult.isAdmin) {
    supabase = adminResult.supabase;
  } else {
    const clientResult = await requireClient();
    if (!clientResult.isClient) return { error: "Non autorisé." };
    supabase = clientResult.supabase;
  }

  const { error } = await supabase
    .from("ticket_relations")
    .delete()
    .eq("ticket_id", ticketId)
    .eq("ticket_cible_id", cibleId);

  if (error) return { error: `Erreur : ${error.message}` };

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { error: null };
}

/**
 * Recherche de tickets par ref (ex: CHAP#12) ou titre — pour le picker.
 * Exclut le ticket courant et ceux déjà liés.
 */
export async function rechercherTicketsPourRelation(
  ticketId: string,
  query: string
): Promise<Array<{ id: string; rang_projet: number; titre: string; code_court: string | null }>> {
  if (!query.trim()) return [];

  const adminResult = await requireAdmin();
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];

  if (adminResult.isAdmin) {
    supabase = adminResult.supabase;
  } else {
    const clientResult = await requireClient();
    if (!clientResult.isClient) return [];
    supabase = clientResult.supabase;
  }

  // Récupère les IDs déjà liés pour les exclure
  const { data: dejaLies } = await supabase
    .from("ticket_relations")
    .select("ticket_cible_id")
    .eq("ticket_id", ticketId);

  const exclus = [ticketId, ...(dejaLies ?? []).map((r) => r.ticket_cible_id)];

  const { data } = await supabase
    .from("tickets_avec_rang")
    .select("id, rang_projet, titre, projets(code_court)")
    .not("id", "in", `(${exclus.join(",")})`)
    .or(`titre.ilike.%${query}%`)
    .limit(8);

  return (data ?? []).map((t) => ({
    id: t.id,
    rang_projet: t.rang_projet,
    titre: t.titre,
    code_court: (t.projets as unknown as { code_court: string | null } | null)?.code_court ?? null,
  }));
}
