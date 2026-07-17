import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Un projet auquel un client est rattaché (relation client_projets).
 * Utilisé pour peupler les selects "projet" côté client (création de
 * ticket) et côté admin (formulaire de création + filtres).
 */
export type ProjetOption = { id: string; nom: string };

export type ClientOption = {
  id: string;
  email: string | null;
  full_name: string | null;
};

/** Projets auxquels un client donné est rattaché (pour son formulaire de création de ticket). */
export async function getProjetsDuClient(
  supabase: SupabaseClient,
  clientId: string
): Promise<ProjetOption[]> {
  const { data, error } = await supabase
    .from("client_projets")
    .select("projets(id, nom)")
    .eq("client_id", clientId);

  if (error || !data) return [];

  // Supabase renvoie la relation imbriquée sous "projets" (nom de la table).
  return data
    .map((row) => row.projets as unknown as ProjetOption | null)
    .filter((p): p is ProjetOption => p !== null);
}

/** Tous les projets (admin uniquement — RLS l'autorise, pas de filtre nécessaire). */
export async function getTousLesProjets(
  supabase: SupabaseClient
): Promise<ProjetOption[]> {
  const { data, error } = await supabase
    .from("projets")
    .select("id, nom")
    .order("nom");

  if (error || !data) return [];
  return data;
}

/** Clients rattachés à un projet donné (pour le select "client" dépendant du projet, côté admin). */
export async function getClientsDuProjet(
  supabase: SupabaseClient,
  projetId: string
): Promise<ClientOption[]> {
  const { data, error } = await supabase
    .from("client_projets")
    .select("profiles(id, email, full_name)")
    .eq("projet_id", projetId);

  if (error || !data) return [];

  return data
    .map((row) => row.profiles as unknown as ClientOption | null)
    .filter((c): c is ClientOption => c !== null);
}

/** Mapping projet_id -> liste de clients, pour tout précharger en une requête (formulaire admin cascadant). */
export async function getClientsParProjet(
  supabase: SupabaseClient
): Promise<Record<string, ClientOption[]>> {
  const { data, error } = await supabase
    .from("client_projets")
    .select("projet_id, profiles(id, email, full_name)");

  if (error || !data) return {};

  const map: Record<string, ClientOption[]> = {};
  for (const row of data) {
    const client = row.profiles as unknown as ClientOption | null;
    if (!client) continue;
    if (!map[row.projet_id]) map[row.projet_id] = [];
    map[row.projet_id].push(client);
  }
  return map;
}
