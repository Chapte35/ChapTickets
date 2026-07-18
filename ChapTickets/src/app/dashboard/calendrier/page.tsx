import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { MonthCalendar, type CalendrierEvenement } from "@/components/calendar/month-calendar";
import { getProjetsDuClient } from "@/lib/queries/tickets";
import { ProjetFilter } from "@/components/calendar/projet-filter";
import { TICKET_STATUT_LABELS, type TicketStatut } from "@/lib/types";

export default async function CalendrierClientPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; projet?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const projets = await getProjetsDuClient(supabase, user.id);

  const maintenant = new Date();
  const year = params.year ? parseInt(params.year, 10) : maintenant.getFullYear();
  const month = params.month ? parseInt(params.month, 10) : maintenant.getMonth() + 1;
  const projetId = params.projet;

  const debut = `${year}-${String(month).padStart(2, "0")}-01`;
  const finMois = new Date(year, month, 0);
  const fin = finMois.toISOString().slice(0, 10);

  let ticketsQuery = supabase
    .from("tickets")
    .select("id, titre, date_prevue")
    .not("date_prevue", "is", null)
    .gte("date_prevue", debut)
    .lte("date_prevue", fin);
  if (projetId) ticketsQuery = ticketsQuery.eq("projet_id", projetId);

  let releasesQuery = supabase
    .from("releases")
    .select("id, nom, date, projet_id")
    .gte("date", debut)
    .lte("date", fin);
  if (projetId) releasesQuery = releasesQuery.eq("projet_id", projetId);

  const finExclusive = new Date(finMois);
  finExclusive.setDate(finExclusive.getDate() + 1);

  const historiqueQuery = supabase
    .from("ticket_statut_historique")
    .select("id, changed_at, ancien_statut, nouveau_statut, tickets(id, titre, projet_id)")
    .gte("changed_at", debut)
    .lt("changed_at", finExclusive.toISOString());

  const [{ data: tickets }, { data: releases }, { data: historique }] = await Promise.all([
    ticketsQuery,
    releasesQuery,
    historiqueQuery,
  ]);

  const evenementsStatut = (historique ?? [])
    .map((h) => {
      const ticket = h.tickets as unknown as { id: string; titre: string; projet_id: string } | null;
      if (!ticket) return null;
      if (projetId && ticket.projet_id !== projetId) return null;
      const ancien = h.ancien_statut
        ? TICKET_STATUT_LABELS[h.ancien_statut as TicketStatut]
        : "—";
      const nouveau = TICKET_STATUT_LABELS[h.nouveau_statut as TicketStatut];
      return {
        date: (h.changed_at as string).slice(0, 10),
        type: "statut" as const,
        id: h.id as string,
        label: `${ticket.titre} : ${ancien} → ${nouveau}`,
        href: `/dashboard/tickets/${ticket.id}`,
      };
    })
    .filter((e) => e !== null) as CalendrierEvenement[];

  const events: CalendrierEvenement[] = [
    ...(tickets ?? []).map((t) => ({
      date: t.date_prevue as string,
      type: "ticket" as const,
      id: t.id,
      label: t.titre,
      href: `/dashboard/tickets/${t.id}`,
    })),
    ...(releases ?? []).map((r) => ({
      date: r.date,
      type: "release" as const,
      id: r.id,
      label: r.nom,
      href: `/dashboard/projets/${r.projet_id}`,
    })),
    ...evenementsStatut,
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold">Calendrier</h1>
        {projets.length > 1 && <ProjetFilter projets={projets} />}
      </div>

      <Card>
        <CardContent className="pt-6">
          <MonthCalendar
            year={year}
            month={month}
            events={events}
            basePath="/dashboard/calendrier"
            extraParams={projetId ? `&projet=${projetId}` : ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
