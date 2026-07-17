"use server";

import { createClient } from "@/lib/supabase/server";

export async function marquerTicketLu(ticketId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // upsert : la première visite crée la ligne, les suivantes la mettent à
  // jour. La policy RLS (user_id = auth.uid()) garantit qu'on ne peut
  // jamais marquer "lu" à la place de quelqu'un d'autre.
  await supabase.from("lectures_tickets").upsert(
    {
      ticket_id: ticketId,
      user_id: user.id,
      vu_jusqu_a: new Date().toISOString(),
    },
    { onConflict: "ticket_id,user_id" }
  );
}
