import { createClient } from "@/lib/supabase/server";
import { getTousLesProjets } from "@/lib/queries/tickets";
import { TicketFiltersBar } from "@/components/ticket-filters-bar";
import { ReleasesBoard } from "./releases-board";
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

  const projets = await getTousLesProjets(supabase);

  const tri: TicketTri = TICKET_TRIS.includes(params.tri as TicketTri)
    ? (params.tri as TicketTri)
    : "recent";

  // Tickets sans release — mêmes filtres que /admin/tickets
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

      {/* key force le remontage du board quand les searchParams changent,
          ce qui réinitialise le state local (tickets droppés, liste gauche).
          Sans ça, le router.push recharge la page mais React garde le board
          monté et le useState(ticketsInitiaux) ne se réexécute pas. */}
      <ReleasesBoard
        key={JSON.stringify(params)}
        tickets={(tickets ?? []) as unknown as TicketSansRelease[]}
        projets={projets}
        projetIdActuel={params.projet ?? null}
      />
    </div>
  );
}
