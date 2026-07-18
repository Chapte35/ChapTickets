import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tag } from "@/lib/types";

export async function getAllTags(supabase: SupabaseClient): Promise<Tag[]> {
  const { data, error } = await supabase.from("tags").select("id, nom, couleur, projet_id").order("nom");
  if (error || !data) return [];
  return data as unknown as Tag[];
}
