"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { TICKET_STATUTS, TICKET_PRIORITES } from "@/lib/types";
import { logHistorique, creerNotification } from "@/lib/historique";
import { migrateBase64ImagesToStorage } from "@/lib/actions/migrate-images";

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
  const typeTicketRaw = formData.get("type_ticket");
  const typeTicket =
    typeof typeTicketRaw === "string" && typeTicketRaw.trim()
      ? typeTicketRaw.trim()
      : null;

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
      type_ticket: typeTicket,
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

  // Migrer les images base64 collées pendant la saisie vers Supabase Storage.
  // Best-effort : on ne bloque pas la redirection en cas d'échec.
  const descriptionStr = typeof description === "string" ? description.trim() : "";
  if (descriptionStr) {
    const descriptionMigree = await migrateBase64ImagesToStorage({
      ticketId: ticket.id,
      description: descriptionStr,
      uploadedBy: userId,
    });
    if (descriptionMigree !== descriptionStr) {
      await supabase
        .from("tickets")
        .update({ description: descriptionMigree })
        .eq("id", ticket.id);
    }
  }

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
      console.error("[updateTicketStatutInterne] échec log historique:", historiqueError.message);
    }

    // Log dans ticket_historique (générique)
    await logHistorique(supabase, {
      ticketId,
      champ: "statut",
      ancienneValeur: avant.statut,
      nouvelleValeur: statut,
      changedBy: userId,
    });
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
 * Passage en "en_attente_client" avec assignation simultanée.
 * Appelé depuis la modal de StatusUpdateForm quand l'admin choisit
 * un client à qui assigner le ticket. Le champ assigne_a bascule sur
 * l'uuid client jusqu'à ce qu'il valide ou réouvre.
 * Si assigneA est absent (skip), assigne_a est mis à null.
 */
export async function updateTicketStatusEtAssignation(
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

  const valeurAssigne =
    typeof assigneA === "string" && assigneA.trim() && assigneA !== "__aucun__"
      ? assigneA.trim()
      : null;

  // Lire l'état avant
  const { data: avant } = await supabase
    .from("tickets")
    .select("statut, assigne_a, titre")
    .eq("id", ticketId)
    .single();

  const { error } = await supabase
    .from("tickets")
    .update({
      statut: "en_attente_client",
      assigne_a: valeurAssigne,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) return { error: `Erreur : ${error.message}` };

  const ancienStatut = (avant as unknown as { statut: string })?.statut;

  // Log statut dans les deux tables
  if (ancienStatut && ancienStatut !== "en_attente_client") {
    await supabase.from("ticket_statut_historique").insert({
      ticket_id: ticketId,
      ancien_statut: ancienStatut,
      nouveau_statut: "en_attente_client",
      changed_by: userId,
    });
    await logHistorique(supabase, {
      ticketId,
      champ: "statut",
      ancienneValeur: ancienStatut,
      nouvelleValeur: "en_attente_client",
      changedBy: userId,
    });
  }

  // Log assignation
  const ancienAssigne = (avant as unknown as { assigne_a: string | null })?.assigne_a ?? null;
  await logHistorique(supabase, {
    ticketId,
    champ: "assigne_a",
    ancienneValeur: ancienAssigne,
    nouvelleValeur: valeurAssigne,
    changedBy: userId,
  });

  // Notif + email si on assigne un client
  if (valeurAssigne && valeurAssigne !== ancienAssigne) {
    const { data: profil } = await supabase
      .from("profiles")
      .select("role, email, full_name")
      .eq("id", valeurAssigne)
      .single();

    if (profil?.role === "client") {
      // Notification in-app — l'email partira dans le récap quotidien à 20h
      await creerNotification(supabase, { userId: valeurAssigne, ticketId });
    }
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath("/admin/projets");
  revalidatePath("/admin/calendrier");
  return { error: null };
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

  const { data: avant } = await supabase
    .from("tickets").select("priorite").eq("id", ticketId).single();

  const { error } = await supabase
    .from("tickets")
    .update({ priorite, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) {
    return { error: `Erreur de mise à jour : ${error.message}` };
  }

  await logHistorique(supabase, {
    ticketId,
    champ: "priorite",
    ancienneValeur: avant?.priorite ?? null,
    nouvelleValeur: priorite as string,
    changedBy: (await supabase.auth.getUser()).data.user?.id,
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return { error: null };
}

/**
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
  if (!isAdmin || !userId) return { error: "Action réservée à l\'admin." };

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
    const [{ data: original, error: fetchError }, { data: demande }] = await Promise.all([
      supabase
        .from("tickets")
        .select("titre, description, projet_id, client_id, priorite, created_by, type_ticket, ref_client")
        .eq("id", ticketId)
        .single(),
      supabase
        .from("demandes_reouverture")
        .select("message")
        .eq("id", demandeId)
        .single(),
    ]);

    if (fetchError || !original) {
      return { error: "Ticket d\'origine introuvable." };
    }

    const { data: tagsOrigin } = await supabase
      .from("ticket_tags")
      .select("tag_id")
      .eq("ticket_id", ticketId);

    const commentaireDemande = demande?.message ?? null;
    const descriptionComplete = [
      original.description,
      commentaireDemande
        ? `\n---\n**Commentaire de réouverture :** ${commentaireDemande}`
        : null,
    ].filter(Boolean).join("\n");

    const { data: nouveau, error: creationError } = await supabase
      .from("tickets")
      .insert({
        titre: original.titre,
        description: descriptionComplete || null,
        projet_id: original.projet_id,
        client_id: original.client_id,
        priorite: original.priorite,
        type_ticket: (original as unknown as { type_ticket: string | null }).type_ticket,
        ref_client: (original as unknown as { ref_client: string | null }).ref_client,
        created_by: userId,
        assigne_a: original.created_by ?? userId,
        statut: "ouvert",
        ticket_origine_id: ticketId,
      })
      .select("id")
      .single();

    if (creationError || !nouveau) {
      return { error: `Erreur création du nouveau ticket : ${creationError?.message ?? "inconnue"}` };
    }

    nouveauTicketId = nouveau.id;

    if (tagsOrigin && tagsOrigin.length > 0) {
      await supabase.from("ticket_tags").insert(
        tagsOrigin.map((t) => ({ ticket_id: nouveauTicketId!, tag_id: t.tag_id }))
      );
    }

    await supabase
      .from("tickets")
      .update({ statut: "ferme", updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    await supabase.from("ticket_relations").insert({
      ticket_id: ticketId,
      ticket_cible_id: nouveauTicketId,
      type: "en_relation_avec",
      created_by: userId,
    });

    await logHistorique(supabase, {
      ticketId,
      champ: "statut",
      ancienneValeur: "resolu",
      nouvelleValeur: commentaireDemande
        ? `ferme — Réouverture acceptée. Commentaire : ${commentaireDemande}`
        : "ferme — Réouverture acceptée",
      changedBy: userId,
    });

    await logHistorique(supabase, {
      ticketId: nouveauTicketId!,
      champ: "statut",
      ancienneValeur: null,
      nouvelleValeur: commentaireDemande
        ? `ouvert — Créé suite à réouverture. Commentaire : ${commentaireDemande}`
        : "ouvert — Créé suite à réouverture",
      changedBy: userId,
    });

    await supabase.from("ticket_statut_historique").insert({
      ticket_id: ticketId,
      ancien_statut: "resolu",
      nouveau_statut: "ferme",
      changed_by: userId,
    });
  }

  // Branche refusée : remettre le ticket en ouvert + désattribuer le client.
  // (Si acceptée, le ticket original est déjà passé à "ferme" plus haut.)
  if (decision === "refusee") {
    await supabase
      .from("tickets")
      .update({ statut: "ouvert", assigne_a: null, updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    await logHistorique(supabase, {
      ticketId,
      champ: "statut",
      ancienneValeur: "en_attente_client",
      nouvelleValeur: "ouvert — Réouverture refusée",
      changedBy: userId,
    });

    await supabase.from("ticket_statut_historique").insert({
      ticket_id: ticketId,
      ancien_statut: "en_attente_client",
      nouveau_statut: "ouvert",
      changed_by: userId,
    });
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
  const { supabase, isAdmin, userId } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const ticketId = formData.get("ticket_id");
  const valeur = formData.get("valeur");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };
  if (typeof valeur !== "string" || !valeur.trim()) return { error: "Le titre ne peut pas être vide." };

  const { data: avant } = await supabase.from("tickets").select("titre").eq("id", ticketId).single();

  const { error } = await supabase
    .from("tickets")
    .update({ titre: valeur.trim(), updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { error: `Erreur : ${error.message}` };

  await logHistorique(supabase, {
    ticketId,
    champ: "titre",
    ancienneValeur: avant?.titre ?? null,
    nouvelleValeur: valeur.trim(),
    changedBy: userId,
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return { error: null };
}

export async function updateTicketDescription(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin, userId } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const ticketId = formData.get("ticket_id");
  const valeur = formData.get("valeur");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };
  const description = typeof valeur === "string" ? valeur.trim() || null : null;

  const { data: avant } = await supabase.from("tickets").select("description").eq("id", ticketId).single();

  const { error } = await supabase
    .from("tickets")
    .update({ description, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { error: `Erreur : ${error.message}` };

  await logHistorique(supabase, {
    ticketId,
    champ: "description",
    ancienneValeur: avant?.description ?? null,
    nouvelleValeur: description,
    changedBy: userId,
  });

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

/**
 * Assignation en masse — met à jour assigne_a sur tous les tickets
 * sélectionnés en un seul update SQL (contrairement au bulk statut qui
 * passe par updateTicketStatutInterne pour l'historique, l'assignation
 * n'a pas de table d'historique dédiée).
 */
export async function updateTicketsAssigneBulk(
  ticketIds: string[],
  assigneA: string | null
): Promise<{ maj: number; echecs: number }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { maj: 0, echecs: ticketIds.length };

  const { error } = await supabase
    .from("tickets")
    .update({ assigne_a: assigneA, updated_at: new Date().toISOString() })
    .in("id", ticketIds);

  if (error) return { maj: 0, echecs: ticketIds.length };

  revalidatePath("/admin/tickets");
  return { maj: ticketIds.length, echecs: 0 };
}

export async function updateTicketType(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin, userId } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const ticketId = formData.get("ticket_id");
  const typeRaw = formData.get("type_ticket");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };

  const type =
    typeof typeRaw === "string" && typeRaw && typeRaw !== "__aucun__"
      ? typeRaw
      : null;

  const { data: avant } = await supabase.from("tickets").select("type_ticket").eq("id", ticketId).single();

  const { error } = await supabase
    .from("tickets")
    .update({ type_ticket: type, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { error: `Erreur : ${error.message}` };

  await logHistorique(supabase, {
    ticketId,
    champ: "type_ticket",
    ancienneValeur: (avant as unknown as { type_ticket: string | null })?.type_ticket ?? null,
    nouvelleValeur: type,
    changedBy: userId,
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  return { error: null };
}

export async function updateTicketsTypeBulk(
  ticketIds: string[],
  type: string | null
): Promise<{ maj: number; echecs: number }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { maj: 0, echecs: ticketIds.length };

  const { error } = await supabase
    .from("tickets")
    .update({ type_ticket: type, updated_at: new Date().toISOString() })
    .in("id", ticketIds);

  if (error) return { maj: 0, echecs: ticketIds.length };

  revalidatePath("/admin/tickets");
  return { maj: ticketIds.length, echecs: 0 };
}
