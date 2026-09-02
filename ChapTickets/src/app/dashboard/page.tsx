import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/charts/kpi-card";
import { TicketStatusDonut } from "@/components/charts/ticket-status-donut";
import { TicketsOverTimeChart } from "@/components/charts/tickets-over-time-chart";
import { PriorityBarChart } from "@/components/charts/priority-bar-chart";
import { TicketKanbanReadonly } from "@/components/ticket-kanban-readonly";
import { ClientReleasesView } from "./releases/client-releases-view";
import { TicketList } from "@/components/ticket-list";
import { getProjetOverviewData } from "@/lib/queries/overview";
import { getClientDashboardData } from "@/lib/queries/dashboard";
import { getProjetsDuClient } from "@/lib/queries/tickets";
import { TICKET_STATUT_LABELS, PROJET_STATUT_LABELS, type ProjetStatut, type TicketStatut } from "@/lib/types";
import { notFound } from "next/navigation";

export default async function ClientDashboardPage() {
  const cookieStore = await cookies();
  const projetId = cookieStore.get("chaptickets_selected_projet_id")?.value ?? undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const projets = await getProjetsDuClient(supabase, user.id);

  // ── CAS 1 : projet sélectionné via sidebar ──────────────────────────────
  if (projetId) {
    const result = await getProjetOverviewData(supabase, projetId);
    if (!result.ok) {
      if (result.notFound) notFound();
      return (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur de chargement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{result.erreur}</p>
          </CardContent>
        </Card>
      );
    }

    const { projet, stats, kanbanItems, releasesAvecProgression } = result;

    const releaseIds = releasesAvecProgression.map((r) => r.id);
    const { data: ticketsParRelease } = releaseIds.length > 0
      ? await supabase
          .from("tickets_avec_rang")
          .select("id, rang_projet, titre, description, statut, priorite, type_ticket, release_id, projets(code_court)")
          .in("release_id", releaseIds)
          .order("rang_projet", { ascending: true })
      : { data: [] };

    const ticketsMap = new Map<string, unknown[]>();
    for (const t of (ticketsParRelease ?? []) as unknown[]) {
      const rid = (t as { release_id: string }).release_id;
      if (!ticketsMap.has(rid)) ticketsMap.set(rid, []);
      ticketsMap.get(rid)!.push(t);
    }

    const releasesForView = [{
      id: projet.id,
      nom: projet.nom,
      releases: releasesAvecProgression.map((r) => ({
        id: r.id,
        projet_id: projet.id,
        nom: r.nom,
        date: r.date,
        description: r.description ?? null,
        tickets: (ticketsMap.get(r.id) ?? []) as unknown as import("./releases/page").TicketDeLaRelease[],
      })),
    }];

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{projet.nom}</h1>
            <p className="text-sm text-muted-foreground">
              {PROJET_STATUT_LABELS[projet.statut as ProjetStatut]}
            </p>
          </div>
          <Link
            href={`/dashboard/messagerie/${projet.id}`}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Discuter du projet →
          </Link>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Tickets ouverts" valeur={stats.ouvertsNonResolus} />
          <KpiCard
            label="Urgents non résolus"
            valeur={stats.urgentsNonResolus}
            accent={stats.urgentsNonResolus > 0}
          />
          <KpiCard label="Résolus (7 jours)" valeur={stats.resolusCetteSemaine} />
          <KpiCard
            label="Résolution moyenne"
            valeur={
              stats.dureeMoyenneResolutionJours !== null
                ? `${stats.dureeMoyenneResolutionJours.toFixed(1)} j`
                : "—"
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Répartition par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketStatusDonut repartition={stats.ticketsParStatut} />
            </CardContent>
          </Card>
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Répartition par priorité</CardTitle>
            </CardHeader>
            <CardContent>
              <PriorityBarChart repartition={stats.ticketsParPriorite} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Activité — 14 derniers jours</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketsOverTimeChart data={stats.overTime} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketKanbanReadonly tickets={kanbanItems} basePath="/dashboard/tickets" />
          </CardContent>
        </Card>

        <div>
          <ClientReleasesView projets={releasesForView} />
        </div>
      </div>
    );
  }

  // ── CAS 2 : 2+ projets, aucun sélectionné → vue d'ensemble multi-projets ─
  if (projets.length > 1) {
    const { data: tousLesTickets } = await supabase
      .from("tickets")
      .select("id, statut, priorite, projet_id");

    const ticketsParProjet = new Map<string, { ouverts: number; urgents: number }>();
    for (const t of tousLesTickets ?? []) {
      const existing = ticketsParProjet.get(t.projet_id) ?? { ouverts: 0, urgents: 0 };
      const estOuvert = ["ouvert", "en_cours", "en_attente_client"].includes(t.statut as TicketStatut);
      if (estOuvert) existing.ouverts += 1;
      if (estOuvert && t.priorite === "urgente") existing.urgents += 1;
      ticketsParProjet.set(t.projet_id, existing);
    }

    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">Mes projets</h1>
          <p className="text-sm text-muted-foreground">
            Sélectionne un projet dans la sidebar ou clique sur une carte pour voir son détail.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projets.map((p) => {
            const kpis = ticketsParProjet.get(p.id) ?? { ouverts: 0, urgents: 0 };
            return (
              <Link
                key={p.id}
                href={`/dashboard/projets/${p.id}`}
                className="flex flex-col gap-3 rounded-lg border bg-card p-4 hover:shadow-sm hover:border-foreground/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.nom}</span>
                  <span className="text-muted-foreground text-xs">→</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {kpis.ouverts} ouvert{kpis.ouverts !== 1 ? "s" : ""}
                  </Badge>
                  {kpis.urgents > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {kpis.urgents} urgent{kpis.urgents !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // ── CAS 3 : 1 projet ou 0 → vue générique ────────────────────────────────
  const projetUnique = projets[0] ?? null;
  const { recents, nonLus } = await getClientDashboardData(
    supabase,
    user.id,
    projetUnique?.id
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Messages non lus</CardTitle>
        </CardHeader>
        <CardContent>
          {nonLus.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">Rien de nouveau.</p>
          )}
          {nonLus.length > 0 && (
            <ul className="flex flex-col divide-y">
              {nonLus.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/dashboard/tickets/${t.id}`}
                    className="flex items-center justify-between gap-4 py-2.5 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{t.titre}</span>
                      <span className="text-xs text-muted-foreground">
                        {TICKET_STATUT_LABELS[t.statut]}
                      </span>
                    </div>
                    <Badge>
                      {t.nonLus} nouveau{t.nonLus > 1 ? "x" : ""}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mes tickets récents</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketList tickets={recents} basePath="/dashboard/tickets" />
        </CardContent>
      </Card>
    </div>
  );
}
