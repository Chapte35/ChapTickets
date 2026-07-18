import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationThread } from "@/components/conversation-thread";
import { type MessageRow } from "@/components/message-thread";
import { postMessageProjetAdmin } from "../actions";

export default async function MessagerieProjetAdminPage({
  params,
}: {
  params: Promise<{ projetId: string }>;
}) {
  const { projetId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: projet, error }, { data: messages }] = await Promise.all([
    supabase.from("projets").select("id, nom").eq("id", projetId).single(),
    supabase
      .from("messages_projet")
      .select("id, contenu, created_at, auteur_id, profiles(role, full_name, email)")
      .eq("projet_id", projetId)
      .order("created_at", { ascending: true }),
  ]);

  if (error || !projet) notFound();
  if (!user) return null;

  return (
    <ConversationThread
      title={projet.nom}
      context={{ field: "projet_id", value: projet.id }}
      messages={(messages ?? []) as unknown as MessageRow[]}
      currentUserId={user.id}
      action={postMessageProjetAdmin}
    />
  );
}
