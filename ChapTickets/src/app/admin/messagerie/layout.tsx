import { createClient } from "@/lib/supabase/server";
import { getClientsAvecConversationDirecte } from "@/lib/queries/messages-directs";
import {
  ConversationSidebar,
  type ConversationGroup,
} from "@/components/conversation-sidebar";

export default async function MessagerieAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const [{ data: projets }, { data: messages }, clientsDirects] = await Promise.all([
    supabase.from("projets").select("id, nom").order("nom"),
    supabase
      .from("messages_projet")
      .select("projet_id, contenu, created_at")
      .order("created_at", { ascending: false }),
    getClientsAvecConversationDirecte(supabase),
  ]);

  const dernierMessageParProjet = new Map<string, { contenu: string; created_at: string }>();
  for (const m of messages ?? []) {
    if (!dernierMessageParProjet.has(m.projet_id)) {
      dernierMessageParProjet.set(m.projet_id, { contenu: m.contenu, created_at: m.created_at });
    }
  }

  const groups: ConversationGroup[] = [
    {
      label: "Conversations directes",
      emptyLabel: "Aucun client pour l'instant.",
      items: clientsDirects.map((c) => ({
        href: `/admin/messagerie/direct/${c.id}`,
        title: c.full_name || c.email || "—",
        preview: c.dernierMessage?.contenu ?? "Aucun message pour l'instant",
      })),
    },
    {
      label: "Conversations par projet",
      emptyLabel: "Aucun projet pour l'instant.",
      items: (projets ?? []).map((p) => ({
        href: `/admin/messagerie/${p.id}`,
        title: p.nom,
        preview: dernierMessageParProjet.get(p.id)?.contenu ?? "Aucun message pour l'instant",
      })),
    },
  ];

  return (
    // Le container tient toute la hauteur restante du viewport (moins le
    // padding du <main> parent, cf. src/app/admin/layout.tsx : p-6 = 1.5rem
    // en haut + 1.5rem en bas). Pas de marge négative pour "manger" ce
    // padding : plus simple à garantir correct, quitte à avoir une marge
    // confortable autour plutôt qu'un vrai bord-à-bord — cf. message
    // précédent si un jour tu veux le vrai bord-à-bord (ça demande de sortir
    // le padding du layout partagé, un chantier à part entière).
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3rem)] border rounded-lg overflow-hidden bg-card">
      <ConversationSidebar groups={groups} />
      <main className="flex-1 min-w-0 h-full">{children}</main>
    </div>
  );
}
