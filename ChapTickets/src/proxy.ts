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
     * Exécuter sur toutes les routes sauf :
     * - Les assets statiques et images Next.js
     * - /logout : Server Action de déconnexion, aucune raison de passer
     *   dans le middleware (pas de protection de route à faire, Supabase
     *   signOut + redirect vers /login se gèrent dans l'action elle-même)
     */
    "/((?!_next/static|_next/image|favicon.ico|logout|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
