"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { error: string | null };

/**
 * Crée une release, assigne les tickets droppés dessus, puis (optionnellement)
 * envoie un email de notification à tous les clients du projet ou à une sélection.
 */
export async function createReleaseAvecTickets(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin." };

  const projetId = formData.get("projet_id");
  const nom = formData.get("nom");
  const date = formData.get("date");
  const description = formData.get("description");
  const notifier = formData.get("notifier") === "on";
  const ticketIds = formData
    .getAll("ticket_ids")
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  // Clients sélectionnés manuellement (vide = tous les clients du projet)
  const clientIdsSelectionnes = formData
    .getAll("client_ids")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  if (typeof projetId !== "string" || !projetId) return { error: "Projet requis." };
  if (typeof nom !== "string" || !nom.trim()) return { error: "Nom de release requis." };
  if (typeof date !== "string" || !date) return { error: "Date requise." };

  // ── Création de la release ─────────────────────────────────────────────────
  const { data: release, error } = await supabase
    .from("releases")
    .insert({
      projet_id: projetId,
      nom: nom.trim(),
      date,
      description:
        typeof description === "string" && description.trim()
          ? description.trim()
          : null,
    })
    .select("id")
    .single();

  if (error || !release) {
    return { error: `Erreur de création : ${error?.message ?? "inconnue"}` };
  }

  // ── Assignation des tickets ────────────────────────────────────────────────
  if (ticketIds.length > 0) {
    const { error: assignError } = await supabase
      .from("tickets")
      .update({ release_id: release.id })
      .in("id", ticketIds);

    if (assignError) {
      return {
        error: `Release créée, mais échec d'assignation des tickets : ${assignError.message}`,
      };
    }
  }

  // ── Notification email ─────────────────────────────────────────────────────
  if (notifier) {
    let clientIds = clientIdsSelectionnes;

    // Si aucun client sélectionné explicitement → tous les clients du projet
    if (clientIds.length === 0) {
      const { data: cpRows } = await supabase
        .from("client_projets")
        .select("client_id")
        .eq("projet_id", projetId);
      clientIds = (cpRows ?? []).map((r) => r.client_id as string);
    }

    if (clientIds.length > 0) {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin.functions.invoke("envoyer-email-release", {
        body: { releaseId: release.id, clientIds, declencheur: "auto" },
      });
      // On ne bloque pas sur l'erreur d'envoi — la release est créée,
      // le renvoi manuel est disponible depuis /admin/mailing.
    }
  }

  revalidatePath("/admin/releases");
  revalidatePath("/admin/calendrier");
  revalidatePath("/admin/tickets");
  revalidatePath("/admin/mailing");
  return { error: null };
}
