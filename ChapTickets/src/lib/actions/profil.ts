"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_COULEURS, type AvatarCouleur } from "@/components/avatar";

export type FormState = { error: string | null };

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
  const initialesBrutes = formData.get("initiales");

  const pseudo =
    typeof pseudoBrut === "string" && pseudoBrut.trim()
      ? pseudoBrut.trim().slice(0, 40)
      : null;

  let avatarCouleur: AvatarCouleur | null = null;
  if (typeof couleurBrute === "string" && couleurBrute) {
    if (!AVATAR_COULEURS.includes(couleurBrute as AvatarCouleur)) {
      return { error: "Couleur invalide." };
    }
    avatarCouleur = couleurBrute as AvatarCouleur;
  }

  const initiales =
    typeof initialesBrutes === "string" && initialesBrutes.trim()
      ? initialesBrutes.trim().toUpperCase().slice(0, 3)
      : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      pseudo,
      avatar_couleur: avatarCouleur,
      initiales,
    })
    .eq("id", user.id);

  if (error) {
    return { error: `Erreur de mise à jour : ${error.message}` };
  }

  revalidatePath("/admin/profil");
  revalidatePath("/dashboard/profil");
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
  return { error: null };
}
