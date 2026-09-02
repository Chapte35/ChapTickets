import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TicketFiltersBar } from "@/components/ticket-filters-bar";
import { AdminTicketsTable, type AdminTicketRow } from "./admin-tickets-table";
import { Button } from "@/components/ui/button";
import { TICKET_TRIS, type TicketTri } from "@/lib/types";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Le projet est géré exclusivement par le cookie écrit par la sidebar.
  // Plus de ?projet= dans l'URL.
  const cookieStore = await cookies();
  const projetId = cookieStore.get("chaptickets_selected_projet_id")?.value ?? null;

  const tri: TicketTri = TICKET_TRIS.includes(params.tri as TicketTri)
    ? (params.tri as TicketTri)
    : "recent";

  let query = supabase
    .from("tickets_avec_rang")
    .select(
      "id, rang_projet, ref_client, type_ticket, titre, description, statut, priorite, created_at, date_prevue, ticket_origine_id, release_id, sprint_id, projets(nom, code_court), profiles:profiles!tickets_client_id_fkey(email, full_name), assigne_profile:profiles!tickets_assigne_a_fkey(full_name, email)"
    );

  query =
    tri === "echeance"
      ? query.order("date_prevue", { ascending: true, nullsFirst: false })
      : query.order("rang_projet", { ascending: tri === "ancien" });

  if (params.statut) query = query.eq("statut", params.statut);
  if (params.priorite) query = query.eq("priorite", params.priorite);
  if (projetId) query = query.eq("projet_id", projetId);
  if (params.client) query = query.eq("client_id", params.client);
  if (!params.inclure_fermes) query = query.not("statut", "in", "(ferme,resolu)");

  const [{ data: tickets, error }, { data: clients }] = await Promise.all([
    query,
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "client")
      .order("full_name"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tickets</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/tickets/import">Importer</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/tickets/new">Nouveau ticket</Link>
          </Button>
        </div>
      </div>

      <TicketFiltersBar clients={clients ?? []} />

      {error && (
        <p className="text-sm text-destructive">
          Erreur de chargement : {error.message}
        </p>
      )}
      {!error && (
        <AdminTicketsTable tickets={(tickets ?? []) as unknown as AdminTicketRow[]} profils={clients ?? []} />
      )}
    </div>
  );
}
