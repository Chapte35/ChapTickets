"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth/guards";
import { TICKET_PRIORITES } from "@/lib/types";

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

  revalidatePath(`/dashboard/tickets/${ticketId}`);
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

  // Vérification applicative : le client ne peut modifier que ses propres tickets.
  // Le trigger 0021 est la ligne de défense DB — cette vérif applicative évite
  // d'exposer une erreur de trigger cryptique à l'utilisateur.
  const { data: ticket } = await supabase
    .from("tickets")
    .select("created_by")
    .eq("id", ticketId)
    .single();

  if (!ticket || ticket.created_by !== userId) {
    return { error: "Vous ne pouvez modifier la priorité que sur vos propres tickets." };
  }

  const { error } = await supabase
    .from("tickets")
    .update({ priorite, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) return { error: `Erreur : ${error.message}` };

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
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
    .select("statut")
    .eq("id", ticketId)
    .single();

  if (ticket?.statut !== "en_attente_client") {
    return { error: "Ce ticket n'est pas en attente de validation client." };
  }

  const { error: updateError } = await supabase
    .from("tickets")
    .update({ statut: "resolu", updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (updateError) return { error: `Erreur : ${updateError.message}` };

  // Historique du changement de statut
  await supabase.from("ticket_statut_historique").insert({
    ticket_id: ticketId,
    ancien_statut: "en_attente_client",
    nouveau_statut: "resolu",
    changed_by: userId,
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
