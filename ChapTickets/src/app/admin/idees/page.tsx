import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IDEE_STATUT_LABELS,
  ideeStatutBadgeVariant,
  type IdeeProjetStatut,
} from "@/lib/types";

export default async function IdeesPage() {
  const supabase = await createClient();
  const { data: idees, error } = await supabase
    .from("idees_projets")
    .select("id, titre, statut, projet_id, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Idées de projets</h1>
          <p className="text-sm text-muted-foreground">
            Backlog privé — jamais visible côté client.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/idees/new">Nouvelle idée</Link>
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Erreur de chargement : {error.message}
        </p>
      )}

      {!error && (!idees || idees.length === 0) && (
        <p className="text-sm text-muted-foreground py-6">
          Aucune idée pour l&apos;instant.
        </p>
      )}

      {idees && idees.length > 0 && (
        <ul className="flex flex-col divide-y">
          {idees.map((idee) => {
            const statut = idee.statut as IdeeProjetStatut;
            return (
              <li key={idee.id}>
                <Link
                  href={`/admin/idees/${idee.id}`}
                  className="flex items-center justify-between gap-4 py-3 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors"
                >
                  <span className="font-medium truncate">{idee.titre}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {idee.projet_id && (
                      <Badge variant="outline">Devenue projet</Badge>
                    )}
                    <Badge variant={ideeStatutBadgeVariant(statut)}>
                      {IDEE_STATUT_LABELS[statut]}
                    </Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
