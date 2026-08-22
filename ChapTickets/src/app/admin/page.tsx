import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { FolderKanban } from "lucide-react";
import { TicketsDataTable } from "@/components/tickets-data-table";
import { getAdminDashboardData } from "@/lib/queries/dashboard";
import { buildTicketStats, type TicketPourStats } from "@/lib/stats/ticket-stats";
import { getResolutionParProjet } from "@/lib/queries/stats-resolution";
import { KpiCard } from "@/components/charts/kpi-card";
import { TicketStatusDonut } from "@/components/charts/ticket-status-donut";
import { TicketsOverTimeChart } from "@/components/charts/tickets-over-time-chart";
import { PriorityBarChart } from "@/components/charts/priority-bar-chart";
import { ChartResolutionProjets } from "@/components/dashboard/chart-resolution-projets";
import { DashboardProjetSync } from "@/components/dashboard-projet-sync";
import { getTousLesProjets } from "@/lib/queries/tickets";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const projetId = params.projet ?? undefined;

  const supabase = await createClient();

  const [
    { urgents, recents, projetsEnCours },
    { data: tousLesTickets },
    resolutionParProjet,
    { data: tousLesProjets },
    projets,
  ] = await Promise.all([
    getAdminDashboardData(supabase, projetId),
    projetId
      ? supabase
          .from("tickets")
          .select("id, statut, priorite, created_at, updated_at")
          .eq("projet_id", projetId)
      : supabase
          .from("tickets")
          .select("id, statut, priorite, created_at, updated_at"),
    getResolutionParProjet(supabase, "semaine", projetId),
    supabase.from("projets").select("id, nom").order("nom"),
    getTousLesProjets(supabase),
  ]);

  const stats = buildTicketStats((tousLesTickets ?? []) as unknown as TicketPourStats[], 14);

  const projetActif = projetId
    ? projets.find((p) => p.id === projetId) ?? null
    : null;

  return (
    <div className="flex flex-col gap-4">
      <DashboardProjetSync projets={projets} />

      {projetActif && (
        <p className="text-xs text-muted-foreground">
          Filtré sur le projet <span className="font-medium text-foreground">{projetActif.nom}</span>
        </p>
      )}

      {/* KPIs */}
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

      {/* Charts */}
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
        <Card className="lg:col-span-2 xl:col-span-4">
          <CardHeader>
            <CardTitle className="text-sm">Résolution par projet</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartResolutionProjets
              donneesInitiales={resolutionParProjet}
              projets={(tousLesProjets ?? []) as { id: string; nom: string }[]}
              periodeInitiale="semaine"
            />
          </CardContent>
        </Card>
      </div>

      {/* Table tickets + projets en cours */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <Tabs defaultValue="urgences">
            <CardHeader>
              <TabsList>
                <TabsTrigger value="urgences">Urgences ({urgents.length})</TabsTrigger>
                <TabsTrigger value="recents">Récents ({recents.length})</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="urgences">
                <TicketsDataTable tickets={urgents} />
              </TabsContent>
              <TabsContent value="recents">
                <TicketsDataTable tickets={recents} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projets en cours</CardTitle>
          </CardHeader>
          <CardContent>
            {projetsEnCours.length === 0 && (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderKanban />
                  </EmptyMedia>
                  <EmptyTitle>Aucun projet en cours</EmptyTitle>
                  <EmptyDescription>Rien à afficher pour l&apos;instant.</EmptyDescription>
                </EmptyHeader>
              </Empty>
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
