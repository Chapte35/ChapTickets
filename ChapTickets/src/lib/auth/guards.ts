import { createClient } from "@/lib/supabase/server";

/**
 * Toute Server Action doit revérifier le rôle elle-même, même si la page
 * qui l'appelle est déjà protégée par un layout + le proxy. Une Server
 * Action est un endpoint réseau indépendant (appelable en théorie sans
 * passer par la page) : elle doit se défendre toute seule.
 *
 * Centralisé ici après l'avoir dupliqué dans admin/tickets/actions.ts et
 * dashboard/tickets/actions.ts — dès qu'un 3e endroit en avait besoin
 * (admin/idees), la duplication n'était plus défendable.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, isAdmin: false as const, userId: undefined };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, isAdmin: profile?.role === "admin", userId: user.id };
}

export async function requireClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, isClient: false as const, userId: undefined };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, isClient: profile?.role === "client", userId: user.id };
}
