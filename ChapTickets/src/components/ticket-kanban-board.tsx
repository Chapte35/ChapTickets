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
import {
  TICKET_STATUTS,
  TICKET_STATUT_LABELS,
  TICKET_PRIORITE_LABELS,
  ticketPrioriteBadgeVariant,
  type TicketStatut,
} from "@/lib/types";
import type { TicketKanbanItem } from "./ticket-kanban-readonly";
import { updateTicketStatutInterne } from "@/app/admin/tickets/actions";

function Carte({ ticket, basePath }: { ticket: TicketKanbanItem; basePath: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "cursor-grab active:cursor-grabbing touch-none",
        isDragging && "opacity-40"
      )}
    >
      <Link
        href={`${basePath}/${ticket.id}`}
        // Un clic simple (sans déplacement) n'active pas le drag grâce à
        // l'activationConstraint distance ci-dessous — pas besoin de
        // stopPropagation, la navigation fonctionne normalement tant qu'on
        // ne glisse pas réellement la carte.
        className="flex flex-col gap-1.5 rounded-md border bg-card p-2 text-xs hover:shadow-sm transition-shadow"
      >
        <span className="font-medium leading-snug">{ticket.titre}</span>
        <Badge variant={ticketPrioriteBadgeVariant(ticket.priorite)} className="w-fit text-[10px]">
          {TICKET_PRIORITE_LABELS[ticket.priorite]}
        </Badge>
      </Link>
    </div>
  );
}

function Colonne({
  statut,
  tickets,
  basePath,
}: {
  statut: TicketStatut;
  tickets: TicketKanbanItem[];
  basePath: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: statut });

  return (
    <div className="flex flex-col gap-2 min-w-[220px] w-[220px] shrink-0">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold text-muted-foreground">
          {TICKET_STATUT_LABELS[statut]}
        </h3>
        <span className="text-xs text-muted-foreground">{tickets.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-1.5 min-h-[80px] max-h-[380px] overflow-y-auto transition-colors",
          isOver && "bg-accent/50 border-accent-foreground/20"
        )}
      >
        {tickets.map((t) => (
          <Carte key={t.id} ticket={t} basePath={basePath} />
        ))}
        {tickets.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-4">Vide</p>
        )}
      </div>
    </div>
  );
}

/**
 * Version fonctionnelle du kanban tickets : glisser une carte change le
 * statut du ticket (updateTicketStatutInterne, la même logique que le
 * select de la fiche ticket — historique inclus). Admin uniquement ; côté
 * client (dashboard), TicketKanbanReadonly reste utilisé tel quel, décision
 * explicite du sprint 10 (cf. clarification "réactiver côté admin, readonly
 * côté client").
 */
export function TicketKanbanBoard({
  initialTickets,
  basePath,
}: {
  initialTickets: TicketKanbanItem[];
  basePath: string;
}) {
  const [tickets, setTickets] = useState(initialTickets);
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

    const ticketId = String(active.id);
    const nouveauStatut = over.id as TicketStatut;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.statut === nouveauStatut) return;

    const ancienStatut = ticket.statut;

    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, statut: nouveauStatut } : t))
    );

    const result = await updateTicketStatutInterne(ticketId, nouveauStatut);
    if (result.error) {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, statut: ancienStatut } : t))
      );
    }
  }

  const activeTicket = tickets.find((t) => t.id === activeId) ?? null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {TICKET_STATUTS.map((statut) => (
          <Colonne
            key={statut}
            statut={statut}
            tickets={tickets.filter((t) => t.statut === statut)}
            basePath={basePath}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTicket && (
          <div className="rounded-md border bg-card p-2 shadow-lg w-[200px] text-xs rotate-2">
            <span className="font-medium">{activeTicket.titre}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
