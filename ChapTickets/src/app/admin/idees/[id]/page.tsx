import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { IdeeProjetStatut } from "@/lib/types";
import { IdeeEditForm } from "./idee-edit-form";
import { TransformerEnProjetForm } from "./transformer-en-projet-form";
import { DeleteIdeeButton } from "./delete-idee-button";

export default async function IdeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: idee, error } = await supabase
    .from("idees_projets")
    .select("id, titre, description, statut, projet_id, projets(nom)")
    .eq("id", id)
    .single();

  if (error || !idee) notFound();

  const projetLie = idee.projets as unknown as { nom: string } | null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Modifier l&apos;idée</CardTitle>
          </CardHeader>
          <CardContent>
            <IdeeEditForm
              ideeId={idee.id}
              titre={idee.titre}
              description={idee.description}
              statut={idee.statut as IdeeProjetStatut}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Projet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {projetLie ? (
              <div className="flex flex-col gap-1.5">
                <Badge variant="outline" className="w-fit">Devenue projet</Badge>
                <span className="text-sm text-muted-foreground">{projetLie.nom}</span>
              </div>
            ) : (
              <TransformerEnProjetForm ideeId={idee.id} titreInitial={idee.titre} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Danger zone</CardTitle>
          </CardHeader>
          <CardContent>
            <DeleteIdeeButton ideeId={idee.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
