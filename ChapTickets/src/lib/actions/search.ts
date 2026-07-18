"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  tickets: { id: string; titre: string }[];
  projets: { id: string; nom: string }[];
};

export async function globalSearch(query: string): Promise<SearchResult> {
  if (!query.trim() || query.trim().length < 2) {
    return { tickets: [], projets: [] };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { tickets: [], projets: [] };

  const like = `%${query.trim()}%`;

  const [{ data: tickets }, { data: projets }] = await Promise.all([
    supabase.from("tickets").select("id, titre").ilike("titre", like).limit(6),
    supabase.from("projets").select("id, nom").ilike("nom", like).limit(6),
  ]);

  return {
    tickets: tickets ?? [],
    projets: projets ?? [],
  };
}
