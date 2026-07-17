import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase à utiliser côté serveur (Server Components, Server Actions,
 * Route Handlers). Gère la lecture/écriture des cookies de session Supabase.
 *
 * IMPORTANT : dans un Server Component (pas une Server Action / Route Handler),
 * `cookies().set()` échouera silencieusement (Next.js l'interdit hors mutation).
 * C'est prévu et géré par le try/catch ci-dessous : le rafraîchissement de
 * session se fera via le middleware (voir src/middleware.ts).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component : ignoré, le middleware
            // se charge du rafraîchissement de session.
          }
        },
      },
    }
  );
}
