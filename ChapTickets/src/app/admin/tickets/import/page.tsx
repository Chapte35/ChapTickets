import { createClient } from "@/lib/supabase/server";
import { getTousLesProjets, getClientsParProjet } from "@/lib/queries/tickets";
import { getAllTags } from "@/lib/queries/tags";
import { PrepromptGenerator } from "./preprompt-generator";
import { ImportWizard } from "./import-wizard";

export default async function ImportTicketsPage() {
  const supabase = await createClient();
  const [projets, clientsParProjet, tags] = await Promise.all([
    getTousLesProjets(supabase),
    getClientsParProjet(supabase),
    getAllTags(supabase),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Importer des tickets</h1>
      <PrepromptGenerator projets={projets} clientsParProjet={clientsParProjet} tags={tags} />
      <ImportWizard />
    </div>
  );
}
