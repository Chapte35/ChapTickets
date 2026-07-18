import { createClient } from "@/lib/supabase/server";
import { getProjetsDuClient } from "@/lib/queries/tickets";
import { getAllTags } from "@/lib/queries/tags";
import { CreateTicketClientForm } from "./create-ticket-client-form";

export default async function NewTicketClientPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [projets, tags, { data: profile }] = await Promise.all([
    getProjetsDuClient(supabase, user.id),
    getAllTags(supabase),
    supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Nouveau ticket</h1>

      {projets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tu n&apos;es rattaché à aucun projet pour l&apos;instant. Contacte
          l&apos;admin.
        </p>
      ) : (
        <CreateTicketClientForm
          projets={projets}
          tags={tags}
          clientNom={profile?.full_name || profile?.email || null}
        />
      )}
    </div>
  );
}
