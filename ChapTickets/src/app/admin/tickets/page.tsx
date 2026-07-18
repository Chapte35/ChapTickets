import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTousLesProjets } from "@/lib/queries/tickets";
import { TicketFiltersBar } from "@/components/ticket-filters-bar";
import { AdminTicketsTable, type AdminTicketRow } from "./admin-tickets-table";
import { Button } from "@/components/ui/button";

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("tickets")
    .select(
      "id, titre, description, statut, priorite, created_at, projets(nom), profiles:profiles!tickets_client_id_fkey(email, full_name)"
    )
    .order("created_at", { ascending: false });

  if (params.statut) query = query.eq("statut", params.statut);
  if (params.priorite) query = query.eq("priorite", params.priorite);
  if (params.projet) query = query.eq("projet_id", params.projet);
  if (params.client) query = query.eq("client_id", params.client);

  const [{ data: tickets, error }, projets, { data: clients }] =
    await Promise.all([
      query,
      getTousLesProjets(supabase),
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

      <TicketFiltersBar projets={projets} clients={clients ?? []} />

      {error && (
        <p className="text-sm text-destructive">
          Erreur de chargement : {error.message}
        </p>
      )}
      {!error && (
        <AdminTicketsTable tickets={(tickets ?? []) as unknown as AdminTicketRow[]} />
      )}
    </div>
  );
}
