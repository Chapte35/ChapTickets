import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfilForm } from "@/components/profil-form";
import type { AvatarCouleur } from "@/components/avatar";

export default async function AdminProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, pseudo, avatar_couleur, initiales")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-lg font-semibold">Profil</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Identité & avatar</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfilForm
            nomAffiche={profile?.pseudo || profile?.full_name || profile?.email || "Admin"}
            pseudoActuel={profile?.pseudo ?? null}
            couleurActuelle={(profile?.avatar_couleur as AvatarCouleur | null) ?? null}
            initialesActuelles={(profile as unknown as { initiales: string | null })?.initiales ?? null}
            email={profile?.email ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
