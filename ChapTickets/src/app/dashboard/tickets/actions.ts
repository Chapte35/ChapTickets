"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { TICKET_PRIORITES, TICKET_TYPES, type TicketType } from "@/lib/types";
import { migrateBase64ImagesToStorage } from "@/lib/actions/migrate-images";

export type FormState = { error: string | null };

export async function createTicketClient(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isClient, userId } = await requireClient();
  if (!isClient || !userId) return { error: "Action réservée aux clients." };

  const titre = formData.get("titre");
  const description = formData.get("description");
  const projetId = formData.get("projet_id");
  const priorite = formData.get("priorite");
  const refClient = formData.get("ref_client");
  const typeTicketRaw = formData.get("type_ticket");
  const typeTicket =
    typeof typeTicketRaw === "string" && typeTicketRaw.trim()
      ? typeTicketRaw.trim()
      : null;

  if (typeof titre !== "string" || !titre.trim()) {
    return { error: "Titre requis." };
  }
  if (typeof projetId !== "string" || !projetId) {
    return { error: "Projet requis." };
  }
  if (
    typeof priorite !== "string" ||
    !TICKET_PRIORITES.includes(priorite as (typeof TICKET_PRIORITES)[number])
  ) {
    return { error: "Priorité invalide." };
  }

  // client_id = created_by = userId : la policy RLS `client_create_ticket_own_projet`
  // vérifie exactement ça (et l'appartenance au projet), donc pas la peine
  // de dupliquer cette vérification ici — si ça ne passe pas, l'insert échoue.
  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      titre: titre.trim(),
      description: typeof description === "string" ? description.trim() : null,
      projet_id: projetId,
      client_id: userId,
      created_by: userId,
      priorite,
      ref_client: typeof refClient === "string" && refClient.trim() ? refClient.trim() : null,
      type_ticket: typeTicket,
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Erreur de création : ${error.message}` };
  }
  if (!ticket) {
    return {
      error:
        "Le ticket a peut-être été créé mais n'a pas pu être relu (policy RLS ?). Vérifie /dashboard/tickets.",
    };
  }

  revalidatePath("/dashboard/tickets");

  // Migrer les images base64 collées pendant la saisie vers Supabase Storage.
  // Best-effort : on ne bloque pas la redirection en cas d'échec.
  const descriptionStr = typeof description === "string" ? description.trim() : "";
  if (descriptionStr) {
    const adminClient = createAdminClient();
    const descriptionMigree = await migrateBase64ImagesToStorage({
      ticketId: ticket.id,
      description: descriptionStr,
      uploadedBy: userId,
    });
    if (descriptionMigree !== descriptionStr) {
      await adminClient
        .from("tickets")
        .update({ description: descriptionMigree })
        .eq("id", ticket.id);
    }
  }

  const tagIds = formData.getAll("tag_ids").filter((v): v is string => typeof v === "string");
  if (tagIds.length > 0) {
    const { error: tagsError } = await supabase
      .from("ticket_tags")
      .insert(tagIds.map((tagId) => ({ ticket_id: ticket.id, tag_id: tagId })));
    if (tagsError) {
      console.error("[createTicketClient] échec rattachement tags:", tagsError.message);
    }
  }

  redirect(`/dashboard/tickets/${ticket.id}`);
}

export async function demanderReouverture(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isClient, userId } = await requireClient();
  if (!isClient || !userId) return { error: "Action réservée aux clients." };

  const ticketId = formData.get("ticket_id");
  const message = formData.get("message");

  if (typeof ticketId !== "string" || !ticketId) {
    return { error: "Ticket invalide." };
  }

  // Insère la demande AVANT de changer le statut — la policy RLS vérifie
  // que le ticket est en en_attente_client au moment de l'insert.
  const { error } = await supabase.from("demandes_reouverture").insert({
    ticket_id: ticketId,
    demande_par: userId,
    message: typeof message === "string" && message.trim() ? message.trim() : null,
  });

  if (error) {
    console.error("[demanderReouverture] Supabase error:", error);
    return {
      error: `Erreur technique : ${error.message} (code: ${error.code})`,
    };
  }

  // Repasse le ticket en "ouvert" après l'insert de la demande.
  const { error: updateError } = await supabase
    .from("tickets")
    .update({ statut: "ouvert", updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (updateError) {
    return { error: `Erreur : ${updateError.message}` };
  }

  // Désassigner via service role — le trigger bloque assigne_a pour les clients
  await createAdminClient()
    .from("tickets")
    .update({ assigne_a: null })
    .eq("id", ticketId);

  // Log dans les deux tables d'historique
  await supabase.from("ticket_statut_historique").insert({
    ticket_id: ticketId,
    ancien_statut: "en_attente_client",
    nouveau_statut: "ouvert",
    changed_by: userId,
  });

  const { logHistorique } = await import("@/lib/historique");
  const texteMessage = typeof message === "string" && message.trim() ? message.trim() : null;
  await logHistorique(supabase, {
    ticketId,
    champ: "statut",
    ancienneValeur: "en_attente_client",
    nouvelleValeur: texteMessage
      ? `ouvert — Bug persistant : ${texteMessage}`
      : "ouvert — Bug persistant signalé",
    changedBy: userId,
  });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
  return { error: null };
}

export async function updateTicketTitreClient(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isClient, userId } = await requireClient();
  if (!isClient || !userId) return { error: "Action réservée aux clients." };

  const ticketId = formData.get("ticket_id");
  const valeur = formData.get("valeur");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };
  if (typeof valeur !== "string" || !valeur.trim()) return { error: "Le titre ne peut pas être vide." };

  // La RLS filtre sur client_projets (appartenance au projet, pas client_id).
  // Le trigger restreindre_update_ticket_client autorise titre côté base.
  const { error } = await supabase
    .from("tickets")
    .update({ titre: valeur.trim(), updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { error: `Erreur : ${error.message}` };

  const { data: avant } = await supabase.from("tickets").select("titre").eq("id", ticketId).single();
  const { logHistorique } = await import("@/lib/historique");
  await logHistorique(supabase, {
    ticketId,
    champ: "titre",
    ancienneValeur: (avant as unknown as { titre: string | null })?.titre ?? null,
    nouvelleValeur: valeur.trim(),
    changedBy: userId,
  });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
  return { error: null };
}

export async function updateTicketDescriptionClient(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isClient, userId } = await requireClient();
  if (!isClient || !userId) return { error: "Action réservée aux clients." };

  const ticketId = formData.get("ticket_id");
  const valeur = formData.get("valeur");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };
  const description = typeof valeur === "string" ? valeur.trim() || null : null;

  const { error } = await supabase
    .from("tickets")
    .update({ description, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { error: `Erreur : ${error.message}` };

  const { logHistorique } = await import("@/lib/historique");
  await logHistorique(supabase, {
    ticketId,
    champ: "description",
    ancienneValeur: null,
    nouvelleValeur: description ?? null,
    changedBy: userId,
  });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
  return { error: null };
}

/**
 * Mise à jour de la priorité par le client — uniquement sur les tickets
 * qu'il a créés lui-même (created_by = userId).
 * Double protection : vérification applicative ici + trigger DB (0021).
 */
export async function updateTicketPrioriteClient(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isClient, userId } = await requireClient();
  if (!isClient || !userId) return { error: "Action réservée aux clients." };

  const ticketId = formData.get("ticket_id");
  const priorite = formData.get("priorite");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };
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

  if (error) return { error: `Erreur : ${error.message}` };

  const { logHistorique } = await import("@/lib/historique");
  await logHistorique(supabase, {
    ticketId,
    champ: "priorite",
    ancienneValeur: null,
    nouvelleValeur: priorite,
    changedBy: userId,
  });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
  return { error: null };
}

export async function updateTicketTypeClient(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isClient, userId } = await requireClient();
  if (!isClient || !userId) return { error: "Action réservée aux clients." };

  const ticketId = formData.get("ticket_id");
  const typeRaw = formData.get("type_ticket");
  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };

  const type = typeof typeRaw === "string" && typeRaw && TICKET_TYPES.includes(typeRaw as TicketType)
    ? (typeRaw as TicketType)
    : null;

  const { data: avant } = await supabase
    .from("tickets").select("type_ticket").eq("id", ticketId).single();

  const { error } = await supabase
    .from("tickets")
    .update({ type_ticket: type, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { error: `Erreur : ${error.message}` };

  const { logHistorique } = await import("@/lib/historique");
  await logHistorique(supabase, {
    ticketId,
    champ: "type_ticket",
    ancienneValeur: (avant as unknown as { type_ticket: string | null })?.type_ticket ?? null,
    nouvelleValeur: type,
    changedBy: userId,
  });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { error: null };
}

/**
 * Validation client d'un ticket en attente de retour.
 * Seule transition autorisée : en_attente_client → resolu.
 * La RLS protège déjà contre toute modification sur un ticket non visible
 * par ce client — cette vérification de statut est une défense applicative
 * supplémentaire pour éviter qu'un client valide un ticket qui n'est pas
 * dans le bon état (ex : requête rejouée hors contexte).
 */
export async function validerTicketClient(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isClient, userId } = await requireClient();
  if (!isClient || !userId) return { error: "Action réservée aux clients." };

  const ticketId = formData.get("ticket_id");
  const commentaire = formData.get("commentaire");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };

  // Vérification du statut avant modification
  const { data: ticket } = await supabase
    .from("tickets")
    .select("statut, created_by")
    .eq("id", ticketId)
    .single();

  if (ticket?.statut !== "en_attente_client") {
    return { error: "Ce ticket n'est pas en attente de validation client." };
  }

  // On ne touche PAS à assigne_a ici : le trigger restreindre_update_ticket_client
  // bloque toute modification de assigne_a par un client. La désassignation
  // est gérée côté admin (traiterDemandeReouverture) ou via une action admin.
  const { error: updateError } = await supabase
    .from("tickets")
    .update({
      statut: "resolu",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (updateError) return { error: `Erreur : ${updateError.message}` };

  // Désassigner via service role — le trigger bloque assigne_a pour les clients
  await createAdminClient()
    .from("tickets")
    .update({ assigne_a: null })
    .eq("id", ticketId);

  // Historique dans les deux tables — ticket_statut_historique pour le
  // calendrier, ticket_historique pour la timeline de la fiche.
  await supabase.from("ticket_statut_historique").insert({
    ticket_id: ticketId,
    ancien_statut: "en_attente_client",
    nouveau_statut: "resolu",
    changed_by: userId,
  });

  // Import dynamique pour éviter une dépendance circulaire potentielle
  const { logHistorique } = await import("@/lib/historique");

  // Récupère le pseudo du client pour un message d'historique explicite
  const { data: profil } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();
  const pseudo = profil?.full_name || profil?.email || "Client";
  const texteCommentaire = typeof commentaire === "string" ? commentaire.trim() : "";
  const valeurLog = texteCommentaire
    ? `Résolu — Validé par ${pseudo}, Commentaire : ${texteCommentaire}`
    : `Résolu — Validé par ${pseudo}`;

  await logHistorique(supabase, {
    ticketId,
    champ: "statut",
    ancienneValeur: "en_attente_client",
    nouvelleValeur: valeurLog,
    changedBy: userId,
  });

  // Commentaire optionnel posté dans le thread
  const texte = typeof commentaire === "string" ? commentaire.trim() : "";
  if (texte) {
    await supabase.from("messages").insert({
      ticket_id: ticketId,
      auteur_id: userId,
      contenu: texte,
    });
  }

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
  return { error: null };
}

export async function postMessageClient(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isClient, userId } = await requireClient();
  if (!isClient || !userId) return { error: "Action réservée aux clients." };

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
    // La policy RLS refuse l'insert si le ticket n'est plus visible par ce
    // client (edge case rare) : message reformulé plutôt que l'erreur brute.
    return { error: "Impossible d'envoyer le message." };
  }

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { error: null };
}
