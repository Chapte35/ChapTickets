"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  TICKET_TYPES,
  TICKET_TYPE_LABELS,
  ticketStatutBadgeVariant,
  formatRefTicket,
  type TicketStatut,
  type TicketPriorite,
} from "@/lib/types";
import { PrioriteBadge } from "@/components/priorite-badge";
import { TicketPreviewPopover, useRowHoverPreview } from "@/components/ticket-preview-popover";
import { TicketTypeBadge } from "@/components/ticket-type-badge";
import { deleteTicket, deleteTicketsBulk, updateTicketsStatutBulk, updateTicketsAssigneBulk, updateTicketsTypeBulk } from "./actions";

export type AdminTicketRow = {
  id: string;
  rang_projet: number;
  ref_client?: string | null;
  type_ticket?: string | null;
  titre: string;
  description: string | null;
  statut: TicketStatut;
  priorite: TicketPriorite;
  created_at: string;
  date_prevue?: string | null;
  ticket_origine_id?: string | null;
  release_id?: string | null;
  sprint_id?: string | null;
  projets: { nom: string; code_court?: string | null } | null;
  profiles: { email: string | null; full_name: string | null } | null;
  assigne_profile?: { full_name: string | null; email: string | null } | null;
};

type ProfilOption = { id: string; full_name: string | null; email: string | null };

// Types pour les données enrichies chargées au moment de l'extraction
type RelationEnrichie = {
  ticket_cible_id: string;
  ref: string;
  titre: string;
  type: string;
};

type DemandeReouvertureEnrichie = {
  id: string;
  statut: string;
  message: string | null;
  created_at: string;
  demandeur: string;
  traitee_at: string | null;
};

type MessageEnrichi = {
  id: string;
  contenu: string;
  created_at: string;
  auteur: string;
};

type ExtraitEnrichi = AdminTicketRow & {
  tags: string[];
  relations: RelationEnrichie[];
  origine_ref: string | null;
  release_nom: string | null;
  sprint_nom: string | null;
  demandes: DemandeReouvertureEnrichie[];
  messages: MessageEnrichi[];
};

const DEMANDE_STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  refusee: "Refusée",
};

function formaterDateHeure(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function construireExtrait(tickets: ExtraitEnrichi[]): string {
  return tickets
    .map((t) => {
      // RGPD : pseudo uniquement, jamais l'email
      const client = t.profiles?.full_name || "Anonyme";
      const assigne = t.assigne_profile?.full_name || null;
      const ref = formatRefTicket(t.rang_projet, t.projets?.code_court);
      const type = t.type_ticket ? TICKET_TYPE_LABELS[t.type_ticket as import("@/lib/types").TicketType] : null;

      const messagesSection = t.messages.length > 0
        ? [
            "",
            "**Messages :**",
            ...t.messages.map((m) =>
              `  [${formaterDateHeure(m.created_at)}] ${m.auteur} : ${m.contenu}`
            ),
          ].join("\n")
        : null;

      const demandesSection = t.demandes.length > 0
        ? [
            "",
            "**Demandes de réouverture :**",
            ...t.demandes.map((d) =>
              [
                `  [${formaterDateHeure(d.created_at)}] ${d.demandeur} — ${DEMANDE_STATUT_LABELS[d.statut] ?? d.statut}`,
                d.message ? `    "${d.message}"` : null,
                d.traitee_at ? `    Traitée le ${formaterDateHeure(d.traitee_at)}` : null,
              ].filter(Boolean).join("\n")
            ),
          ].join("\n")
        : null;

      const lignes = [
        `### ${ref} — ${t.titre}`,
        `- Projet : ${t.projets?.nom ?? "—"}`,
        `- Client : ${client}`,
        assigne ? `- Assigné à : ${assigne}` : null,
        `- Priorité : ${TICKET_PRIORITE_LABELS[t.priorite]} · Statut : ${TICKET_STATUT_LABELS[t.statut]}`,
        type ? `- Type : ${type}` : null,
        t.ref_client ? `- Réf. client : ${t.ref_client}` : null,
        `- Créé le : ${new Date(t.created_at).toLocaleDateString("fr-FR")}`,
        t.date_prevue
          ? `- Échéance : ${new Date(t.date_prevue).toLocaleDateString("fr-FR")}`
          : null,
        t.release_nom ? `- Release : ${t.release_nom}` : null,
        t.sprint_nom ? `- Sprint : ${t.sprint_nom}` : null,
        t.tags.length > 0 ? `- Tags : ${t.tags.join(", ")}` : null,
        t.origine_ref ? `- Réouverture de : ${t.origine_ref}` : null,
        t.relations.length > 0
          ? `- Liens : ${t.relations.map((r) => r.ref + " — " + r.titre).join(" · ")}`
          : null,
        t.description ? `\n${t.description}` : null,
        messagesSection,
        demandesSection,
      ].filter(Boolean);

      return lignes.join("\n");
    })
    .join("\n\n---\n\n");
}

export function AdminTicketsTable({ tickets, profils }: { tickets: AdminTicketRow[]; profils: ProfilOption[] }) {
  const router = useRouter();
  const { openId, rowHandlers, popoverHandlers, closePopover } = useRowHoverPreview();
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
  const NON_ASSIGNE = "__aucun__";
  const [assigneMasse, setAssigneMasse] = useState<string>("");
  const [applyingAssigne, setApplyingAssigne] = useState(false);
  const AUCUN_TYPE = "__aucun_type__";
  const [typeMasse, setTypeMasse] = useState<string>("");
  const [applyingType, setApplyingType] = useState(false);

  const [extracting, setExtracting] = useState(false);

  async function handleExtraire() {
    setExtracting(true);
    try {
      const ids = [...selection];
      const supabase = (await import("@/lib/supabase/client")).createClient();

      // Charger les données enrichies pour les tickets sélectionnés uniquement
      const releaseIds = ticketsSelectionnes.map((t) => t.release_id).filter(Boolean) as string[];
      const sprintIds = ticketsSelectionnes.map((t) => t.sprint_id).filter(Boolean) as string[];
      const origineIds = ticketsSelectionnes.map((t) => t.ticket_origine_id).filter(Boolean) as string[];

      const [
        { data: relationsRaw },
        { data: tagsRaw },
        { data: releasesRaw },
        { data: sprintsRaw },
        { data: originesRaw },
        { data: messagesRaw },
        { data: demandesRaw },
      ] = await Promise.all([
        supabase
          .from("ticket_relations")
          .select("ticket_id, ticket_cible_id, tickets_avec_rang!ticket_relations_ticket_cible_id_fkey(rang_projet, titre, projets(code_court))")
          .in("ticket_id", ids),
        supabase
          .from("ticket_tags")
          .select("ticket_id, tags(nom)")
          .in("ticket_id", ids),
        releaseIds.length > 0
          ? supabase.from("releases").select("id, nom").in("id", releaseIds)
          : Promise.resolve({ data: [] }),
        sprintIds.length > 0
          ? supabase.from("sprints").select("id, nom").in("id", sprintIds)
          : Promise.resolve({ data: [] }),
        origineIds.length > 0
          ? supabase.from("tickets_avec_rang").select("id, rang_projet, projets(code_court)").in("id", origineIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from("messages")
          .select("id, ticket_id, contenu, created_at, profiles!messages_auteur_id_fkey(full_name, email)")
          .in("ticket_id", ids)
          .order("created_at", { ascending: true }),
        supabase
          .from("demandes_reouverture")
          .select("id, ticket_id, statut, message, created_at, traitee_at, profiles!demandes_reouverture_demande_par_fkey(full_name, email)")
          .in("ticket_id", ids)
          .order("created_at", { ascending: true }),
      ]);

      // Indexer pour accès O(1)
      const releasesMap = new Map((releasesRaw ?? []).map((r) => [r.id, r.nom as string]));
      const sprintsMap = new Map((sprintsRaw ?? []).map((s) => [s.id, s.nom as string]));
      const originesMap = new Map(
        (originesRaw ?? []).map((o) => {
          const p = (o as unknown as { projets: { code_court: string | null } | null }).projets;
          return [o.id, formatRefTicket(o.rang_projet, p?.code_court)];
        })
      );

      // Tags par ticket
      const tagsParTicket: Record<string, string[]> = {};
      for (const row of tagsRaw ?? []) {
        const tag = (row as unknown as { ticket_id: string; tags: { nom: string } | null });
        if (!tagsParTicket[tag.ticket_id]) tagsParTicket[tag.ticket_id] = [];
        if (tag.tags?.nom) tagsParTicket[tag.ticket_id].push(tag.tags.nom);
      }

      // Relations par ticket
      const relationsParTicket: Record<string, RelationEnrichie[]> = {};
      for (const row of relationsRaw ?? []) {
        const r = row as unknown as {
          ticket_id: string;
          ticket_cible_id: string;
          tickets_avec_rang: { rang_projet: number; titre: string; projets: { code_court: string | null } | null } | null;
        };
        if (!relationsParTicket[r.ticket_id]) relationsParTicket[r.ticket_id] = [];
        if (r.tickets_avec_rang) {
          relationsParTicket[r.ticket_id].push({
            ticket_cible_id: r.ticket_cible_id,
            ref: formatRefTicket(r.tickets_avec_rang.rang_projet, r.tickets_avec_rang.projets?.code_court),
            titre: r.tickets_avec_rang.titre,
            type: "en_relation_avec",
          });
        }
      }

      // Messages par ticket
      const messagesParTicket: Record<string, MessageEnrichi[]> = {};
      for (const row of messagesRaw ?? []) {
        const m = row as unknown as {
          id: string;
          ticket_id: string;
          contenu: string;
          created_at: string;
          profiles: { full_name: string | null; email: string | null } | null;
        };
        if (!messagesParTicket[m.ticket_id]) messagesParTicket[m.ticket_id] = [];
        messagesParTicket[m.ticket_id].push({
          id: m.id,
          contenu: m.contenu,
          created_at: m.created_at,
          auteur: m.profiles?.full_name || "Anonyme",
        });
      }

      // Demandes de réouverture par ticket
      const demandesParTicket: Record<string, DemandeReouvertureEnrichie[]> = {};
      for (const row of demandesRaw ?? []) {
        const d = row as unknown as {
          id: string;
          ticket_id: string;
          statut: string;
          message: string | null;
          created_at: string;
          traitee_at: string | null;
          profiles: { full_name: string | null; email: string | null } | null;
        };
        if (!demandesParTicket[d.ticket_id]) demandesParTicket[d.ticket_id] = [];
        demandesParTicket[d.ticket_id].push({
          id: d.id,
          statut: d.statut,
          message: d.message,
          created_at: d.created_at,
          traitee_at: d.traitee_at,
          demandeur: d.profiles?.full_name || "Anonyme",
        });
      }

      // Construire les tickets enrichis
      const enrichis: ExtraitEnrichi[] = ticketsSelectionnes.map((t) => ({
        ...t,
        tags: tagsParTicket[t.id] ?? [],
        relations: relationsParTicket[t.id] ?? [],
        origine_ref: t.ticket_origine_id ? (originesMap.get(t.ticket_origine_id) ?? null) : null,
        release_nom: t.release_id ? (releasesMap.get(t.release_id) ?? null) : null,
        sprint_nom: t.sprint_id ? (sprintsMap.get(t.sprint_id) ?? null) : null,
        messages: messagesParTicket[t.id] ?? [],
        demandes: demandesParTicket[t.id] ?? [],
      }));

      const texte = construireExtrait(enrichis);
      await navigator.clipboard.writeText(texte);
      toast.success(
        `${ticketsSelectionnes.length} ticket${ticketsSelectionnes.length > 1 ? "s" : ""} copié${ticketsSelectionnes.length > 1 ? "s" : ""} dans le presse-papiers.`
      );
    } catch (err) {
      console.error("[handleExtraire]", err);
      toast.error("Erreur lors de l'extraction.");
    } finally {
      setExtracting(false);
    }
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

  async function handleApplyAssigneMasse() {
    if (!assigneMasse) return;
    setApplyingAssigne(true);
    const ids = [...selection];
    const valeur = assigneMasse === NON_ASSIGNE ? null : assigneMasse;
    const { maj, echecs } = await updateTicketsAssigneBulk(ids, valeur);
    setApplyingAssigne(false);
    if (maj > 0) toast.success(`${maj} ticket${maj > 1 ? "s" : ""} assigné${maj > 1 ? "s" : ""}.`);
    if (echecs > 0) toast.error(`${echecs} assignation(s) ont échoué.`);
    setAssigneMasse("");
    setSelection(new Set());
    router.refresh();
  }

  async function handleApplyTypeMasse() {
    if (!typeMasse) return;
    setApplyingType(true);
    const ids = [...selection];
    const valeur = typeMasse === AUCUN_TYPE ? null : typeMasse;
    const { maj, echecs } = await updateTicketsTypeBulk(ids, valeur);
    setApplyingType(false);
    if (maj > 0) toast.success(`${maj} ticket${maj > 1 ? "s" : ""} mis à jour.`);
    if (echecs > 0) toast.error(`${echecs} mise(s) à jour ont échoué.`);
    setTypeMasse("");
    setSelection(new Set());
    router.refresh();
  }

  // Clic sur une ligne : navigue sauf si une sélection est active
  // (évite les navigations accidentelles pendant le travail de sélection).
  function handleRowClick(id: string) {
    if (selection.size > 0) return;
    router.push(`/admin/tickets/${id}`);
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
          <Button size="sm" variant="outline" onClick={handleExtraire} disabled={extracting}>
            {extracting ? "Extraction…" : "Extraire"}
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
          <Select value={assigneMasse} onValueChange={setAssigneMasse}>
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue placeholder="Assigner à..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NON_ASSIGNE}>— Désassigner</SelectItem>
              {profils.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name || p.email || p.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!assigneMasse || applyingAssigne}
            onClick={handleApplyAssigneMasse}
          >
            {applyingAssigne ? "..." : "Assigner"}
          </Button>
          <Select value={typeMasse} onValueChange={setTypeMasse}>
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue placeholder="Changer le type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUCUN_TYPE}>— Retirer le type</SelectItem>
              {TICKET_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  <span className="flex items-center gap-1.5"><TicketTypeBadge type={t} variant="icon" />{TICKET_TYPE_LABELS[t]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!typeMasse || applyingType}
            onClick={handleApplyTypeMasse}
          >
            {applyingType ? "..." : "Typer"}
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
            {/* Checkbox — colonne isolée, ne déclenche pas la navigation */}
            <TableHead className="w-8">
              <Checkbox
                checked={selection.size === tickets.length ? true : selection.size > 0 ? "indeterminate" : false}
                onCheckedChange={(v) => toggleAll(v === true)}
                aria-label="Tout sélectionner"
              />
            </TableHead>
            <TableHead className="w-32">Réf. client</TableHead>
            <TableHead className="w-28">#</TableHead>
            <TableHead className="w-8">Type</TableHead>
            <TableHead className="w-24">Priorité</TableHead>
            <TableHead className="w-36">Statut</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead>Projet</TableHead>
            <TableHead>Créé par</TableHead>
            <TableHead>Assigné</TableHead>
            {/* Colonne Actions (preview + delete) — isolée, ne déclenche pas la navigation */}
            <TableHead className="w-16" />
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
              className="cursor-pointer"
              onClick={() => handleRowClick(t.id)}
              {...rowHandlers(t.id)}
            >
              {/* Checkbox — stopPropagation */}
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selection.has(t.id)}
                  onCheckedChange={(v) => toggleRow(t.id, v === true)}
                  aria-label={`Sélectionner ${t.titre}`}
                />
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {t.ref_client ? t.ref_client : <span className="italic text-muted-foreground/50">—</span>}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums font-mono text-xs">
                {formatRefTicket(t.rang_projet, t.projets?.code_court)}
              </TableCell>
              <TableCell>
                {t.type_ticket && (
                  <TicketTypeBadge type={t.type_ticket as import("@/lib/types").TicketType} variant="icon" />
                )}
              </TableCell>
              <TableCell>
                <PrioriteBadge priorite={t.priorite} />
              </TableCell>
              <TableCell>
                <Badge variant={ticketStatutBadgeVariant(t.statut)}>
                  {TICKET_STATUT_LABELS[t.statut]}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{t.titre}</TableCell>
              <TableCell className="text-muted-foreground">{t.projets?.nom ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {t.profiles?.full_name || t.profiles?.email || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {t.assigne_profile?.full_name || t.assigne_profile?.email || <span className="italic opacity-50">—</span>}
              </TableCell>
              {/* Actions (preview + delete) regroupées — stopPropagation */}
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1">
                  <TicketPreviewPopover
                    ticketId={t.id}
                    titre={t.titre}
                    statut={t.statut}
                    priorite={t.priorite}
                    description={t.description}
                    open={openId === t.id}
                    onOpenChange={(v) => { if (!v) closePopover(); }}
                    popoverHandlers={popoverHandlers()}
                  />
                  <ConfirmDeleteButton onConfirm={() => handleDeleteOne(t.id)} />
                </div>
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
