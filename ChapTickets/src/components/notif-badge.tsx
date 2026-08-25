import { createClient } from "@/lib/supabase/server";

/**
 * Compte les notifications non lues du client courant.
 * Rendu côté serveur — pas de polling, juste le count au chargement.
 * Le badge disparaît quand le client visite /dashboard/mes-tickets.
 */
export async function NotifBadge() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("lu", false);

  if (!count || count === 0) return null;

  return (
    <span className="ml-auto flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}
