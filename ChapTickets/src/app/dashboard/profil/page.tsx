import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfilForm } from "@/components/profil-form";
import type { TagColor } from "@/lib/types";

export default async function ClientProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // le layout redirige déjà, filet de sécurité

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, pseudo, avatar_couleur, avatar_emoji")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-lg font-semibold">Profil</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pseudo & avatar</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfilForm
            nomAffiche={profile?.full_name || profile?.email || "Mon compte"}
            pseudoActuel={profile?.pseudo ?? null}
            couleurActuelle={(profile?.avatar_couleur as TagColor | null) ?? null}
            emojiActuel={profile?.avatar_emoji ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
