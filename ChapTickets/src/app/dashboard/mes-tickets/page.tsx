import { createClient } from "@/lib/supabase/server";
import { getProjetsDuClient } from "@/lib/queries/tickets";
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

  // Marquer toutes les notifs non lues comme lues — le badge disparaîtra
  // au prochain rendu du layout (revalidatePath déclenche un re-render du RSC).
  await supabase
    .from("notifications")
    .update({ lu: true })
    .eq("user_id", user.id)
    .eq("lu", false);

  const tri: TicketTri = TICKET_TRIS.includes(params.tri as TicketTri)
    ? (params.tri as TicketTri)
    : "recent";

  // Uniquement les tickets qui me sont explicitement assignés (assigne_a = moi)
  // — c'est l'indicateur que l'admin attend une action de ma part.
  let query = supabase
    .from("tickets_avec_rang")
    .select("id, rang_projet, ref_client, titre, description, statut, priorite, created_at, date_prevue, projets(nom, code_court)")
    .eq("assigne_a", user.id);

  query =
    tri === "echeance"
      ? query.order("date_prevue", { ascending: true, nullsFirst: false })
      : query.order("rang_projet", { ascending: tri === "ancien" });

  if (params.statut) {
    query = query.eq("statut", params.statut);
  } else {
    // Par défaut : uniquement en_attente_client — tickets qui attendent une action du client
    query = query.eq("statut", "en_attente_client");
  }
  if (params.priorite) query = query.eq("priorite", params.priorite);
  if (params.projet) query = query.eq("projet_id", params.projet);

  const [{ data: tickets, error }, projets] = await Promise.all([
    query,
    getProjetsDuClient(supabase, user.id),
  ]);

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

      <TicketFiltersBar projets={projets} />

      {error && (
        <p className="text-sm text-destructive">
          Erreur de chargement : {error.message}
        </p>
      )}
      {!error && tickets?.length === 0 && (
        <p className="text-sm text-muted-foreground py-6">
          Aucun ticket ne vous est assigné pour l&apos;instant.
        </p>
      )}
      {!error && tickets && tickets.length > 0 && (
        <ClientTicketsTable
          tickets={tickets as unknown as ClientTicketRow[]}
        />
      )}
    </div>
  );
}
