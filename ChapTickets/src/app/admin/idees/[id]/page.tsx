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
    <div className="flex flex-col gap-4 max-w-lg">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Modifier l&apos;idée</CardTitle>
          <DeleteIdeeButton ideeId={idee.id} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {projetLie && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">Devenue projet</Badge>
              <span className="text-sm text-muted-foreground">{projetLie.nom}</span>
            </div>
          )}

          <IdeeEditForm
            ideeId={idee.id}
            titre={idee.titre}
            description={idee.description}
            statut={idee.statut as IdeeProjetStatut}
          />

          {!idee.projet_id && (
            <div className="border-t pt-4">
              <TransformerEnProjetForm ideeId={idee.id} titreInitial={idee.titre} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
