import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la clé service_role : bypass RLS complet.
 *
 * ⚠️ Ne JAMAIS importer ce fichier depuis un Client Component ou un fichier
 * accessible au bundle client. Réservé aux Server Actions / Route Handlers
 * qui font des opérations d'admin (ex: inviter un client via Auth).
 *
 * On ne réutilise pas createServerClient (@supabase/ssr) ici : ce client n'a
 * pas besoin de session utilisateur (il EST déjà l'admin via la clé), donc
 * pas de gestion de cookies.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
