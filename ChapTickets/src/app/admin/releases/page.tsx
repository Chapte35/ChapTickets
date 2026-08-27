import { createClient } from "@/lib/supabase/server";
import { getTousLesProjets, getClientsParProjet } from "@/lib/queries/tickets";
import { TicketFiltersBar } from "@/components/ticket-filters-bar";
import { ReleasesBoardClient } from "./releases-board-client";
import { TICKET_TRIS, type TicketTri, type TicketStatut, type TicketPriorite } from "@/lib/types";

export type TicketSansRelease = {
  id: string;
  rang_projet: number;
  titre: string;
  description: string | null;
  statut: TicketStatut;
  priorite: TicketPriorite;
  created_at: string;
  projets: { nom: string; code_court: string | null } | null;
};

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [projets, clientsParProjet] = await Promise.all([
    getTousLesProjets(supabase),
    getClientsParProjet(supabase),
  ]);

  const tri: TicketTri = TICKET_TRIS.includes(params.tri as TicketTri)
    ? (params.tri as TicketTri)
    : "recent";

  let query = supabase
    .from("tickets_avec_rang")
    .select(
      "id, rang_projet, titre, description, statut, priorite, created_at, projets(nom, code_court)"
    )
    .is("release_id", null);

  query =
    tri === "echeance"
      ? query.order("date_prevue", { ascending: true, nullsFirst: false })
      : query.order("rang_projet", { ascending: tri === "ancien" });

  if (params.statut) query = query.eq("statut", params.statut);
  if (params.priorite) query = query.eq("priorite", params.priorite);
  if (params.projet) query = query.eq("projet_id", params.projet);
  if (!params.inclure_fermes) query = query.not("statut", "in", "(ferme,resolu)");

  const { data: tickets } = await query;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Releases</h1>
      </div>

      <TicketFiltersBar projets={projets} />

      <ReleasesBoardClient
        key={JSON.stringify(params)}
        tickets={(tickets ?? []) as unknown as TicketSansRelease[]}
        projets={projets}
        projetIdActuel={params.projet ?? null}
        clientsParProjet={clientsParProjet}
      />
    </div>
  );
}
