"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TAG_COLORS, AVATAR_EMOJIS, type TagColor } from "@/lib/types";

export type FormState = { error: string | null };

/**
 * Pas de requireAdmin/requireClient ici : n'importe quel utilisateur
 * connecté peut modifier SON PROPRE pseudo/avatar, peu importe son rôle.
 * La vraie protection est ailleurs — le GRANT Postgres posé en migration
 * 0011 ne laisse de toute façon écrire que ces 3 colonnes, et seulement
 * sur sa propre ligne (RLS `id = auth.uid()`). Même une valeur `role`
 * glissée dans une requête forgée à la main serait ignorée par Postgres,
 * pas juste bloquée côté applicatif.
 */
export async function updateProfilPerso(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const pseudoBrut = formData.get("pseudo");
  const couleurBrute = formData.get("avatar_couleur");
  const emojiBrut = formData.get("avatar_emoji");

  const pseudo =
    typeof pseudoBrut === "string" && pseudoBrut.trim() ? pseudoBrut.trim().slice(0, 40) : null;

  let avatarCouleur: TagColor | null = null;
  if (typeof couleurBrute === "string" && couleurBrute) {
    if (!TAG_COLORS.includes(couleurBrute as TagColor)) {
      return { error: "Couleur invalide." };
    }
    avatarCouleur = couleurBrute as TagColor;
  }

  let avatarEmoji: string | null = null;
  if (typeof emojiBrut === "string" && emojiBrut) {
    if (!AVATAR_EMOJIS.includes(emojiBrut as (typeof AVATAR_EMOJIS)[number])) {
      return { error: "Emoji invalide." };
    }
    avatarEmoji = emojiBrut;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ pseudo, avatar_couleur: avatarCouleur, avatar_emoji: avatarEmoji })
    .eq("id", user.id);

  if (error) {
    return { error: `Erreur de mise à jour : ${error.message}` };
  }

  // Les deux espaces sont revalidés : un admin comme un client peuvent
  // arriver sur cette action selon où ils sont connectés, et le pseudo
  // apparaît potentiellement dans la sidebar des deux layouts.
  revalidatePath("/admin/profil");
  revalidatePath("/dashboard/profil");
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
  return { error: null };
}
