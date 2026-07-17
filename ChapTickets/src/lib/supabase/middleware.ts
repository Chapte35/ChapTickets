import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraîchit la session Supabase (cookies) sur chaque requête.
 * Appelé depuis src/middleware.ts.
 *
 * Sprint 1 y ajoutera la logique de redirection (routes protégées admin/client).
 * Pour l'instant : uniquement le rafraîchissement de session, rien n'est bloqué.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Ne pas retirer : nécessaire pour que le token soit rafraîchi avant expiration.
  await supabase.auth.getUser();

  return supabaseResponse;
}
