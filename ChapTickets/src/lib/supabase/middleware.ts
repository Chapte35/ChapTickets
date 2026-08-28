import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

/**
 * Rafraîchit la session Supabase (cookies) ET protège les routes par rôle.
 *
 * Le rôle est lu depuis profiles via un appel DB (60-120ms en moyenne).
 * Le Auth Hook JWT (migration 0032) n'est pas utilisé ici car getUser()
 * de @supabase/ssr ne retourne pas les claims enrichis par le hook.
 *
 * Un timeout de 1200ms protège contre les cold starts Supabase ponctuels :
 * si la DB ne répond pas, on redirige vers /login plutôt que de décrocher
 * un 504 Vercel.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // getUser() + profiles en parallèle avec timeout global 1200ms
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  let role: string | undefined;

  try {
    await Promise.race([
      (async () => {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!u) return;
        user = u;
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", u.id)
          .single();
        role = profile?.role as string | undefined;
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("middleware timeout")), 1200)
      ),
    ]);
  } catch {
    // Timeout : redirect login plutôt que 504
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user) {
    if (!isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

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
