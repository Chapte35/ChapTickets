import type { SupabaseClient } from "@supabase/supabase-js";

export type ClientAvecConversationDirecte = {
  id: string;
  email: string | null;
  full_name: string | null;
  dernierMessage: { contenu: string; created_at: string } | null;
};

/**
 * Tous les clients + leur dernier message de conversation directe
 * (messages.client_id renseigné, ticket_id null — cf. migration 0010).
 * Chaque client a exactement un fil direct avec l'admin, qu'il ait déjà
 * écrit ou non (d'où le left join applicatif : on part de `profiles`,
 * pas de `messages`, pour ne perdre aucun client sans historique).
 */
export async function getClientsAvecConversationDirecte(
  supabase: SupabaseClient
): Promise<ClientAvecConversationDirecte[]> {
  const [{ data: clients }, { data: messages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "client")
      .order("full_name"),
    supabase
      .from("messages")
      .select("client_id, contenu, created_at")
      .is("ticket_id", null)
      .order("created_at", { ascending: false }),
  ]);

  const dernierParClient = new Map<string, { contenu: string; created_at: string }>();
  for (const m of messages ?? []) {
    if (m.client_id && !dernierParClient.has(m.client_id)) {
      dernierParClient.set(m.client_id, { contenu: m.contenu, created_at: m.created_at });
    }
  }

  return (clients ?? []).map((c) => ({
    ...c,
    dernierMessage: dernierParClient.get(c.id) ?? null,
  }));
}
