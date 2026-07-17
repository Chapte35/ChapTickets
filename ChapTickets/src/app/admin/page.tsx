import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketList } from "@/components/ticket-list";
import { getAdminDashboardData } from "@/lib/queries/dashboard";
import { buildTicketStats, type TicketPourStats } from "@/lib/stats/ticket-stats";
import { KpiCard } from "@/components/charts/kpi-card";
import { TicketStatusDonut } from "@/components/charts/ticket-status-donut";
import { TicketsOverTimeChart } from "@/components/charts/tickets-over-time-chart";
import { PriorityBarChart } from "@/components/charts/priority-bar-chart";

export default async function AdminHomePage() {
  const supabase = await createClient();

  const [{ urgents, recents, projetsEnCours }, { data: tousLesTickets }] = await Promise.all([
    getAdminDashboardData(supabase),
    supabase.from("tickets").select("id, statut, priorite, created_at, updated_at"),
  ]);

  const stats = buildTicketStats((tousLesTickets ?? []) as unknown as TicketPourStats[], 14);

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs : 4 colonnes dès le petit écran (2x2), pleine largeur dès xl (1x4) */}
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

      {/* Charts : 3 côte à côte sur grand écran, l'activité prend le double de large (plus lisible pour une courbe) */}
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
            <CardTitle className="text-sm">Tickets créés — 14 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketsOverTimeChart data={stats.overTime} />
          </CardContent>
        </Card>
      </div>

      {/* Listes : 3 colonnes sur grand écran plutôt qu'empilées en pleine largeur */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Urgences</CardTitle>
            <CardDescription>Priorité urgente, pas encore résolus ni fermés.</CardDescription>
          </CardHeader>
          <CardContent>
            <TicketList tickets={urgents} basePath="/admin/tickets" showClient />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets récents</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketList tickets={recents} basePath="/admin/tickets" showClient />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projets en cours</CardTitle>
          </CardHeader>
          <CardContent>
            {projetsEnCours.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                Aucun projet en cours pour l&apos;instant.
              </p>
            )}
            {projetsEnCours.length > 0 && (
              <ul className="flex flex-col divide-y">
                {projetsEnCours.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/projets/${p.id}`}
                      className="flex items-center justify-between gap-4 py-2.5 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <span className="text-sm font-medium">{p.nom}</span>
                      <Badge variant="outline">
                        {p.ticketsCount} ticket{p.ticketsCount > 1 ? "s" : ""}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
