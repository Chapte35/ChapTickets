import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TicketFiltersBar } from "@/components/ticket-filters-bar";
import { ClientTicketsTable, type ClientTicketRow } from "@/app/dashboard/tickets/client-tickets-table";
import { TICKET_TRIS, type TicketTri } from "@/lib/types";

export default async function MesTicketsPage({
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

  // Marquer toutes les notifs non lues comme lues
  await supabase
    .from("notifications")
    .update({ lu: true })
    .eq("user_id", user.id)
    .eq("lu", false);

  const cookieStore = await cookies();
  const projetId = cookieStore.get("chaptickets_selected_projet_id")?.value ?? null;

  const tri: TicketTri = TICKET_TRIS.includes(params.tri as TicketTri)
    ? (params.tri as TicketTri)
    : "recent";

  let query = supabase
    .from("tickets_avec_rang")
    .select("id, rang_projet, ref_client, type_ticket, titre, description, statut, priorite, created_at, date_prevue, created_by, assigne_a, projets(nom, code_court)")
    .eq("assigne_a", user.id);

  query =
    tri === "echeance"
      ? query.order("date_prevue", { ascending: true, nullsFirst: false })
      : query.order("rang_projet", { ascending: tri === "ancien" });

  if (params.statut) {
    query = query.eq("statut", params.statut);
  } else {
    query = query.eq("statut", "en_attente_client");
  }
  if (params.priorite) query = query.eq("priorite", params.priorite);
  if (projetId) query = query.eq("projet_id", projetId);

  const { data: tickets, error } = await query;

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
        <div>
          <h1 className="text-lg font-semibold">Mes tickets</h1>
          <p className="text-sm text-muted-foreground">
            Tickets qui vous ont été assignés et qui attendent votre action.
          </p>
        </div>
      </div>

      <TicketFiltersBar />

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
