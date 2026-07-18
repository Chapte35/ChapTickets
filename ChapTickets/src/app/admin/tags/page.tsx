import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TagChip } from "@/components/tag-badge";
import type { Tag } from "@/lib/types";
import { getTousLesProjets } from "@/lib/queries/tickets";
import { CreateTagForm } from "./create-tag-form";
import { DeleteTagButton } from "./delete-tag-button";

export default async function TagsPage() {
  const supabase = await createClient();
  const [{ data: tags }, projets] = await Promise.all([
    supabase.from("tags").select("id, nom, couleur, projet_id, projets(nom)").order("nom"),
    getTousLesProjets(supabase),
  ]);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Nouveau tag</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTagForm projets={projets} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags existants</CardTitle>
        </CardHeader>
        <CardContent>
          {(!tags || tags.length === 0) && (
            <p className="text-sm text-muted-foreground">Aucun tag pour l&apos;instant.</p>
          )}
          {tags && tags.length > 0 && (
            <ul className="flex flex-col gap-2">
              {(tags as unknown as (Tag & { projets: { nom: string } | null })[]).map((tag) => (
                <li key={tag.id} className="flex items-center gap-1.5">
                  <TagChip tag={tag} />
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    {tag.projet_id ? `Exclusif à ${tag.projets?.nom ?? "—"}` : "Générique"}
                  </Badge>
                  <DeleteTagButton tagId={tag.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
