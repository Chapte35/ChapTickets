import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConversationThread } from "@/components/conversation-thread";
import { type MessageRow } from "@/components/message-thread";
import { postMessageDirectAdmin } from "../../actions";

export default async function MessagerieDirecteAdminPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: client, error }, { data: messages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", clientId)
      .eq("role", "client")
      .single(),
    supabase
      .from("messages")
      .select("id, contenu, created_at, auteur_id, profiles!messages_auteur_id_fkey(role, full_name, email)")
      .eq("client_id", clientId)
      .is("ticket_id", null)
      .order("created_at", { ascending: true }),
  ]);

  if (error || !client) notFound();
  if (!user) return null;

  return (
    <ConversationThread
      title={client.full_name || client.email || "—"}
      context={{ field: "client_id", value: client.id }}
      messages={(messages ?? []) as unknown as MessageRow[]}
      currentUserId={user.id}
      action={postMessageDirectAdmin}
    />
  );
}
