"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string | null };

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id };
}

/**
 * Les deux espaces (admin/client) peuvent afficher le même ticket à des
 * URLs différentes — on invalide les deux plutôt que de faire porter à
 * l'appelant la responsabilité de savoir dans quel espace il se trouve.
 * Invalider un chemin qui ne concernait pas l'utilisateur courant est un
 * no-op, pas une erreur.
 */
function revalidateTicket(ticketId: string) {
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
}

export async function toggleTicketTag(
  ticketId: string,
  tagId: string,
  attacher: boolean
): Promise<ActionResult> {
  const { supabase, userId } = await requireAuth();
  if (!userId) return { error: "Non authentifié." };

  const { error } = attacher
    ? await supabase.from("ticket_tags").insert({ ticket_id: ticketId, tag_id: tagId })
    : await supabase
        .from("ticket_tags")
        .delete()
        .eq("ticket_id", ticketId)
        .eq("tag_id", tagId);

  if (error) return { error: error.message };
  revalidateTicket(ticketId);
  return { error: null };
}

export async function createChecklistItem(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, userId } = await requireAuth();
  if (!userId) return { error: "Non authentifié." };

  const ticketId = formData.get("ticket_id");
  const contenu = formData.get("contenu");

  if (typeof ticketId !== "string" || !ticketId) {
    return { error: "Ticket invalide." };
  }
  if (typeof contenu !== "string" || !contenu.trim()) {
    return { error: "Contenu requis." };
  }

  const { error } = await supabase
    .from("ticket_checklist_items")
    .insert({ ticket_id: ticketId, contenu: contenu.trim() });

  if (error) return { error: error.message };
  revalidateTicket(ticketId);
  return { error: null };
}

export async function toggleChecklistItem(
  itemId: string,
  ticketId: string,
  complete: boolean
) {
  const { supabase, userId } = await requireAuth();
  if (!userId) return;

  await supabase.from("ticket_checklist_items").update({ complete }).eq("id", itemId);
  revalidateTicket(ticketId);
}

export async function deleteChecklistItem(formData: FormData) {
  const { supabase, userId } = await requireAuth();
  if (!userId) return;

  const itemId = formData.get("item_id");
  const ticketId = formData.get("ticket_id");
  if (typeof itemId !== "string" || typeof ticketId !== "string") return;

  await supabase.from("ticket_checklist_items").delete().eq("id", itemId);
  revalidateTicket(ticketId);
}
