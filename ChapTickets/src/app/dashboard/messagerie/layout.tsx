import { createClient } from "@/lib/supabase/server";
import { getProjetsDuClient } from "@/lib/queries/tickets";
import {
  ConversationSidebar,
  type ConversationGroup,
} from "@/components/conversation-sidebar";

export default async function MessagerieClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <>{children}</>;

  const [projets, { data: dernierDirect }, { data: messages }] = await Promise.all([
    getProjetsDuClient(supabase, user.id),
    supabase
      .from("messages")
      .select("contenu, created_at")
      .eq("client_id", user.id)
      .is("ticket_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("messages_projet")
      .select("projet_id, contenu, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const dernierMessageParProjet = new Map<string, { contenu: string; created_at: string }>();
  for (const m of messages ?? []) {
    if (!dernierMessageParProjet.has(m.projet_id)) {
      dernierMessageParProjet.set(m.projet_id, { contenu: m.contenu, created_at: m.created_at });
    }
  }

  const groups: ConversationGroup[] = [
    {
      label: "Général",
      emptyLabel: "",
      items: [
        {
          href: "/dashboard/messagerie/direct",
          title: "Discussion générale",
          preview: dernierDirect ? dernierDirect.contenu : "Aucun message pour l'instant",
        },
      ],
    },
    {
      label: "Tes conversations",
      emptyLabel: "Tu n'es rattaché à aucun projet pour l'instant.",
      items: projets.map((p) => ({
        href: `/dashboard/messagerie/${p.id}`,
        title: p.nom,
        preview: dernierMessageParProjet.get(p.id)?.contenu ?? "Aucun message pour l'instant",
      })),
    },
  ];

  // Même logique que src/app/admin/messagerie/layout.tsx (cf. son
  // commentaire pour le détail).
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3rem)] border rounded-lg overflow-hidden bg-card">
      <ConversationSidebar groups={groups} />
      <main className="flex-1 min-w-0 h-full">{children}</main>
    </div>
  );
}
