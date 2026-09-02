import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { AppSidebar, type SidebarItem } from "@/components/app-sidebar";
import { getProjetsDuClient } from "@/lib/queries/tickets";
import { NotifBadge } from "@/components/notif-badge";
import { ProjetRefreshListener } from "@/components/projet-refresh-listener";
import { NotifDemandesClientBadge } from "@/components/notif-demandes-badge";

  const navItems: SidebarItem[] = [
    { href: "/dashboard", label: "Mon espace", icon: "home" },
    { href: "/dashboard/tickets", label: "Tickets", icon: "tickets" },
    { href: "/dashboard/mes-tickets", label: "Mes tickets", icon: "mes_tickets", badge: <NotifBadge /> },
    { href: "/dashboard/demandes-reouverture", label: "Réouvertures", icon: "reouvertures", badge: <NotifDemandesClientBadge /> },
    { href: "/dashboard/releases", label: "Releases", icon: "releases" },
    { href: "/dashboard/calendrier", label: "Calendrier", icon: "calendrier" },
    { href: "/dashboard/messagerie", label: "Messagerie", icon: "messagerie" },
    { href: "/dashboard/profil", label: "Profil", icon: "profil" },
  ];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "client") redirect("/admin");

  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar_collapsed")?.value === "1";
  const projetInitial = cookieStore.get("chaptickets_selected_projet_id")?.value ?? null;

  const projets = await getProjetsDuClient(supabase, user.id);

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="Mon espace"
        items={navItems}
        defaultCollapsed={defaultCollapsed}
        logoutAction={logout}
        basePath="/dashboard"
        projets={projets}
        projetInitial={projetInitial}
      />
      <ProjetRefreshListener />
      <main className="flex-1 h-dvh overflow-y-auto overflow-x-auto p-6">{children}</main>
    </div>
  );
}
