import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/actions";

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="font-semibold">
            Admin
          </Link>
          <Link href="/admin/clients" className="text-muted-foreground hover:text-foreground">
            Clients
          </Link>
        </nav>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Se déconnecter
          </Button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
