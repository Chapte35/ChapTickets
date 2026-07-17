"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateClientState = { error: string | null; success: boolean };

/**
 * Invite un nouveau client par email (Supabase Auth admin API, nécessite la
 * clé service_role -> createAdminClient, jamais le client "normal").
 *
 * Double vérification du rôle admin ici : le layout protège déjà la page,
 * mais une Server Action est un point d'entrée réseau à part entière
 * (appelable indépendamment du rendu de la page), donc elle doit se
 * protéger elle-même plutôt que faire confiance au layout qui l'entoure.
 */
export async function createClientAccount(
  _prevState: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié.", success: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: "Action réservée à l'admin.", success: false };
  }

  const email = formData.get("email");
  const fullName = formData.get("full_name");

  if (typeof email !== "string" || !email) {
    return { error: "Email requis.", success: false };
  }

  const admin = createAdminClient();
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email);

  if (inviteError) {
    return { error: inviteError.message, success: false };
  }

  // Le trigger `on_auth_user_created` a déjà créé la ligne profiles
  // (role='client', email). On complète juste le nom si fourni.
  if (typeof fullName === "string" && fullName.trim() && invited.user) {
    await admin
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", invited.user.id);
  }

  revalidatePath("/admin/clients");
  return { error: null, success: true };
}
