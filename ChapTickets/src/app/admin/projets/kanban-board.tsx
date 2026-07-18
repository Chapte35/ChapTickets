"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";
import {
  PROJET_STATUTS,
  PROJET_STATUT_LABELS,
  TICKET_STATUTS,
  TICKET_STATUT_BAR_COLORS,
  type ProjetStatut,
  type TicketStatut,
} from "@/lib/types";
import { updateProjetStatut } from "./actions";

export type ProjetCard = {
  id: string;
  nom: string;
  statut: ProjetStatut;
  clients: { id: string; nom: string }[];
  ticketsParStatut: Record<TicketStatut, number>;
  ticketsTotal: number;
  ticketsUrgentsNonResolus: number;
};

/** Mini barre empilée montrant la répartition des tickets par statut. */
function RepartitionBar({ repartition, total }: { repartition: Record<TicketStatut, number>; total: number }) {
  if (total === 0) return null;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      {TICKET_STATUTS.map((s) =>
        repartition[s] > 0 ? (
          <div
            key={s}
            className={TICKET_STATUT_BAR_COLORS[s]}
            style={{ width: `${(repartition[s] / total) * 100}%` }}
            title={`${repartition[s]} ${s}`}
          />
        ) : null
      )}
    </div>
  );
}

function Card({ projet }: { projet: ProjetCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: projet.id,
  });

  const clientsAffiches = projet.clients.slice(0, 3);
  const clientsRestants = projet.clients.length - clientsAffiches.length;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "group rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing touch-none transition-shadow hover:shadow-md",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug">{projet.nom}</span>
        {projet.ticketsUrgentsNonResolus > 0 && (
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-destructive/15 text-destructive px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
            title={`${projet.ticketsUrgentsNonResolus} ticket(s) urgent(s) non résolus`}
          >
            <AlertTriangle className="size-2.5" />
            {projet.ticketsUrgentsNonResolus}
          </span>
        )}
      </div>

      {projet.ticketsTotal > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          <RepartitionBar repartition={projet.ticketsParStatut} total={projet.ticketsTotal} />
          <span className="text-[11px] text-muted-foreground">
            {projet.ticketsTotal} ticket{projet.ticketsTotal > 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center -space-x-1.5">
          {clientsAffiches.map((c) => (
            <Avatar key={c.id} nom={c.nom} className="ring-2 ring-card" />
          ))}
          {clientsRestants > 0 && (
            <span className="inline-flex items-center justify-center size-6 rounded-full bg-muted text-[10px] font-medium ring-2 ring-card">
              +{clientsRestants}
            </span>
          )}
          {projet.clients.length === 0 && (
            <span className="text-[11px] text-muted-foreground">Aucun client</span>
          )}
        </div>
        <Link
          href={`/admin/projets/${projet.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity underline underline-offset-2"
        >
          Détails →
        </Link>
      </div>
    </div>
  );
}

function Column({
  statut,
  projets,
}: {
  statut: ProjetStatut;
  projets: ProjetCard[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: statut });

  return (
    <div className="flex flex-col gap-2 min-w-[280px] w-[280px] shrink-0">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{PROJET_STATUT_LABELS[statut]}</h2>
        <span className="text-xs text-muted-foreground">{projets.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 rounded-lg border bg-muted/30 p-2 min-h-[200px] max-h-[460px] overflow-y-auto transition-colors",
          isOver && "bg-accent/50 border-accent-foreground/20"
        )}
      >
        {projets.map((p) => (
          <Card key={p.id} projet={p} />
        ))}
        {projets.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Aucun projet
          </p>
        )}
      </div>
    </div>
  );
}

export function ProjetsKanban({ initialProjets }: { initialProjets: ProjetCard[] }) {
  const [projets, setProjets] = useState(initialProjets);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const projetId = String(active.id);
    const nouveauStatut = over.id as ProjetStatut;
    const projet = projets.find((p) => p.id === projetId);
    if (!projet || projet.statut === nouveauStatut) return;

    const ancienStatut = projet.statut;

    setProjets((prev) =>
      prev.map((p) => (p.id === projetId ? { ...p, statut: nouveauStatut } : p))
    );

    const result = await updateProjetStatut(projetId, nouveauStatut);
    if (result?.error) {
      setProjets((prev) =>
        prev.map((p) => (p.id === projetId ? { ...p, statut: ancienStatut } : p))
      );
    }
  }

  const activeProjet = projets.find((p) => p.id === activeId) ?? null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PROJET_STATUTS.map((statut) => (
          <Column
            key={statut}
            statut={statut}
            projets={projets.filter((p) => p.statut === statut)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeProjet && (
          <div className="rounded-lg border bg-card p-3 shadow-lg w-[260px] rotate-2">
            <span className="text-sm font-medium">{activeProjet.nom}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
