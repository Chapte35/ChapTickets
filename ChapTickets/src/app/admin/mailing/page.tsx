import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getTousLesProjets, getClientsParProjet } from "@/lib/queries/tickets";
import type { ClientOption } from "@/lib/queries/tickets";
import { MailingBoard } from "./mailing-board";
import type { ReleaseAvecStatutNotif } from "./mailing-board";

export default async function MailingPage() {
  const cookieStore = await cookies();
  const projetId = cookieStore.get("chaptickets_selected_projet_id")?.value ?? null;

  const supabase = await createClient();

  const [projets, clientsParProjet] = await Promise.all([
    getTousLesProjets(supabase),
    getClientsParProjet(supabase),
  ]);

  let releasesQuery = supabase
    .from("releases")
    .select("id, projet_id, nom, date, description, projets(nom, code_court)")
    .order("date", { ascending: false });

  if (projetId) {
    releasesQuery = releasesQuery.eq("projet_id", projetId);
  }

  const { data: releasesRaw } = await releasesQuery;
  const releases = releasesRaw ?? [];

  const releaseIds = releases.map((r) => r.id);
  const { data: notifRaw } = releaseIds.length > 0
    ? await supabase
        .from("release_notifications")
        .select("release_id, client_id, envoyee_le, declencheur")
        .in("release_id", releaseIds)
    : { data: [] };

  const notifParRelease: Record<
    string,
    Record<string, { envoyee_le: string; declencheur: string }>
  > = {};
  for (const n of notifRaw ?? []) {
    if (!notifParRelease[n.release_id]) notifParRelease[n.release_id] = {};
    notifParRelease[n.release_id][n.client_id] = {
      envoyee_le: n.envoyee_le,
      declencheur: n.declencheur,
    };
  }

  const releasesAvecStatut: ReleaseAvecStatutNotif[] = releases.map((r) => {
    const projet = r.projets as unknown as { nom: string; code_court: string | null } | null;
    const clientsDuProjet: ClientOption[] = clientsParProjet[r.projet_id] ?? [];
    const notifsRelease = notifParRelease[r.id] ?? {};

    const clientsNotifies = clientsDuProjet.filter((c) => !!notifsRelease[c.id]);
    const clientsNonNotifies = clientsDuProjet.filter((c) => !notifsRelease[c.id]);

    let statut: "notifie" | "partiel" | "non_notifie" | "sans_clients";
    if (clientsDuProjet.length === 0) {
      statut = "sans_clients";
    } else if (clientsNotifies.length === 0) {
      statut = "non_notifie";
    } else if (clientsNonNotifies.length > 0) {
      statut = "partiel";
    } else {
      statut = "notifie";
    }

    return {
      id: r.id,
      projet_id: r.projet_id,
      nom: r.nom,
      date: r.date,
      description: r.description ?? null,
      projet_nom: projet?.nom ?? "—",
      projet_code_court: projet?.code_court ?? null,
      statut_notif: statut,
      clients_du_projet: clientsDuProjet,
      notifs: notifsRelease,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Mailing releases</h1>
          <p className="text-sm text-muted-foreground">
            Envoyez ou renvoyez les emails de release à vos clients.
          </p>
        </div>
      </div>

      <MailingBoard
        releases={releasesAvecStatut}
        projets={projets}
        projetIdActuel={projetId}
      />
    </div>
  );
}
