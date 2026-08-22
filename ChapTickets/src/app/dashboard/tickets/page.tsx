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
    .from("tickets")
    .select("id, numero, ref_client, titre, description, statut, priorite, created_at, date_prevue, projets(nom, code_court)");

  query =
    tri === "echeance"
      ? query.order("date_prevue", { ascending: true, nullsFirst: false })
      : query.order("created_at", { ascending: tri === "ancien" });

  if (params.statut) query = query.eq("statut", params.statut);
  if (params.priorite) query = query.eq("priorite", params.priorite);
  if (params.projet) query = query.eq("projet_id", params.projet);

  const [{ data: tickets, error }, projets] = await Promise.all([
    query,
    getProjetsDuClient(supabase, user.id),
  ]);

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
          tickets={(tickets ?? []) as unknown as ClientTicketRow[]}
        />
      )}
    </div>
  );
}
