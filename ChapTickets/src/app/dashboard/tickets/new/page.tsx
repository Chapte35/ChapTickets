import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getProjetsDuClient } from "@/lib/queries/tickets";
import { CreateTicketClientForm } from "./create-ticket-client-form";

export default async function NewTicketClientPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const projets = await getProjetsDuClient(supabase, user.id);

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Nouveau ticket</CardTitle>
      </CardHeader>
      <CardContent>
        {projets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tu n&apos;es rattaché à aucun projet pour l&apos;instant.
            Contacte l&apos;admin.
          </p>
        ) : (
          <CreateTicketClientForm projets={projets} />
        )}
      </CardContent>
    </Card>
  );
}
