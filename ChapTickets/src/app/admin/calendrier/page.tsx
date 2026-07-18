import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { MonthCalendar, type CalendrierEvenement } from "@/components/calendar/month-calendar";
import { getTousLesProjets } from "@/lib/queries/tickets";
import { getTicketsSansReleaseParProjet } from "@/lib/queries/releases";
import { TICKET_STATUT_LABELS, type TicketStatut } from "@/lib/types";
import { ProjetFilter } from "@/components/calendar/projet-filter";
import { createRelease } from "./actions";
import { updateDateEcheance } from "../tickets/actions";

export default async function CalendrierAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; projet?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const maintenant = new Date();
  const year = params.year ? parseInt(params.year, 10) : maintenant.getFullYear();
  const month = params.month ? parseInt(params.month, 10) : maintenant.getMonth() + 1;
  const projetId = params.projet;

  // Fenêtre large (mois affiché + marge) pour couvrir les jours des mois
  // adjacents visibles dans la grille (semaines incomplètes en début/fin).
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

  // Fin de journée incluse : changed_at est un timestamptz, `fin` une date
  // seule — on borne au lendemain pour couvrir toute la dernière journée.
  const finExclusive = new Date(finMois);
  finExclusive.setDate(finExclusive.getDate() + 1);

  const historiqueQuery = supabase
    .from("ticket_statut_historique")
    .select("id, changed_at, ancien_statut, nouveau_statut, tickets(id, titre, projet_id)")
    .gte("changed_at", debut)
    .lt("changed_at", finExclusive.toISOString());

  // Tickets assignables au calendrier : pas encore résolus/fermés. Scopés
  // au projet filtré s'il y en a un, sinon tous — potentiellement long sans
  // filtre, mais le select reste utilisable (recherche au clavier native).
  let ticketsAssignablesQuery = supabase
    .from("tickets")
    .select("id, titre, projets(nom)")
    .not("statut", "in", "(resolu,ferme)")
    .order("titre");
  if (projetId) ticketsAssignablesQuery = ticketsAssignablesQuery.eq("projet_id", projetId);

  const [
    { data: tickets },
    { data: releases },
    projets,
    { data: ticketsAssignablesRows },
    { data: historique },
    ticketsSansReleaseParProjet,
  ] = await Promise.all([
    ticketsQuery,
    releasesQuery,
    getTousLesProjets(supabase),
    ticketsAssignablesQuery,
    historiqueQuery,
    getTicketsSansReleaseParProjet(supabase),
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
        href: `/admin/tickets/${ticket.id}`,
      };
    })
    .filter((e) => e !== null) as CalendrierEvenement[];

  const events: CalendrierEvenement[] = [
    ...(tickets ?? []).map((t) => ({
      date: t.date_prevue as string,
      type: "ticket" as const,
      id: t.id,
      label: t.titre,
      href: `/admin/tickets/${t.id}`,
    })),
    ...(releases ?? []).map((r) => ({
      date: r.date,
      type: "release" as const,
      id: r.id,
      label: r.nom,
      href: `/admin/projets/${r.projet_id}/overview`,
    })),
    ...evenementsStatut,
  ];

  const ticketsAssignables = (ticketsAssignablesRows ?? []).map((t) => ({
    id: t.id,
    titre: t.titre,
    projet_nom: (t.projets as unknown as { nom: string } | null)?.nom ?? "—",
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold">Calendrier</h1>
          <p className="text-sm text-muted-foreground">
            Survole une case et clique sur le <strong>+</strong> pour créer une release ou assigner un ticket.
          </p>
        </div>
        <ProjetFilter projets={projets} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <MonthCalendar
            year={year}
            month={month}
            events={events}
            basePath="/admin/calendrier"
            extraParams={projetId ? `&projet=${projetId}` : ""}
            interactif={{
              projets,
              projetFiltre: projetId,
              ticketsAssignables,
              ticketsSansReleaseParProjet,
              createReleaseAction: createRelease,
              assignDateAction: updateDateEcheance,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
