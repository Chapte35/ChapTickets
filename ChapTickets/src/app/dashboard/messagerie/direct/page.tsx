import { createClient } from "@/lib/supabase/server";
import { ConversationThread } from "@/components/conversation-thread";
import { type MessageRow } from "@/components/message-thread";
import { postMessageDirectClient } from "../actions";

export default async function MessagerieDirecteClientPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: messages } = await supabase
    .from("messages")
    .select("id, contenu, created_at, auteur_id, profiles(role, full_name, email)")
    .eq("client_id", user.id)
    .is("ticket_id", null)
    .order("created_at", { ascending: true });

  return (
    <ConversationThread
      title="Discussion générale"
      context={{ field: "client_id", value: user.id }}
      messages={(messages ?? []) as unknown as MessageRow[]}
      currentUserId={user.id}
      action={postMessageDirectClient}
    />
  );
}
