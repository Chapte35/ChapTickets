"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TICKET_PRIORITES } from "@/lib/types";

export type FormState = { error: string | null };

async function requireClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, isClient: false as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, isClient: profile?.role === "client", userId: user.id };
}

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

  revalidatePath("/dashboard/tickets");
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
    // La policy RLS refuse l'insert si le ticket n'est pas resolu/ferme ou
    // pas visible par ce client : dans ce cas Supabase renvoie une erreur
    // RLS générique, pas un message clair. On la reformule.
    return {
      error:
        "Impossible d'envoyer la demande (le ticket n'est peut-être plus éligible à une réouverture).",
    };
  }

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { error: null };
}
