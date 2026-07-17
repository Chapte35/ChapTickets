import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProjetsDuClient } from "@/lib/queries/tickets";

export default async function MessagerieClientPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const projets = await getProjetsDuClient(supabase, user.id);
  const projetIds = projets.map((p) => p.id);

  const { data: messages } =
    projetIds.length > 0
      ? await supabase
          .from("messages_projet")
          .select("projet_id, contenu, created_at")
          .in("projet_id", projetIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const dernierMessageParProjet = new Map<string, { contenu: string; created_at: string }>();
  for (const m of messages ?? []) {
    if (!dernierMessageParProjet.has(m.projet_id)) {
      dernierMessageParProjet.set(m.projet_id, { contenu: m.contenu, created_at: m.created_at });
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-lg font-semibold">Messagerie</h1>

      {projets.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Tu n&apos;es rattaché à aucun projet pour l&apos;instant.
        </p>
      )}

      {projets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tes conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="flex flex-col divide-y">
              {projets.map((p) => {
                const dernier = dernierMessageParProjet.get(p.id);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/messagerie/${p.id}`}
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
