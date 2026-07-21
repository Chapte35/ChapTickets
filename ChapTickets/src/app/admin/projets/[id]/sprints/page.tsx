import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Layers } from "lucide-react";
import { SprintCard } from "@/components/sprints/sprint-card";
import { SprintForm } from "@/components/sprints/sprint-form";
import { ProjetTabsNav } from "@/components/sprints/projet-tabs-nav";
import { BackButton } from "@/components/back-button";
import { getSprintsDuProjet, getTicketsSansSprintDuProjet } from "@/lib/queries/sprints";
import { getSprintAvecTickets } from "@/lib/queries/sprints";

export default async function SprintsProjetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projetId } = await params;
  const supabase = await createClient();

  const [{ data: projet, error }, sprints, ticketsDisponibles] = await Promise.all([
    supabase.from("projets").select("id, nom").eq("id", projetId).single(),
    getSprintsDuProjet(supabase, projetId),
    getTicketsSansSprintDuProjet(supabase, projetId),
  ]);

  if (error || !projet) notFound();

  // Charger les tickets de chaque sprint séquentiellement pour construire
  // SprintAvecTickets — pas de jointure imbriquée pour rester cohérent
  // avec la convention "pas de join auto-référencé complexe" du projet.
  const sprintsAvecTickets = await Promise.all(
    sprints.map((s) => getSprintAvecTickets(supabase, s.id))
  );
  const sprintsValides = sprintsAvecTickets.filter(Boolean) as NonNullable<
    (typeof sprintsAvecTickets)[number]
  >[];

  const sprintsOuverts = sprintsValides.filter((s) => s.statut === "ouvert");
  const sprintsClotures = sprintsValides.filter((s) => s.statut === "cloture");

  return (
    <div className="flex flex-col gap-4">
      <BackButton />
      <ProjetTabsNav projetId={projetId} />
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Sprints</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-3.5 mr-1.5" />
              Nouveau sprint
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Créer un sprint</DialogTitle>
            </DialogHeader>
            <SprintForm
              projetId={projetId}
              ticketsDisponibles={ticketsDisponibles}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Sprints ouverts */}
      {sprintsOuverts.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            En cours ({sprintsOuverts.length})
          </h3>
          {sprintsOuverts.map((s) => (
            <SprintCard key={s.id} sprint={s} basePath="/admin/tickets" />
          ))}
        </div>
      )}

      {/* Sprints clôturés */}
      {sprintsClotures.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Clôturés ({sprintsClotures.length})
          </h3>
          {sprintsClotures.map((s) => (
            <SprintCard key={s.id} sprint={s} basePath="/admin/tickets" />
          ))}
        </div>
      )}

      {sprintsValides.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers />
            </EmptyMedia>
            <EmptyTitle>Aucun sprint</EmptyTitle>
            <EmptyDescription>
              Créez un premier sprint pour organiser les tickets de ce projet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
