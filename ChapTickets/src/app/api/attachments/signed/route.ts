import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/attachments/signed?path=<storage_path>
 *
 * Génère une URL signée pour un fichier du bucket ticket-attachments.
 * Utilisé par l'éditeur Tiptap pour rafraîchir les URLs d'images expirées
 * et par le MarkdownRenderer côté client si besoin.
 *
 * Sécurité : Supabase vérifie les policies RLS côté storage —
 * seuls les utilisateurs autorisés peuvent obtenir une URL signée.
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path requis" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data, error } = await supabase.storage
    .from("ticket-attachments")
    .createSignedUrl(path, 3600);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Erreur" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
