import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { AppSidebar, type SidebarItem } from "@/components/app-sidebar";

const NAV_ITEMS: SidebarItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/tickets", label: "Tickets", icon: "tickets" },
  { href: "/admin/idees", label: "Idées", icon: "idees" },
  { href: "/admin/clients", label: "Clients", icon: "clients" },
];

/**
 * Le proxy (src/proxy.ts) bloque déjà l'accès à /admin pour les non-admins,
 * mais on revérifie ici : le proxy peut évoluer (ex: matcher mal configuré
 * plus tard) et une page Server Component ne doit jamais faire confiance
 * uniquement à une couche réseau en amont pour des données sensibles.
 */
export default async function AdminLayout({
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

  if (profile?.role !== "admin") redirect("/dashboard");

  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get("sidebar_collapsed")?.value === "1";

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="Admin"
        items={NAV_ITEMS}
        defaultCollapsed={defaultCollapsed}
        logoutAction={logout}
      />
      <main className="flex-1 p-6 overflow-x-auto">{children}</main>
    </div>
  );
}
