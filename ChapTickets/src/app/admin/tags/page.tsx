import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TagChip } from "@/components/tag-badge";
import type { Tag } from "@/lib/types";
import { CreateTagForm } from "./create-tag-form";
import { DeleteTagButton } from "./delete-tag-button";

export default async function TagsPage() {
  const supabase = await createClient();
  const { data: tags } = await supabase
    .from("tags")
    .select("id, nom, couleur")
    .order("nom");

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Nouveau tag</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTagForm />
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
            <ul className="flex flex-wrap gap-2">
              {(tags as unknown as Tag[]).map((tag) => (
                <li key={tag.id} className="flex items-center gap-1.5">
                  <TagChip tag={tag} />
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
