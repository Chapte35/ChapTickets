"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PROJET_STATUTS, PROJET_STATUT_LABELS, type ProjetStatut } from "@/lib/types";
import { updateProjetStatut } from "./actions";

export type ProjetCard = {
  id: string;
  nom: string;
  statut: ProjetStatut;
  clientsCount: number;
  ticketsCount: number;
};

function Card({ projet }: { projet: ProjetCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: projet.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "rounded-md border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing touch-none",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{projet.nom}</span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-xs">
          {projet.clientsCount} client{projet.clientsCount > 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {projet.ticketsCount} ticket{projet.ticketsCount > 1 ? "s" : ""}
        </Badge>
      </div>
      <Link
        href={`/admin/projets/${projet.id}`}
        // stopPropagation : évite que le clic déclenche/perturbe le drag
        // handle qui couvre toute la carte (listeners de useDraggable).
        onClick={(e) => e.stopPropagation()}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mt-2 inline-block"
      >
        Détails →
      </Link>
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
    <div className="flex flex-col gap-2 min-w-[260px] w-[260px] shrink-0">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{PROJET_STATUT_LABELS[statut]}</h2>
        <span className="text-xs text-muted-foreground">{projets.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 rounded-lg border bg-muted/30 p-2 min-h-[200px] transition-colors",
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

  // Seuil de déplacement avant de considérer que c'est un drag plutôt qu'un
  // simple clic — sans ça, cliquer sur "Détails →" dans une carte
  // déclencherait aussi un drag et le clic n'irait jamais jusqu'au lien.
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

    // Optimistic update : on bouge la carte tout de suite, on corrige si
    // le serveur refuse (RLS, réseau, etc.) plutôt que de faire attendre
    // l'utilisateur le round-trip avant de voir quoi que ce soit bouger.
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
          <div className="rounded-md border bg-card p-3 shadow-lg w-[244px] rotate-2">
            <span className="text-sm font-medium">{activeProjet.nom}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
