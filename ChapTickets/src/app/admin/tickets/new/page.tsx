import { createClient } from "@/lib/supabase/server";
import { getTousLesProjets, getClientsParProjet } from "@/lib/queries/tickets";
import { getAllTags } from "@/lib/queries/tags";
import { CreateTicketAdminForm } from "./create-ticket-form";
import type { ClientOption } from "@/lib/queries/tickets";

export default async function NewTicketAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [projets, clientsParProjet, tags, profilAdmin] = await Promise.all([
    getTousLesProjets(supabase),
    getClientsParProjet(supabase),
    getAllTags(supabase),
    user
      ? supabase.from("profiles").select("id, email, full_name, pseudo").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  // Injecter l'admin dans la liste des clients de chaque projet,
  // en première position, pour qu'il puisse créer des tickets en son nom.
  const adminProfil = profilAdmin.data;
  if (adminProfil) {
    const adminOption: ClientOption = {
      id: adminProfil.id,
      email: adminProfil.email,
      full_name: adminProfil.pseudo
        ? `${adminProfil.pseudo} (moi)`
        : `${adminProfil.full_name ?? adminProfil.email} (moi)`,
    };
    for (const projetId of Object.keys(clientsParProjet)) {
      // Évite le doublon si l'admin était déjà dans client_projets
      const dejaPresent = clientsParProjet[projetId].some((c) => c.id === adminOption.id);
      if (!dejaPresent) {
        clientsParProjet[projetId] = [adminOption, ...clientsParProjet[projetId]];
      }
    }
  }

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
