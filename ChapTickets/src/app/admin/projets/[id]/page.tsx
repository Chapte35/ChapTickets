import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProjetStatut } from "@/lib/types";
import type { ClientOption } from "@/lib/queries/tickets";
import { ProjetEditForm } from "./projet-edit-form";
import { ProjetStatutForm } from "./projet-statut-form";
import { ClientsRattachesPanel } from "./clients-rattaches-panel";
import { DeleteProjetButton } from "./delete-projet-button";

export default async function ProjetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: projet, error }, { data: rattaches }, { data: tousLesClients }] =
    await Promise.all([
      supabase.from("projets").select("id, nom, description, statut").eq("id", id).single(),
      supabase
        .from("client_projets")
        .select("profiles(id, email, full_name)")
        .eq("projet_id", id),
      supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("role", "client")
        .order("full_name"),
    ]);

  if (error || !projet) notFound();

  const clientsRattaches = (rattaches ?? [])
    .map((r) => r.profiles as unknown as ClientOption | null)
    .filter((c): c is ClientOption => c !== null);

  const idsRattaches = new Set(clientsRattaches.map((c) => c.id));
  const clientsDisponibles = (tousLesClients ?? []).filter(
    (c) => !idsRattaches.has(c.id)
  );

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Modifier le projet</CardTitle>
          <DeleteProjetButton projetId={projet.id} />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ProjetEditForm
            projetId={projet.id}
            nom={projet.nom}
            description={projet.description}
          />
          <div className="border-t pt-4">
            <ProjetStatutForm
              projetId={projet.id}
              currentStatut={projet.statut as ProjetStatut}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clients rattachés</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientsRattachesPanel
            projetId={projet.id}
            clientsRattaches={clientsRattaches}
            clientsDisponibles={clientsDisponibles}
          />
        </CardContent>
      </Card>
    </div>
  );
}
