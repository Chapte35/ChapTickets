"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export type EnvoiState = { error: string | null; success: string | null };

/**
 * Envoie (ou renvoie) l'email de release à une liste de clients.
 * Appelée depuis /admin/mailing.
 */
export async function envoyerEmailRelease(
  _prevState: EnvoiState,
  formData: FormData
): Promise<EnvoiState> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Action réservée à l'admin.", success: null };

  const releaseId = formData.get("release_id");
  const clientIds = formData
    .getAll("client_ids")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  if (typeof releaseId !== "string" || !releaseId) {
    return { error: "Release manquante.", success: null };
  }
  if (clientIds.length === 0) {
    return { error: "Sélectionnez au moins un client.", success: null };
  }

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.functions.invoke("envoyer-email-release", {
    body: { releaseId, clientIds, declencheur: "admin" },
  });

  if (error) {
    return { error: `Erreur Edge Function : ${error.message}`, success: null };
  }

  const envoyes = (data as { envoyes?: number })?.envoyes ?? 0;
  const echecs = (data as { echecs?: number })?.echecs ?? 0;

  revalidatePath("/admin/mailing");

  if (echecs > 0 && envoyes === 0) {
    return { error: `Tous les envois ont échoué (${echecs}).`, success: null };
  }
  if (echecs > 0) {
    return {
      error: null,
      success: `${envoyes} email${envoyes > 1 ? "s" : ""} envoyé${envoyes > 1 ? "s" : ""}, ${echecs} échec${echecs > 1 ? "s" : ""}.`,
    };
  }

  return {
    error: null,
    success: `${envoyes} email${envoyes > 1 ? "s" : ""} envoyé${envoyes > 1 ? "s" : ""} avec succès.`,
  };
}
