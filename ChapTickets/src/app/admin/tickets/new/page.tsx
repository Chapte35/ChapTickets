import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getTousLesProjets, getClientsParProjet } from "@/lib/queries/tickets";
import { CreateTicketAdminForm } from "./create-ticket-form";

export default async function NewTicketAdminPage() {
  const supabase = await createClient();
  const [projets, clientsParProjet] = await Promise.all([
    getTousLesProjets(supabase),
    getClientsParProjet(supabase),
  ]);

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Nouveau ticket</CardTitle>
      </CardHeader>
      <CardContent>
        {projets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun projet n&apos;existe encore. Un ticket doit être rattaché à
            un projet — crée d&apos;abord un projet (fonctionnalité à venir
            au Sprint 5, en attendant : directement en base).
          </p>
        ) : (
          <CreateTicketAdminForm
            projets={projets}
            clientsParProjet={clientsParProjet}
          />
        )}
      </CardContent>
    </Card>
  );
}
