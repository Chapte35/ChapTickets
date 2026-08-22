"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { TICKET_STATUTS, TICKET_PRIORITES } from "@/lib/types";

export type FormState = { error: string | null };

export async function createTicketAdmin(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin, userId } = await requireAdmin();
  if (!isAdmin || !userId) return { error: "Action réservée à l'admin." };

  const titre = formData.get("titre");
  const description = formData.get("description");
  const projetId = formData.get("projet_id");
  const clientId = formData.get("client_id");
  const priorite = formData.get("priorite");

  if (typeof titre !== "string" || !titre.trim()) {
    return { error: "Titre requis." };
  }
  if (typeof projetId !== "string" || !projetId) {
    return { error: "Projet requis." };
  }
  if (typeof clientId !== "string" || !clientId) {
    return { error: "Client requis." };
  }
  if (
    typeof priorite !== "string" ||
    !TICKET_PRIORITES.includes(priorite as (typeof TICKET_PRIORITES)[number])
  ) {
    return { error: "Priorité invalide." };
  }

  const dateEcheance = formData.get("date_prevue");

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      titre: titre.trim(),
      description: typeof description === "string" ? description.trim() : null,
      projet_id: projetId,
      client_id: clientId,
      priorite,
      created_by: userId,
      date_prevue: typeof dateEcheance === "string" && dateEcheance ? dateEcheance : null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Erreur de création : ${error.message}` };
  }
  if (!ticket) {
    // Filet de sécurité gardé : garantit qu'on ne plante jamais sur
    // `ticket.id` si Supabase renvoie un jour "pas d'erreur mais pas de
    // ligne" (RLS de relecture différente de la RLS d'insertion). Jamais
    // observé en pratique jusqu'ici — le vrai bug rencontré était que le
    // formulaire renvoyait "Client requis" (normal : projet sans client
    // rattaché), pas ce cas-ci. Gardé par prudence, pas par superstition.
    return {
      error:
        "Le ticket a peut-être été créé mais n'a pas pu être relu (policy RLS ?). Vérifie /admin/tickets.",
    };
  }

  revalidatePath("/admin/tickets");

  const tagIds = formData.getAll("tag_ids").filter((v): v is string => typeof v === "string");
  if (tagIds.length > 0) {
    // Best-effort : si l'insertion des tags échoue, le ticket existe déjà
    // et on ne veut pas bloquer sa création pour autant — on log plutôt
    // que de planter, et l'admin pourra toujours ajouter les tags à la main
    // depuis la fiche ticket.
    const { error: tagsError } = await supabase
      .from("ticket_tags")
      .insert(tagIds.map((tagId) => ({ ticket_id: ticket.id, tag_id: tagId })));
    if (tagsError) {
      console.error("[createTicketAdmin] échec rattachement tags:", tagsError.message);
    }
  }

  redirect(`/admin/tickets/${ticket.id}`);
}

/**
 * Logique réelle du changement de statut, appelable directement (drag &
 * drop du kanban tickets) sans passer par un FormData — même dualité que
 * updateProjetStatut/updateProjetStatutForm dans admin/projets/actions.ts.
 * updateTicketStatus (form, ci-dessous) n'est plus qu'un adaptateur autour
 * de celle-ci.
 */
export async function updateTicketStatutInterne(
  ticketId: string,
  statut: string
): Promise<FormState> {
  const { supabase, isAdmin, userId } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  if (!ticketId) {
    return { error: "Ticket invalide." };
  }
  if (!TICKET_STATUTS.includes(statut as (typeof TICKET_STATUTS)[number])) {
    return { error: "Statut invalide." };
  }

  // Statut actuel lu avant modification, pour ne logger dans l'historique
  // que les vrais changements (pas un "update" qui remet le même statut).
  const { data: avant } = await supabase
    .from("tickets")
    .select("statut")
    .eq("id", ticketId)
    .single();

  const { error } = await supabase
    .from("tickets")
    .update({ statut, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) {
    return { error: `Erreur de mise à jour : ${error.message}` };
  }

  if (avant && avant.statut !== statut) {
    const { error: historiqueError } = await supabase
      .from("ticket_statut_historique")
      .insert({
        ticket_id: ticketId,
        ancien_statut: avant.statut,
        nouveau_statut: statut,
        changed_by: userId,
      });
    if (historiqueError) {
      // Le changement de statut lui-même a réussi — on ne fait pas échouer
      // toute l'action pour un souci sur une table annexe d'historique.
      console.error("[updateTicketStatutInterne] échec log historique:", historiqueError.message);
    }
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath("/admin/projets");
  revalidatePath("/admin/calendrier");
  return { error: null };
}

export async function updateTicketStatus(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const ticketId = formData.get("ticket_id");
  const statut = formData.get("statut");

  if (typeof ticketId !== "string" || !ticketId) {
    return { error: "Ticket invalide." };
  }
  if (typeof statut !== "string") {
    return { error: "Statut invalide." };
  }

  return updateTicketStatutInterne(ticketId, statut);
}

/**
 * Même pattern que updateTicketStatus, en plus simple : la priorité n'a
 * pas de table d'historique dédiée (contrairement au statut, qui alimente
 * le calendrier via ticket_statut_historique) — rien à logger ici.
 */
export async function updateTicketPriorite(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const ticketId = formData.get("ticket_id");
  const priorite = formData.get("priorite");

  if (typeof ticketId !== "string" || !ticketId) {
    return { error: "Ticket invalide." };
  }
  if (
    typeof priorite !== "string" ||
    !TICKET_PRIORITES.includes(priorite as (typeof TICKET_PRIORITES)[number])
  ) {
    return { error: "Priorité invalide." };
  }

  const { error } = await supabase
    .from("tickets")
    .update({ priorite, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) {
    return { error: `Erreur de mise à jour : ${error.message}` };
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return { error: null };
}

/**
 * Accepter une demande de réouverture : passe le ticket en "ouvert" ET
 * marque la demande "acceptee", dans le même geste (deux updates, pas de
 * transaction multi-table côté Supabase JS — acceptable ici, le pire cas
 * en cas d'échec partiel est une demande qui reste "en_attente" avec un
 * ticket déjà rouvert, visible et rattrapable manuellement).
 */
export async function traiterDemandeReouverture(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin, userId } = await requireAdmin();
  if (!isAdmin || !userId) return { error: "Action réservée à l'admin." };

  const demandeId = formData.get("demande_id");
  const ticketId = formData.get("ticket_id");
  const decision = formData.get("decision"); // "acceptee" | "refusee"

  if (
    typeof demandeId !== "string" ||
    typeof ticketId !== "string" ||
    (decision !== "acceptee" && decision !== "refusee")
  ) {
    return { error: "Requête invalide." };
  }

  let nouveauTicketId: string | null = null;

  if (decision === "acceptee") {
    // On récupère les infos nécessaires pour cloner un nouveau ticket —
    // l'original reste tel quel (résolu/fermé), c'est le nouveau qui
    // devient "ouvert". Ça garantit qu'un ticket n'a jamais qu'une seule
    // date de création, donc jamais qu'une seule release possible.
    const { data: original, error: fetchError } = await supabase
      .from("tickets")
      .select("titre, description, projet_id, client_id, priorite")
      .eq("id", ticketId)
      .single();

    if (fetchError || !original) {
      return { error: "Ticket d'origine introuvable." };
    }

    const { data: nouveau, error: creationError } = await supabase
      .from("tickets")
      .insert({
        titre: original.titre,
        description: original.description,
        projet_id: original.projet_id,
        client_id: original.client_id,
        priorite: original.priorite,
        created_by: userId,
        statut: "ouvert",
        ticket_origine_id: ticketId,
      })
      .select("id")
      .single();

    if (creationError || !nouveau) {
      return { error: `Erreur création du nouveau ticket : ${creationError?.message ?? "inconnue"}` };
    }

    nouveauTicketId = nouveau.id;
  }

  const { error: demandeError } = await supabase
    .from("demandes_reouverture")
    .update({
      statut: decision,
      traitee_at: new Date().toISOString(),
      traitee_par: userId,
      nouveau_ticket_id: nouveauTicketId,
    })
    .eq("id", demandeId);

  if (demandeError) {
    return { error: `Erreur demande : ${demandeError.message}` };
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  if (nouveauTicketId) revalidatePath(`/admin/tickets/${nouveauTicketId}`);
  revalidatePath("/admin/tickets");
  return { error: null };
}

export async function updateDateEcheance(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const ticketId = formData.get("ticket_id");
  const dateEcheance = formData.get("date_prevue");

  if (typeof ticketId !== "string" || !ticketId) {
    return { error: "Ticket invalide." };
  }

  const { error } = await supabase
    .from("tickets")
    .update({ date_prevue: typeof dateEcheance === "string" && dateEcheance ? dateEcheance : null })
    .eq("id", ticketId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/calendrier");
  return { error: null };
}

export async function postMessageAdmin(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin, userId } = await requireAdmin();
  if (!isAdmin || !userId) return { error: "Action réservée à l'admin." };

  const ticketId = formData.get("ticket_id");
  const contenu = formData.get("contenu");

  if (typeof ticketId !== "string" || !ticketId) {
    return { error: "Ticket invalide." };
  }
  if (typeof contenu !== "string" || !contenu.trim()) {
    return { error: "Message vide." };
  }

  const { error } = await supabase.from("messages").insert({
    ticket_id: ticketId,
    auteur_id: userId,
    contenu: contenu.trim(),
  });

  if (error) {
    return { error: `Erreur d'envoi : ${error.message}` };
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  return { error: null };
}

/**
 * Supprime les fichiers Storage d'un ticket avant de le supprimer lui-même
 * — la cascade DB nettoie bien la ligne `ticket_attachments`, mais pas le
 * fichier binaire dans le bucket (Storage n'est pas soumis aux contraintes
 * de clé étrangère Postgres), qui resterait sinon orphelin indéfiniment.
 */
async function nettoyerPiecesJointes(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  ticketId: string
) {
  const { data: attachments } = await supabase
    .from("ticket_attachments")
    .select("storage_path")
    .eq("ticket_id", ticketId);

  if (attachments && attachments.length > 0) {
    await supabase.storage
      .from("ticket-attachments")
      .remove(attachments.map((a) => a.storage_path));
  }
}

export async function deleteTicket(ticketId: string): Promise<{ error: string | null }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  await nettoyerPiecesJointes(supabase, ticketId);

  const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
  if (error) return { error: error.message };

  revalidatePath("/admin/tickets");
  revalidatePath("/admin/calendrier");
  return { error: null };
}

export async function updateTicketTitre(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const ticketId = formData.get("ticket_id");
  const valeur = formData.get("valeur");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };
  if (typeof valeur !== "string" || !valeur.trim()) return { error: "Le titre ne peut pas être vide." };

  const { error } = await supabase
    .from("tickets")
    .update({ titre: valeur.trim(), updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { error: `Erreur : ${error.message}` };

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return { error: null };
}

export async function updateTicketDescription(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const ticketId = formData.get("ticket_id");
  const valeur = formData.get("valeur");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };
  // Description nullable : une chaîne vide = null en base
  const description = typeof valeur === "string" ? valeur.trim() || null : null;

  const { error } = await supabase
    .from("tickets")
    .update({ description, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { error: `Erreur : ${error.message}` };

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return { error: null };
}

export async function deleteTicketsBulk(
  ticketIds: string[]
): Promise<{ supprimes: number; echecs: number }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { supprimes: 0, echecs: ticketIds.length };

  let supprimes = 0;
  for (const id of ticketIds) {
    await nettoyerPiecesJointes(supabase, id);
    const { error } = await supabase.from("tickets").delete().eq("id", id);
    if (!error) supprimes++;
  }

  revalidatePath("/admin/tickets");
  revalidatePath("/admin/calendrier");
  return { supprimes, echecs: ticketIds.length - supprimes };
}

/**
 * Changement de statut en masse (tableau /admin/tickets, sprint 12) — un
 * appel à updateTicketStatutInterne par ticket plutôt qu'un update SQL en
 * masse, pour que chaque changement passe par la même logique (validation,
 * historique) que le select individuel de la fiche ticket. Moins
 * performant sur un très gros volume, mais garde une seule source de
 * vérité pour "qu'est-ce qu'un changement de statut".
 */
export async function updateTicketsStatutBulk(
  ticketIds: string[],
  statut: string
): Promise<{ maj: number; echecs: number }> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { maj: 0, echecs: ticketIds.length };

  let maj = 0;
  for (const id of ticketIds) {
    const result = await updateTicketStatutInterne(id, statut);
    if (!result.error) maj++;
  }

  return { maj, echecs: ticketIds.length - maj };
}
