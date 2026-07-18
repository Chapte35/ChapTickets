import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  IDEE_STATUT_LABELS,
  ideeStatutBadgeVariant,
  type IdeeProjetStatut,
} from "@/lib/types";

export default async function IdeesPage() {
  const supabase = await createClient();
  const { data: idees, error } = await supabase
    .from("idees_projets")
    .select("id, titre, description, statut, projet_id, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {idees.map((idee) => {
            const statut = idee.statut as IdeeProjetStatut;
            return (
              <Link key={idee.id} href={`/admin/idees/${idee.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-2 pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium leading-snug">{idee.titre}</span>
                      <Badge variant={ideeStatutBadgeVariant(statut)} className="shrink-0">
                        {IDEE_STATUT_LABELS[statut]}
                      </Badge>
                    </div>
                    {idee.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {idee.description}
                      </p>
                    )}
                    {idee.projet_id && (
                      <Badge variant="outline" className="w-fit mt-1">
                        Devenue projet
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
