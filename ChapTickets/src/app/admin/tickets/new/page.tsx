import { createClient } from "@/lib/supabase/server";
import { getTousLesProjets, getClientsParProjet } from "@/lib/queries/tickets";
import { getAllTags } from "@/lib/queries/tags";
import { CreateTicketAdminForm } from "./create-ticket-form";

export default async function NewTicketAdminPage() {
  const supabase = await createClient();
  const [projets, clientsParProjet, tags] = await Promise.all([
    getTousLesProjets(supabase),
    getClientsParProjet(supabase),
    getAllTags(supabase),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Nouveau ticket</h1>

      {projets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun projet n&apos;existe encore. Un ticket doit être rattaché à
          un projet — crée d&apos;abord un projet.
        </p>
      ) : (
        <CreateTicketAdminForm
          projets={projets}
          clientsParProjet={clientsParProjet}
          tags={tags}
        />
      )}
    </div>
  );
}
