import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { KpiCard } from "@/components/charts/kpi-card";
import { TicketStatusDonut } from "@/components/charts/ticket-status-donut";
import { TicketsOverTimeChart } from "@/components/charts/tickets-over-time-chart";
import { PriorityBarChart } from "@/components/charts/priority-bar-chart";
import { TicketKanbanReadonly } from "@/components/ticket-kanban-readonly";
import { ReleaseProgressList } from "@/components/release-progress-list";
import { getProjetOverviewData } from "@/lib/queries/overview";
import { initiales } from "@/lib/initiales";
import { PROJET_STATUT_LABELS, type ProjetStatut } from "@/lib/types";
import { BackButton } from "@/components/back-button";
import { ProjetTabsNav } from "@/components/sprints/projet-tabs-nav";

export default async function ProjetOverviewAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const result = await getProjetOverviewData(supabase, id);
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

  const { projet, stats, clients, kanbanItems, releasesAvecProgression } = result;

  return (
    <div className="flex flex-col gap-4">
      <BackButton />
      <ProjetTabsNav projetId={id} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{projet.nom}</h1>
          <p className="text-sm text-muted-foreground">
            {PROJET_STATUT_LABELS[projet.statut as ProjetStatut]}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2">
            {clients.map((c) => (
              <Avatar key={c.id} size="sm" className="ring-2 ring-background">
                <AvatarFallback>{initiales(c.full_name || c.email || "?")}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <Link
            href={`/admin/projets/${projet.id}`}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Gérer le projet
          </Link>
        </div>
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
          <TicketKanbanReadonly tickets={kanbanItems} basePath="/admin/tickets" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Releases</CardTitle>
        </CardHeader>
        <CardContent>
          <ReleaseProgressList releases={releasesAvecProgression} projetId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
