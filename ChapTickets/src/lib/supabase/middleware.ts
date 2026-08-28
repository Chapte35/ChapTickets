import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

export async function updateSession(request: NextRequest) {
  const t0 = Date.now();
  const { pathname } = request.nextUrl;
  console.log(`[middleware] → ${pathname}`);

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

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const t1 = Date.now();
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("getUser timeout")), 1200)
      ),
    ]);
    console.log(`[middleware] getUser() : ${Date.now() - t1}ms`);
    user = result.data.user;
  } catch (err) {
    console.log(`[middleware] getUser() FAILED après ${Date.now() - t0}ms :`, err);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!user) {
    console.log(`[middleware] no user, total : ${Date.now() - t0}ms`);
    if (!isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const role = (user.app_metadata as { role?: string } | null)?.role;
  console.log(`[middleware] user ok, role="${role}", total : ${Date.now() - t0}ms`);

  // Si le rôle est absent du JWT (hook pas encore actif ou token pas rafraîchi),
  // fallback sur un appel DB — évite la boucle de redirections.
  // Une fois le hook confirmé actif et les tokens rafraîchis, ce fallback
  // ne sera plus jamais atteint.
  if (!role) {
    console.log(`[middleware] role absent du JWT, fallback DB`);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const roleDb = profile?.role as string | undefined;
    console.log(`[middleware] role DB : "${roleDb}", total : ${Date.now() - t0}ms`);

    const home = roleDb === "admin" ? "/admin" : "/dashboard";

    if (isPublicPath || pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/admin") && roleDb !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/dashboard") && roleDb !== "client") {
      const url = request.nextUrl.clone();
      url.pathname = home;
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
