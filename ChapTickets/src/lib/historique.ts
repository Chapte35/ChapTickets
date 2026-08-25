import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Log une modification de champ dans ticket_historique.
 * Ne fait jamais échouer l'action parente — les erreurs sont loggées
 * en console seulement (même pattern que ticket_statut_historique).
 */
export async function logHistorique(
  supabase: SupabaseClient,
  {
    ticketId,
    champ,
    ancienneValeur,
    nouvelleValeur,
    changedBy,
  }: {
    ticketId: string;
    champ: string;
    ancienneValeur: string | null | undefined;
    nouvelleValeur: string | null | undefined;
    changedBy: string | null | undefined;
  }
): Promise<void> {
  // Pas de log si la valeur n'a pas changé
  if (ancienneValeur === nouvelleValeur) return;

  const { error } = await supabase.from("ticket_historique").insert({
    ticket_id: ticketId,
    champ,
    ancienne_valeur: ancienneValeur ?? null,
    nouvelle_valeur: nouvelleValeur ?? null,
    changed_by: changedBy ?? null,
  });

  if (error) {
    console.error(`[logHistorique] échec log champ "${champ}":`, error.message);
  }
}

/**
 * Crée une notification in-app pour un client.
 * Également sans effet sur l'action parente en cas d'échec.
 */
export async function creerNotification(
  supabase: SupabaseClient,
  {
    userId,
    ticketId,
    type = "ticket_assigne",
  }: {
    userId: string;
    ticketId: string;
    type?: string;
  }
): Promise<void> {
  // Évite les doublons : si une notif non lue existe déjà pour ce ticket
  // et ce user, on n'en crée pas une nouvelle.
  const { data: existante } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("ticket_id", ticketId)
    .eq("lu", false)
    .single();

  if (existante) return;

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    ticket_id: ticketId,
    type,
  });

  if (error) {
    console.error("[creerNotification] échec:", error.message);
  }
}
