"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TICKET_STATUTS, TICKET_PRIORITES } from "@/lib/types";

export type FormState = { error: string | null };

/**
 * Toutes les actions ci-dessous revérifient le rôle admin elles-mêmes,
 * même si les pages qui les appellent sont déjà protégées par le layout
 * (admin/layout.tsx) et le proxy. Une Server Action est un endpoint réseau
 * indépendant : elle doit se défendre toute seule, pas compter sur le
 * contexte de rendu qui l'entoure.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, isAdmin: false as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, isAdmin: profile?.role === "admin", userId: user.id };
}

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

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      titre: titre.trim(),
      description: typeof description === "string" ? description.trim() : null,
      projet_id: projetId,
      client_id: clientId,
      priorite,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Erreur de création : ${error.message}` };
  }

  revalidatePath("/admin/tickets");
  redirect(`/admin/tickets/${ticket.id}`);
}

export async function updateTicketStatus(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const ticketId = formData.get("ticket_id");
  const statut = formData.get("statut");

  if (typeof ticketId !== "string" || !ticketId) {
    return { error: "Ticket invalide." };
  }
  if (
    typeof statut !== "string" ||
    !TICKET_STATUTS.includes(statut as (typeof TICKET_STATUTS)[number])
  ) {
    return { error: "Statut invalide." };
  }

  const { error } = await supabase
    .from("tickets")
    .update({ statut, updated_at: new Date().toISOString() })
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

  if (decision === "acceptee") {
    const { error: ticketError } = await supabase
      .from("tickets")
      .update({ statut: "ouvert", updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (ticketError) {
      return { error: `Erreur ticket : ${ticketError.message}` };
    }
  }

  const { error: demandeError } = await supabase
    .from("demandes_reouverture")
    .update({
      statut: decision,
      traitee_at: new Date().toISOString(),
      traitee_par: userId,
    })
    .eq("id", demandeId);

  if (demandeError) {
    return { error: `Erreur demande : ${demandeError.message}` };
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  return { error: null };
}
