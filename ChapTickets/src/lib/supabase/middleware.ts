import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

/**
 * Rafraîchit la session Supabase (cookies) ET protège les routes par rôle.
 * Appelé depuis src/proxy.ts (exclu du matcher : /logout, assets statiques).
 *
 * Règles :
 * - Pas connecté + route protégée -> /login
 * - Connecté + /login -> redirigé vers son espace (admin/client)
 * - Connecté + route du mauvais rôle (ex: client sur /admin) -> son espace
 * - "/" -> redirigé vers son espace
 *
 * Le rôle est lu depuis user.app_metadata.role, injecté dans le JWT par
 * le Auth Hook custom_access_token_hook (migration 0032). Aucun appel DB
 * supplémentaire.
 *
 * Un timeout de 1200ms est appliqué sur getUser() : si Supabase ne répond
 * pas, on laisse passer la requête plutôt que de déclencher un 504 Vercel
 * (le layout + la RLS prendront le relais pour protéger les données).
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

  // getUser() avec timeout : Vercel Edge Runtime limite à ~1.5s.
  // Si Supabase est lent (cold start, réseau), on laisse passer plutôt
  // que de bloquer — la RLS protège de toute façon côté DB.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("getUser timeout")), 1200)
      ),
    ]);
    user = result.data.user;
  } catch {
    // Timeout ou erreur réseau : on laisse passer, pas de 504
    return supabaseResponse;
  }

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
