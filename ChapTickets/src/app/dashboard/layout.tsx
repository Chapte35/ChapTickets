import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { AppSidebar, type SidebarItem } from "@/components/app-sidebar";

const NAV_ITEMS: SidebarItem[] = [
  { href: "/dashboard", label: "Mon espace", icon: "home" },
  { href: "/dashboard/tickets", label: "Tickets", icon: "tickets" },
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

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        title="Mon espace"
        items={NAV_ITEMS}
        defaultCollapsed={defaultCollapsed}
        logoutAction={logout}
        basePath="/dashboard"
      />
      <main className="flex-1 p-6 overflow-x-auto">{children}</main>
    </div>
  );
}
