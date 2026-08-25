import { createClient } from "@/lib/supabase/server";
import { getProjetsDuClient } from "@/lib/queries/tickets";
import { ClientReleasesView } from "./client-releases-view";
import type { TicketStatut, TicketPriorite, TicketType } from "@/lib/types";

export type ReleaseAvecTickets = {
  id: string;
  projet_id: string;
  nom: string;
  date: string;
  description: string | null;
  tickets: TicketDeLaRelease[];
};

export type TicketDeLaRelease = {
  id: string;
  rang_projet: number;
  titre: string;
  description: string | null;
  statut: TicketStatut;
  priorite: TicketPriorite;
  type_ticket: TicketType | null;
  projets: { code_court: string | null } | null;
};

export type ProjetAvecReleases = {
  id: string;
  nom: string;
  releases: ReleaseAvecTickets[];
};

export default async function DashboardReleasesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const projets = await getProjetsDuClient(supabase, user.id);

  if (projets.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">Releases</h1>
        <p className="text-sm text-muted-foreground">
          Aucun projet rattaché à votre compte pour l&apos;instant.
        </p>
      </div>
    );
  }

  const projetIds = projets.map((p) => p.id);

  // Releases de tous les projets du client, triées par date ASC
  // (les plus proches en premier)
  const { data: releasesData } = await supabase
    .from("releases")
    .select("id, projet_id, nom, date, description")
    .in("projet_id", projetIds)
    .order("date", { ascending: true });

  const releaseIds = (releasesData ?? []).map((r) => r.id);

  // Tickets des releases — chargés en une seule query
  const { data: ticketsData } = releaseIds.length > 0
    ? await supabase
        .from("tickets_avec_rang")
        .select("id, rang_projet, titre, description, statut, priorite, type_ticket, release_id, projets(code_court)")
        .in("release_id", releaseIds)
        .order("rang_projet", { ascending: true })
    : { data: [] };

  // Regrouper tickets par release_id
  const ticketsParRelease = new Map<string, TicketDeLaRelease[]>();
  for (const t of ticketsData ?? []) {
    const releaseId = (t as unknown as { release_id: string }).release_id;
    const liste = ticketsParRelease.get(releaseId) ?? [];
    liste.push(t as unknown as TicketDeLaRelease);
    ticketsParRelease.set(releaseId, liste);
  }

  // Regrouper releases par projet
  const projetsAvecReleases: ProjetAvecReleases[] = projets
    .map((p) => ({
      id: p.id,
      nom: p.nom,
      releases: (releasesData ?? [])
        .filter((r) => r.projet_id === p.id)
        .map((r) => ({
          ...r,
          tickets: ticketsParRelease.get(r.id) ?? [],
        })),
    }))
    .filter((p) => p.releases.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold">Releases</h1>
      {projetsAvecReleases.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune release n&apos;a encore été créée sur vos projets.
        </p>
      ) : (
        <ClientReleasesView projets={projetsAvecReleases} />
      )}
    </div>
  );
}
