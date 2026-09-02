import { createClient } from "@/lib/supabase/server";

/**
 * Badge sidebar côté CLIENT — compte les demandes de réouverture traitées
 * (acceptées ou refusées) non encore acknowledgées.
 */
export async function NotifDemandesClientBadge() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { count } = await supabase
    .from("demandes_reouverture")
    .select("id", { count: "exact", head: true })
    .eq("demande_par", user.id)
    .in("statut", ["acceptee", "refusee"])
    .is("acknowledged_at", null);

  if (!count || count === 0) return null;

  return (
    <span className="ml-auto flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * Badge sidebar côté ADMIN — compte les demandes de réouverture en attente
 * de traitement sur tous les projets (ou le projet sélectionné via cookie).
 */
export async function NotifDemandesAdminBadge() {
  const supabase = await createClient();

  const { count } = await supabase
    .from("demandes_reouverture")
    .select("id", { count: "exact", head: true })
    .eq("statut", "en_attente");

  if (!count || count === 0) return null;

  return (
    <span className="ml-auto flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}
