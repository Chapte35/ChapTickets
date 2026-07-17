import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 : le fichier "middleware.ts" est déprécié au profit de "proxy.ts"
// (export nommé "proxy" au lieu de "middleware"). Logique inchangée.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Exécuter sur toutes les routes sauf les assets statiques et les images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
