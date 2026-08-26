import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTousLesProjets } from "@/lib/queries/tickets";
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

  const tri: TicketTri = TICKET_TRIS.includes(params.tri as TicketTri)
    ? (params.tri as TicketTri)
    : "recent";

  let query = supabase
    .from("tickets_avec_rang")
    .select(
      "id, rang_projet, ref_client, type_ticket, titre, description, statut, priorite, created_at, date_prevue, projets(nom, code_court), profiles:profiles!tickets_client_id_fkey(email, full_name), assigne_profile:profiles!tickets_assigne_a_fkey(full_name, email)"
    );

  // "écheance" → date_prevue, nullsFirst:false pour mettre les sans-date à la fin.
  // "recent"/"ancien" → rang_projet DESC/ASC : les tickets les plus récents du
  // projet (numéro le plus élevé) en premier pour "recent", ordre naturel pour "ancien".
  query =
    tri === "echeance"
      ? query.order("date_prevue", { ascending: true, nullsFirst: false })
      : query.order("rang_projet", { ascending: tri === "ancien" });

  if (params.statut) query = query.eq("statut", params.statut);
  if (params.priorite) query = query.eq("priorite", params.priorite);
  if (params.projet) query = query.eq("projet_id", params.projet);
  if (params.client) query = query.eq("client_id", params.client);
  // Par défaut on masque les tickets fermés et résolus — param inclure_fermes=1 pour les voir
  if (!params.inclure_fermes) query = query.not("statut", "in", "(ferme,resolu)");

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
        <AdminTicketsTable tickets={(tickets ?? []) as unknown as AdminTicketRow[]} profils={clients ?? []} />
      )}
    </div>
  );
}
