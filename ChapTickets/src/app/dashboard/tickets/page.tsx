import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProjetsDuClient } from "@/lib/queries/tickets";
import { TicketFiltersBar } from "@/components/ticket-filters-bar";
import { ClientTicketsTable, type ClientTicketRow } from "./client-tickets-table";
import { Button } from "@/components/ui/button";
import { TICKET_TRIS, type TicketTri } from "@/lib/types";

export default async function ClientTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const tri: TicketTri = TICKET_TRIS.includes(params.tri as TicketTri)
    ? (params.tri as TicketTri)
    : "recent";

  let query = supabase
    .from("tickets_avec_rang")
    .select("id, rang_projet, ref_client, type_ticket, titre, description, statut, priorite, created_at, date_prevue, created_by, assigne_a, projets(nom, code_court)");

  // On trie par `numero` (clé technique croissante) et non `rang_projet`
  // (rang calculé dans la vue qui peut varier selon le filtre projet actif).
  // rang_projet sert à l'affichage, numero à l'ordre de création réel.
  query =
    tri === "echeance"
      ? query.order("date_prevue", { ascending: true, nullsFirst: false })
      : query.order("numero", { ascending: tri === "ancien" });

  if (params.statut) query = query.eq("statut", params.statut);
  if (params.priorite) query = query.eq("priorite", params.priorite);
  if (params.projet) query = query.eq("projet_id", params.projet);
  // Par défaut on masque les tickets fermés et résolus — param inclure_fermes=1 pour les voir
  if (!params.inclure_fermes) query = query.not("statut", "in", "(ferme,resolu)");

  const [{ data: tickets, error }, projets] = await Promise.all([
    query,
    getProjetsDuClient(supabase, user.id),
  ]);

  // Récupère les profils des créateurs et assignés en une seule query
  const ticketsList = tickets ?? [];
  const profilIds = [...new Set([
    ...ticketsList.map((t) => (t as unknown as { created_by: string | null }).created_by),
    ...ticketsList.map((t) => (t as unknown as { assigne_a: string | null }).assigne_a),
  ].filter((id): id is string => !!id))];

  const { data: profils } = profilIds.length > 0
    ? await supabase.from("profiles").select("id, pseudo, full_name, email, avatar_couleur, initiales").in("id", profilIds)
    : { data: [] };
  const profilsMap = new Map((profils ?? []).map((p) => [p.id, p]));

  const ticketsEnrichis = ticketsList.map((t) => {
    const raw = t as unknown as { created_by: string | null; assigne_a: string | null };
    const createur = raw.created_by ? profilsMap.get(raw.created_by) : null;
    const assigne = raw.assigne_a ? profilsMap.get(raw.assigne_a) : null;
    return {
      ...(t as unknown as object),
      createur_nom: createur?.pseudo || createur?.full_name || createur?.email || null,
      createur_couleur: (createur as unknown as { avatar_couleur: string | null } | null)?.avatar_couleur ?? null,
      createur_initiales: (createur as unknown as { initiales: string | null } | null)?.initiales ?? null,
      assigne_nom: assigne?.pseudo || assigne?.full_name || assigne?.email || null,
      assigne_couleur: (assigne as unknown as { avatar_couleur: string | null } | null)?.avatar_couleur ?? null,
      assigne_initiales: (assigne as unknown as { initiales: string | null } | null)?.initiales ?? null,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Mes tickets</h1>
        <Button asChild size="sm">
          <Link href="/dashboard/tickets/new">Nouveau ticket</Link>
        </Button>
      </div>

      <TicketFiltersBar projets={projets} />

      {error && (
        <p className="text-sm text-destructive">
          Erreur de chargement : {error.message}
        </p>
      )}
      {!error && (
        <ClientTicketsTable
          tickets={ticketsEnrichis as unknown as ClientTicketRow[]}
        />
      )}
    </div>
  );
}
