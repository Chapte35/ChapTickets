import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MessagerieAdminPage() {
  const supabase = await createClient();

  const [{ data: projets }, { data: messages }] = await Promise.all([
    supabase.from("projets").select("id, nom").order("nom"),
    supabase
      .from("messages_projet")
      .select("projet_id, contenu, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const dernierMessageParProjet = new Map<string, { contenu: string; created_at: string }>();
  for (const m of messages ?? []) {
    if (!dernierMessageParProjet.has(m.projet_id)) {
      dernierMessageParProjet.set(m.projet_id, { contenu: m.contenu, created_at: m.created_at });
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-lg font-semibold">Messagerie</h1>

      {(!projets || projets.length === 0) && (
        <p className="text-sm text-muted-foreground">Aucun projet pour l&apos;instant.</p>
      )}

      {projets && projets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conversations par projet</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="flex flex-col divide-y">
              {projets.map((p) => {
                const dernier = dernierMessageParProjet.get(p.id);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/admin/messagerie/${p.id}`}
                      className="flex flex-col gap-0.5 px-4 py-3 hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-sm font-medium">{p.nom}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {dernier ? dernier.contenu : "Aucun message pour l'instant"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
