"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  TICKET_STATUTS,
  TICKET_STATUT_LABELS,
  TICKET_PRIORITE_LABELS,
  ticketStatutBadgeVariant,
  formatRefTicket,
  type TicketStatut,
  type TicketPriorite,
} from "@/lib/types";
import { PrioriteBadge } from "@/components/priorite-badge";
import { TicketPreviewPopover } from "@/components/ticket-preview-popover";
import { deleteTicket, deleteTicketsBulk, updateTicketsStatutBulk } from "./actions";

export type AdminTicketRow = {
  id: string;
  rang_projet: number;
  titre: string;
  description: string | null;
  statut: TicketStatut;
  priorite: TicketPriorite;
  created_at: string;
  projets: { nom: string; code_court?: string | null } | null;
  profiles: { email: string | null; full_name: string | null } | null;
};

function construireExtrait(tickets: AdminTicketRow[]): string {
  return tickets
    .map((t) => {
      const client = t.profiles?.full_name || t.profiles?.email || "—";
      const ref = formatRefTicket(t.rang_projet, t.projets?.code_court);
      const lignes = [
        `### ${ref} — ${t.titre}`,
        `- Projet : ${t.projets?.nom ?? "—"}`,
        `- Client : ${client}`,
        `- Priorité : ${TICKET_PRIORITE_LABELS[t.priorite]} · Statut : ${TICKET_STATUT_LABELS[t.statut]}`,
        `- Créé le : ${new Date(t.created_at).toLocaleDateString("fr-FR")}`,
      ];
      if (t.description) lignes.push("", t.description);
      return lignes.join("\n");
    })
    .join("\n\n---\n\n");
}

export function AdminTicketsTable({ tickets }: { tickets: AdminTicketRow[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Lasso (glisser-sélectionner) ---------------------------------------
  const [drag, setDrag] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const draggingRef = useRef(false);

  const computeIntersection = useCallback((rect: { x1: number; y1: number; x2: number; y2: number }) => {
    const left = Math.min(rect.x1, rect.x2);
    const right = Math.max(rect.x1, rect.x2);
    const top = Math.min(rect.y1, rect.y2);
    const bottom = Math.max(rect.y1, rect.y2);

    const next = new Set<string>();
    rowRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      const intersecte = r.left < right && r.right > left && r.top < bottom && r.bottom > top;
      if (intersecte) next.add(id);
    });
    return next;
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      setDrag((prev) => (prev ? { ...prev, x2: e.clientX, y2: e.clientY } : prev));
    }
    function onMouseUp(e: MouseEvent) {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDrag((prev) => {
        if (prev) {
          const rect = { ...prev, x2: e.clientX, y2: e.clientY };
          // Un simple clic (quasi pas de déplacement) ne doit pas vider la
          // sélection existante — seul un vrai glisser déclenche le lasso.
          const distance = Math.hypot(rect.x2 - rect.x1, rect.y2 - rect.y1);
          if (distance > 4) {
            setSelection(computeIntersection(rect));
          }
        }
        return null;
      });
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [computeIntersection]);

  function handleMouseDown(e: React.MouseEvent) {
    const cible = e.target as HTMLElement;
    // Ne pas démarrer un lasso si le clic vise un élément interactif (lien,
    // case à cocher, bouton) — sinon impossible de cliquer normalement.
    if (cible.closest("a, button, input, [role='checkbox']")) return;
    draggingRef.current = true;
    setDrag({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY });
  }

  function toggleRow(id: string, checked: boolean) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelection(checked ? new Set(tickets.map((t) => t.id)) : new Set());
  }

  const ticketsSelectionnes = tickets.filter((t) => selection.has(t.id));
  const [statutMasse, setStatutMasse] = useState<TicketStatut | "">("");
  const [applyingStatut, setApplyingStatut] = useState(false);

  async function handleExtraire() {
    const texte = construireExtrait(ticketsSelectionnes);
    await navigator.clipboard.writeText(texte);
    toast.success(
      `${ticketsSelectionnes.length} ticket${ticketsSelectionnes.length > 1 ? "s" : ""} copié${ticketsSelectionnes.length > 1 ? "s" : ""} dans le presse-papiers.`
    );
  }

  async function handleDeleteOne(id: string) {
    const { error } = await deleteTicket(id);
    if (error) toast.error(`Erreur : ${error}`);
    else {
      toast.success("Ticket supprimé.");
      setSelection((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    }
  }

  async function handleDeleteSelection() {
    const ids = [...selection];
    const { supprimes, echecs } = await deleteTicketsBulk(ids);
    if (supprimes > 0) toast.success(`${supprimes} ticket${supprimes > 1 ? "s" : ""} supprimé${supprimes > 1 ? "s" : ""}.`);
    if (echecs > 0) toast.error(`${echecs} suppression(s) ont échoué.`);
    setSelection(new Set());
    router.refresh();
  }

  async function handleApplyStatutMasse() {
    if (!statutMasse) return;
    setApplyingStatut(true);
    const ids = [...selection];
    const { maj, echecs } = await updateTicketsStatutBulk(ids, statutMasse);
    setApplyingStatut(false);
    if (maj > 0) toast.success(`${maj} ticket${maj > 1 ? "s" : ""} passé${maj > 1 ? "s" : ""} en "${TICKET_STATUT_LABELS[statutMasse]}".`);
    if (echecs > 0) toast.error(`${echecs} changement(s) ont échoué.`);
    setStatutMasse("");
    setSelection(new Set());
    router.refresh();
  }

  if (tickets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6">
        Aucun ticket ne correspond à ces critères.
      </p>
    );
  }

  return (
    <div ref={containerRef} onMouseDown={handleMouseDown} className="select-none">
      {selection.size > 0 && (
        <div className="flex items-center gap-2 mb-3 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {selection.size} sélectionné{selection.size > 1 ? "s" : ""}
          </span>
          <Button size="sm" variant="outline" onClick={handleExtraire}>
            Extraire
          </Button>
          <Select value={statutMasse} onValueChange={(v) => setStatutMasse(v as TicketStatut)}>
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue placeholder="Changer le statut..." />
            </SelectTrigger>
            <SelectContent>
              {TICKET_STATUTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {TICKET_STATUT_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!statutMasse || applyingStatut}
            onClick={handleApplyStatutMasse}
          >
            {applyingStatut ? "..." : "Appliquer"}
          </Button>
          <ConfirmDeleteButton
            size="text"
            label={`Supprimer (${selection.size})`}
            onConfirm={handleDeleteSelection}
          />
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelection(new Set())}>
            Désélectionner
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                checked={selection.size === tickets.length ? true : selection.size > 0 ? "indeterminate" : false}
                onCheckedChange={(v) => toggleAll(v === true)}
                aria-label="Tout sélectionner"
              />
            </TableHead>
            <TableHead className="w-14">#</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead>Projet</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => (
            <TableRow
              key={t.id}
              ref={(el) => {
                if (el) rowRefs.current.set(t.id, el);
                else rowRefs.current.delete(t.id);
              }}
              data-state={selection.has(t.id) ? "selected" : undefined}
            >
              <TableCell>
                <Checkbox
                  checked={selection.has(t.id)}
                  onCheckedChange={(v) => toggleRow(t.id, v === true)}
                  aria-label={`Sélectionner ${t.titre}`}
                />
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums font-mono text-xs">
                {formatRefTicket(t.rang_projet, t.projets?.code_court)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Link href={`/admin/tickets/${t.id}`} className="font-medium hover:underline underline-offset-2">
                    {t.titre}
                  </Link>
                  <TicketPreviewPopover
                    ticketId={t.id}
                    titre={t.titre}
                    statut={t.statut}
                    priorite={t.priorite}
                    description={t.description}
                  />
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{t.projets?.nom ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {t.profiles?.full_name || t.profiles?.email || "—"}
              </TableCell>
              <TableCell>
                <PrioriteBadge priorite={t.priorite} />
              </TableCell>
              <TableCell>
                <Badge variant={ticketStatutBadgeVariant(t.statut)}>
                  {TICKET_STATUT_LABELS[t.statut]}
                </Badge>
              </TableCell>
              <TableCell>
                <ConfirmDeleteButton onConfirm={() => handleDeleteOne(t.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {drag && (
        <div
          className="fixed z-50 border border-primary bg-primary/10 pointer-events-none"
          style={{
            left: Math.min(drag.x1, drag.x2),
            top: Math.min(drag.y1, drag.y2),
            width: Math.abs(drag.x2 - drag.x1),
            height: Math.abs(drag.y2 - drag.y1),
          }}
        />
      )}
    </div>
  );
}
