"use client";

import { useActionState, useState, useRef, useEffect, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TICKET_STATUT_LABELS,
  ticketStatutBadgeVariant,
  formatRefTicket,
} from "@/lib/types";
import { PrioriteBadge } from "@/components/priorite-badge";
import { createReleaseAvecTickets } from "./actions";
import type { TicketSansRelease } from "./page";
import type { ProjetOption } from "@/lib/queries/tickets";
import { X, GripVertical } from "lucide-react";

const DROPPABLE_ID = "release-form";

type FormState = { error: string | null };
const initialState: FormState = { error: null };

// ── Carte ticket draggable ────────────────────────────────────────────────────

function CarteTicket({
  ticket,
  selectionne,
}: {
  ticket: TicketSansRelease;
  selectionne: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
    data: { ticket },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      data-ticket-id={ticket.id}
      className={cn(
        "flex items-start gap-2 rounded-md border bg-card p-2.5 text-sm cursor-grab active:cursor-grabbing touch-none transition-colors",
        isDragging && "opacity-40",
        selectionne && "border-primary bg-primary/5 ring-1 ring-primary/30"
      )}
    >
      <span
        {...listeners}
        {...attributes}
        className="mt-0.5 text-muted-foreground/50 shrink-0"
        aria-label="Glisser"
      >
        <GripVertical className="size-3.5" />
      </span>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="font-medium truncate">
          <span className="text-muted-foreground font-mono text-xs mr-1">
            {formatRefTicket(ticket.rang_projet, ticket.projets?.code_court)}
          </span>
          {ticket.titre}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <PrioriteBadge priorite={ticket.priorite} />
          <Badge variant={ticketStatutBadgeVariant(ticket.statut)} className="text-xs">
            {TICKET_STATUT_LABELS[ticket.statut]}
          </Badge>
          {ticket.projets && (
            <span className="text-xs text-muted-foreground">{ticket.projets.nom}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Zone de drop (formulaire) ─────────────────────────────────────────────────

function ZoneRelease({
  ticketsDroites,
  onRetirer,
  projets,
  projetIdActuel,
}: {
  ticketsDroites: TicketSansRelease[];
  onRetirer: (id: string) => void;
  projets: ProjetOption[];
  projetIdActuel: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: DROPPABLE_ID });
  const [state, formAction, isPending] = useActionState(createReleaseAvecTickets, initialState);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Nouvelle release</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Projet</Label>
            <Select name="projet_id" defaultValue={projetIdActuel ?? undefined} required>
              <SelectTrigger size="sm">
                <SelectValue placeholder="Choisir un projet..." />
              </SelectTrigger>
              <SelectContent>
                {projets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Nom</Label>
            <Input name="nom" placeholder="v1.2.0" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Date de release</Label>
            <Input name="date" type="date" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Description (optionnel)</Label>
            <Textarea name="description" className="text-sm min-h-16 resize-none" />
          </div>

          {/* Zone de drop — cibles dnd-kit ET réception du lasso */}
          <div
            ref={setNodeRef}
            className={cn(
              "flex flex-col gap-1.5 rounded-lg border-2 border-dashed p-3 min-h-[100px] transition-colors",
              isOver
                ? "border-primary bg-primary/5"
                : ticketsDroites.length > 0
                ? "border-muted-foreground/40 bg-muted/30"
                : "border-muted-foreground/20 bg-muted/20"
            )}
          >
            <p className="text-xs text-muted-foreground font-medium">
              {ticketsDroites.length === 0
                ? "Glissez ou lasso des tickets ici…"
                : `${ticketsDroites.length} ticket${ticketsDroites.length > 1 ? "s" : ""} inclus`}
            </p>
            {ticketsDroites.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <input type="hidden" name="ticket_ids" value={t.id} />
                <span className="flex-1 text-xs truncate">
                  <span className="font-mono text-muted-foreground mr-1">
                    {formatRefTicket(t.rang_projet, t.projets?.code_court)}
                  </span>
                  {t.titre}
                </span>
                <button
                  type="button"
                  onClick={() => onRetirer(t.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  aria-label={`Retirer ${t.titre}`}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          {state.error && <p className="text-xs text-destructive">{state.error}</p>}

          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Création…" : "Créer la release"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Board principal ───────────────────────────────────────────────────────────

export function ReleasesBoard({
  tickets: ticketsInitiaux,
  projets,
  projetIdActuel,
}: {
  tickets: TicketSansRelease[];
  projets: ProjetOption[];
  projetIdActuel: string | null;
}) {
  const [tickets, setTickets] = useState(ticketsInitiaux);
  const [ticketsDroites, setTicketsDroites] = useState<TicketSansRelease[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // ── Lasso ────────────────────────────────────────────────────────────────
  const listeRef = useRef<HTMLDivElement>(null);
  const carteRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const draggingRef = useRef(false);
  const [lasso, setLasso] = useState<{
    x1: number; y1: number; x2: number; y2: number;
  } | null>(null);
  const [lassoSelection, setLassoSelection] = useState<Set<string>>(new Set());

  const computeLassoIntersection = useCallback(
    (rect: { x1: number; y1: number; x2: number; y2: number }) => {
      const left = Math.min(rect.x1, rect.x2);
      const right = Math.max(rect.x1, rect.x2);
      const top = Math.min(rect.y1, rect.y2);
      const bottom = Math.max(rect.y1, rect.y2);
      const next = new Set<string>();
      carteRefs.current.forEach((el, id) => {
        const r = el.getBoundingClientRect();
        if (r.left < right && r.right > left && r.top < bottom && r.bottom > top) {
          next.add(id);
        }
      });
      return next;
    },
    []
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      setLasso((prev) =>
        prev ? { ...prev, x2: e.clientX, y2: e.clientY } : prev
      );
      setLasso((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, x2: e.clientX, y2: e.clientY };
        setLassoSelection(computeLassoIntersection(updated));
        return updated;
      });
    }

    function onMouseUp(e: MouseEvent) {
      if (!draggingRef.current) return;
      draggingRef.current = false;

      setLasso((prev) => {
        if (!prev) return null;
        const rect = { ...prev, x2: e.clientX, y2: e.clientY };
        const distance = Math.hypot(rect.x2 - rect.x1, rect.y2 - rect.y1);
        if (distance > 8) {
          // Basculer tous les tickets sélectionnés vers la droite
          const selection = computeLassoIntersection(rect);
          if (selection.size > 0) {
            setTickets((prev) => {
              const aDeplacer = prev.filter((t) => selection.has(t.id));
              setTicketsDroites((d) => {
                const idsDejaLa = new Set(d.map((t) => t.id));
                const nouveaux = aDeplacer.filter((t) => !idsDejaLa.has(t.id));
                return [...d, ...nouveaux];
              });
              return prev.filter((t) => !selection.has(t.id));
            });
          }
        }
        return null;
      });
      setLassoSelection(new Set());
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [computeLassoIntersection]);

  function handleListeMouseDown(e: React.MouseEvent) {
    // Ne pas démarrer le lasso si on clique sur un élément interactif
    const cible = e.target as HTMLElement;
    if (cible.closest("button, a, input, [role='button']")) return;
    // Ne pas démarrer si dnd-kit est en train de dragger
    if (activeId) return;
    draggingRef.current = true;
    setLasso({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY });
  }

  // ── dnd-kit ──────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || over.id !== DROPPABLE_ID) return;

    const ticketId = String(active.id);
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    if (ticketsDroites.some((t) => t.id === ticketId)) return;

    setTicketsDroites((prev) => [...prev, ticket]);
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
  }

  function retirerDuFormulaire(id: string) {
    const ticket = ticketsDroites.find((t) => t.id === id);
    if (!ticket) return;
    setTicketsDroites((prev) => prev.filter((t) => t.id !== id));
    setTickets((prev) => [ticket, ...prev]);
  }

  const activeTicket = tickets.find((t) => t.id === activeId) ?? null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4">
        {/* Colonne gauche 2/3 — liste tickets avec lasso */}
        <div
          ref={listeRef}
          className="flex flex-col gap-2 w-2/3 select-none relative"
          onMouseDown={handleListeMouseDown}
        >
          <p className="text-xs text-muted-foreground">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} sans release
            {lassoSelection.size > 0 && (
              <span className="ml-2 text-primary font-medium">
                — {lassoSelection.size} sélectionné{lassoSelection.size > 1 ? "s" : ""}
              </span>
            )}
          </p>
          {tickets.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Tous les tickets sont assignés à une release.
            </p>
          )}
          {tickets.map((t) => (
            <div
              key={t.id}
              ref={(el) => {
                if (el) carteRefs.current.set(t.id, el);
                else carteRefs.current.delete(t.id);
              }}
            >
              <CarteTicket ticket={t} selectionne={lassoSelection.has(t.id)} />
            </div>
          ))}

          {/* Rectangle lasso */}
          {lasso && (
            <div
              className="fixed z-50 border border-primary bg-primary/10 pointer-events-none"
              style={{
                left: Math.min(lasso.x1, lasso.x2),
                top: Math.min(lasso.y1, lasso.y2),
                width: Math.abs(lasso.x2 - lasso.x1),
                height: Math.abs(lasso.y2 - lasso.y1),
              }}
            />
          )}
        </div>

        {/* Colonne droite 1/3 — formulaire release */}
        <div className="w-1/3 sticky top-0 self-start">
          <ZoneRelease
            ticketsDroites={ticketsDroites}
            onRetirer={retirerDuFormulaire}
            projets={projets}
            projetIdActuel={projetIdActuel}
          />
        </div>
      </div>

      <DragOverlay>
        {activeTicket && (
          <div className="rounded-md border bg-card p-2.5 shadow-lg w-[280px] text-sm rotate-1 opacity-90">
            <span className="font-mono text-xs text-muted-foreground mr-1">
              {formatRefTicket(activeTicket.rang_projet, activeTicket.projets?.code_court)}
            </span>
            <span className="font-medium">{activeTicket.titre}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
