"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string | null };

const TAILLE_MAX_OCTETS = 10 * 1024 * 1024; // 10 Mo — doit rester cohérent avec
// file_size_limit du bucket posé dans la migration 0006 (double filet : message
// clair ici, la contrainte au niveau du bucket protège même si ce code change).

export async function uploadAttachment(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const ticketId = formData.get("ticket_id");
  const file = formData.get("file");

  if (typeof ticketId !== "string" || !ticketId) {
    return { error: "Ticket invalide." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Fichier requis." };
  }
  if (file.size > TAILLE_MAX_OCTETS) {
    return { error: "Fichier trop volumineux (max 10 Mo)." };
  }

  const path = `${ticketId}/${crypto.randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("ticket-attachments")
    .upload(path, file, { contentType: file.type || undefined });

  if (uploadError) {
    return { error: `Erreur d'upload : ${uploadError.message}` };
  }

  const { error: insertError } = await supabase.from("ticket_attachments").insert({
    ticket_id: ticketId,
    storage_path: path,
    nom_fichier: file.name,
    taille_octets: file.size,
    type_mime: file.type || null,
    uploaded_by: user.id,
  });

  if (insertError) {
    // Le fichier a été uploadé mais la ligne de métadonnées a échoué : on
    // supprime le fichier orphelin plutôt que de laisser un blob invisible
    // traîner dans le bucket sans jamais pouvoir être listé ni nettoyé.
    await supabase.storage.from("ticket-attachments").remove([path]);
    return { error: `Erreur d'enregistrement : ${insertError.message}` };
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { error: null };
}

export async function deleteAttachment(
  attachmentId: string,
  ticketId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  // Récupérer le storage_path avant suppression
  const { data: attachment, error: fetchError } = await supabase
    .from("ticket_attachments")
    .select("storage_path, ticket_id")
    .eq("id", attachmentId)
    .single();

  if (fetchError || !attachment) return { error: "Pièce jointe introuvable." };

  // Vérification de cohérence : la PJ doit appartenir au ticket demandé
  // (RLS protège déjà, mais évite un message d'erreur cryptique)
  if (attachment.ticket_id !== ticketId) return { error: "Incohérence ticket/PJ." };

  // Supprimer la ligne metadata — la RLS vérifie les droits
  const { error: deleteError } = await supabase
    .from("ticket_attachments")
    .delete()
    .eq("id", attachmentId);

  if (deleteError) return { error: `Erreur : ${deleteError.message}` };

  // Supprimer le fichier du bucket (best-effort : si ça rate, l'orphelin
  // sera nettoyé lors d'une passe de maintenance future)
  await supabase.storage
    .from("ticket-attachments")
    .remove([attachment.storage_path]);

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { error: null };
}
