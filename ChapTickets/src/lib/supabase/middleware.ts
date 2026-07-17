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
 * Une requête réseau vers `profiles` est faite ici pour connaître le rôle.
 * C'est un aller-retour DB de plus par requête protégée : acceptable pour le
 * MVP, mais si ça devient un point chaud, envisager de mettre le rôle dans
 * les custom claims du JWT (Supabase Auth Hooks) pour l'éviter.
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

  // Utilisateur connecté : on récupère son rôle pour router/protéger.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const home = profile?.role === "admin" ? "/admin" : "/dashboard";

  if (isPublicPath || pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && profile?.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/dashboard") && profile?.role !== "client") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
