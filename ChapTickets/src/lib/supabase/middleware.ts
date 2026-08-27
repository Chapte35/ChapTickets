import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

/**
 * Rafraîchit la session Supabase (cookies) ET protège les routes par rôle.
 * Appelé depuis src/proxy.ts.
 *
 * Règles :
 * - Pas connecté + route protégée -> /login
 * - Connecté + /login -> redirigé vers son espace (admin/client)
 * - Connecté + route du mauvais rôle (ex: client sur /admin) -> son espace
 * - "/" -> redirigé vers son espace
 *
 * Le rôle est lu depuis user.app_metadata.role, injecté dans le JWT par
 * le Auth Hook custom_access_token_hook (migration 0032). Aucun appel DB
 * supplémentaire — corrige le 504 MIDDLEWARE_INVOCATION_TIMEOUT Vercel.
 *
 * Sécurité : le middleware ne fait que router/rediriger. La vraie protection
 * des données vient de la RLS Postgres — même si quelqu'un bypass le
 * middleware, la base refusera la requête.
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

  // Nécessaire pour rafraîchir le token avant expiration.
  // Le rôle est disponible dans user.app_metadata grâce au Auth Hook —
  // pas besoin d'un second appel à profiles.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!user) {
    if (!isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Rôle lu depuis le JWT (app_metadata injecté par custom_access_token_hook)
  // — zéro roundtrip DB supplémentaire.
  const role = (user.app_metadata as { role?: string } | null)?.role;
  const home = role === "admin" ? "/admin" : "/dashboard";

  if (isPublicPath || pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/dashboard") && role !== "client") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
