"use client";

import { useState, useRef } from "react";
import { Eye, Paperclip, CheckSquare, UserCheck, MessageCircle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PrioriteBadge } from "@/components/priorite-badge";
import { TicketTypeBadge } from "@/components/ticket-type-badge";
import {
  TICKET_STATUT_LABELS,
  ticketStatutBadgeVariant,
  type TicketStatut,
  type TicketPriorite,
  type TicketType,
} from "@/lib/types";
import { TAG_COLOR_CLASSES, type Tag } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type ChecklistItem = { id: string; contenu: string; complete: boolean };
type Attachment = { id: string; nom_fichier: string; taille_octets: number | null };
type Assigne = { full_name: string | null; email: string | null } | null;

type PreviewData = {
  description: string | null;
  checklist: ChecklistItem[];
  attachments: Attachment[];
  assigne: Assigne;
  createur: Assigne;
  typeTicket: string | null;
  refClient: string | null;
  nbMessages: number;
  tags: Tag[];
  dateEcheance: string | null;
  nbRelations: number;
  aDemandeReouverture: boolean;
};

/**
 * Hook utilitaire exporté pour que les tables puissent gérer le hover
 * sur toute la ligne et passer open/onOpenChange au popover.
 *
 * Usage dans une table :
 *   const { openId, rowHandlers, closePopover } = useRowHoverPreview();
 *   <TableRow {...rowHandlers(ticket.id)} ...>
 *     <TicketPreviewPopover open={openId === ticket.id} onOpenChange={...} ... />
 *   </TableRow>
 */
const HOVER_OPEN_DELAY = 250;
const HOVER_CLOSE_DELAY = 120;

export function useRowHoverPreview() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function isMobile() {
    return typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
  }

  function rowHandlers(id: string) {
    return {
      onMouseEnter() {
        if (isMobile()) return;
        if (closeTimer.current) clearTimeout(closeTimer.current);
        openTimer.current = setTimeout(() => setOpenId(id), HOVER_OPEN_DELAY);
      },
      onMouseLeave() {
        if (isMobile()) return;
        if (openTimer.current) clearTimeout(openTimer.current);
        closeTimer.current = setTimeout(() => setOpenId(null), HOVER_CLOSE_DELAY);
      },
    };
  }

  function popoverHandlers() {
    return {
      onMouseEnter() {
        if (closeTimer.current) clearTimeout(closeTimer.current);
      },
      onMouseLeave() {
        if (!isMobile()) {
          closeTimer.current = setTimeout(() => setOpenId(null), HOVER_CLOSE_DELAY);
        }
      },
    };
  }

  function closePopover() {
    setOpenId(null);
  }

  return { openId, rowHandlers, popoverHandlers, closePopover };
}

/**
 * Popover de prévisualisation d'un ticket.
 *
 * Deux modes :
 * - Autonome (sans prop open) : gère son propre état, hover sur le bouton
 *   uniquement. Mobile = clic, desktop = hover.
 * - Contrôlé (avec prop open) : les tables passent open/onOpenChange pour
 *   que le hover sur toute la ligne déclenche l'ouverture. Le bouton reste
 *   visible comme indicateur visuel et permet le clic mobile.
 */
export function TicketPreviewPopover({
  ticketId,
  titre,
  statut,
  priorite,
  description: descriptionInitiale,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  popoverHandlers,
}: {
  ticketId: string;
  titre: string;
  statut: TicketStatut;
  priorite: TicketPriorite;
  description: string | null;
  /** Mode contrôlé — géré par useRowHoverPreview dans la table parente */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Handlers pour maintenir le popover ouvert quand la souris entre dedans */
  popoverHandlers?: ReturnType<ReturnType<typeof useRowHoverPreview>["popoverHandlers"]>;
}) {
  // Mode autonome : état interne
  const [openInternal, setOpenInternal] = useState(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openInternal;
  const setOpen = isControlled
    ? (v: boolean) => onOpenChangeProp?.(v)
    : setOpenInternal;

  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  async function chargerDetails() {
    if (data) return;
    setLoading(true);
    const supabase = createClient();
    const [
      { data: checklist },
      { data: attachments },
      { data: ticketDetail },
      { count: nbMessages },
      { data: tagsRows },
      { count: nbRelations },
      { count: nbDemandes },
    ] = await Promise.all([
      supabase
        .from("ticket_checklist_items")
        .select("id, contenu, complete")
        .eq("ticket_id", ticketId)
        .order("ordre")
        .order("created_at"),
      supabase
        .from("ticket_attachments")
        .select("id, nom_fichier, taille_octets")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false }),
      supabase
        .from("tickets")
        .select("assigne_a, created_by, type_ticket, ref_client, date_prevue, assigne_profile:profiles!tickets_assigne_a_fkey(full_name, email, pseudo)")
        .eq("id", ticketId)
        .single(),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("ticket_id", ticketId),
      supabase
        .from("ticket_tags")
        .select("tags(id, nom, couleur, projet_id)")
        .eq("ticket_id", ticketId),
      supabase
        .from("ticket_relations")
        .select("id", { count: "exact", head: true })
        .eq("ticket_id", ticketId),
      supabase
        .from("demandes_reouverture")
        .select("id", { count: "exact", head: true })
        .eq("ticket_id", ticketId)
        .eq("statut", "en_attente"),
    ]);

    // Fetch créateur séparément
    const createdBy = (ticketDetail as unknown as { created_by: string | null })?.created_by;
    let createurProfil: Assigne = null;
    if (createdBy) {
      const { data: cp } = await supabase.from("profiles").select("full_name, email, pseudo").eq("id", createdBy).single();
      createurProfil = cp ? { full_name: (cp as unknown as { pseudo: string | null }).pseudo || cp.full_name, email: cp.email } : null;
    }
    const assigneProfil = (ticketDetail as unknown as { assigne_profile: { full_name: string | null; email: string | null; pseudo: string | null } | null })?.assigne_profile;

    setData({
      description: descriptionInitiale,
      checklist: (checklist ?? []) as ChecklistItem[],
      attachments: (attachments ?? []) as Attachment[],
      assigne: assigneProfil ? { full_name: assigneProfil.pseudo || assigneProfil.full_name, email: assigneProfil.email } : null,
      createur: createurProfil,
      typeTicket: (ticketDetail as unknown as { type_ticket: string | null })?.type_ticket ?? null,
      refClient: (ticketDetail as unknown as { ref_client: string | null })?.ref_client ?? null,
      nbMessages: nbMessages ?? 0,
      tags: (tagsRows ?? []).map((r) => r.tags as unknown as Tag).filter(Boolean),
      dateEcheance: (ticketDetail as unknown as { date_prevue: string | null })?.date_prevue ?? null,
      nbRelations: nbRelations ?? 0,
      aDemandeReouverture: (nbDemandes ?? 0) > 0,
    });
    setLoading(false);
  }

  function isMobile() {
    return typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
  }

  // Handlers mode autonome (hover sur le bouton)
  function ouvrirAvecDelai() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    openTimerRef.current = setTimeout(() => {
      setOpen(true);
      chargerDetails();
    }, 300);
  }
  function fermerAvecDelai() {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 150);
  }

  // Charger les données quand le popover s'ouvre en mode contrôlé
  if (isControlled && open && !data && !loading) {
    chargerDetails();
  }

  const checklist = data?.checklist ?? [];
  const attachments = data?.attachments ?? [];
  const total = checklist.length;
  const nbMessages = data?.nbMessages ?? 0;
  const tags = data?.tags ?? [];
  const dateEcheance = data?.dateEcheance ?? null;
  const nbRelations = data?.nbRelations ?? 0;
  const aDemandeReouverture = data?.aDemandeReouverture ?? false;
  const faites = checklist.filter((i) => i.complete).length;
  const pct = total > 0 ? Math.round((faites / total) * 100) : 0;
  const assigneNom = data?.assigne?.full_name || data?.assigne?.email || null;
  const createurNom = data?.createur?.full_name || data?.createur?.email || null;
  const typeTicket = data?.typeTicket ?? null;
  const refClient = data?.refClient ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          aria-label={`Aperçu du ticket ${titre}`}
          onClick={(e) => {
            e.stopPropagation();
            // Mobile : clic toggle dans les deux modes
            if (isMobile()) {
              if (!open) chargerDetails();
              setOpen(!open);
            }
            // Desktop mode autonome : clic toggle aussi
            if (!isControlled && !isMobile()) {
              if (!open) chargerDetails();
              setOpen(!open);
            }
          }}
          onMouseEnter={() => {
            if (!isControlled && !isMobile()) ouvrirAvecDelai();
          }}
          onMouseLeave={() => {
            if (!isControlled && !isMobile()) fermerAvecDelai();
          }}
        >
          <Eye className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        onClick={(e) => e.stopPropagation()}
        {...(popoverHandlers ?? {})}
      >
        <div className="flex flex-col gap-2 p-3 border-b">
          <p className="text-sm font-medium leading-snug">{titre}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <PrioriteBadge priorite={priorite} />
            <Badge variant={ticketStatutBadgeVariant(statut)} className="text-xs">
              {TICKET_STATUT_LABELS[statut]}
            </Badge>
            {typeTicket && (
              <TicketTypeBadge type={typeTicket as TicketType} variant="icon" />
            )}
          </div>
          {refClient && (
            <p className="text-xs text-muted-foreground font-mono">Réf. client : {refClient}</p>
          )}
        </div>

        {loading && (
          <p className="text-xs text-muted-foreground px-3 py-4">Chargement…</p>
        )}

        {!loading && (
          <div className="flex flex-col gap-0 divide-y">
            <div className="px-3 py-2.5">
              {data?.description ? (
                <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {data.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">Pas de description.</p>
              )}
            </div>

            {createurNom && (
              <div className="px-3 py-2.5 flex items-center gap-1.5">
                <UserCheck className="size-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Créé par : <span className="text-foreground">{createurNom}</span>
                </span>
              </div>
            )}

            {assigneNom && (
              <div className="px-3 py-2.5 flex items-center gap-1.5">
                <UserCheck className="size-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Assigné à : <span className="text-foreground">{assigneNom}</span>
                </span>
              </div>
            )}

            {total > 0 && (
              <div className="px-3 py-2.5 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Checklist — {faites}/{total}</span>
                </div>
                <Progress value={pct} className="h-1" />
                <ul className="flex flex-col gap-0.5 mt-0.5">
                  {checklist.slice(0, 5).map((item) => (
                    <li key={item.id} className="text-xs">
                      <span className={item.complete ? "text-muted-foreground line-through" : "text-foreground"}>
                        {item.complete ? "✓" : "○"} {item.contenu}
                      </span>
                    </li>
                  ))}
                  {checklist.length > 5 && (
                    <li className="text-xs text-muted-foreground">+ {checklist.length - 5} autres…</li>
                  )}
                </ul>
              </div>
            )}

            {attachments.length > 0 && (
              <div className="px-3 py-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Paperclip className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {attachments.length} pièce{attachments.length > 1 ? "s" : ""} jointe{attachments.length > 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="flex flex-col gap-0.5">
                  {attachments.slice(0, 3).map((a) => (
                    <li key={a.id} className="text-xs text-muted-foreground truncate">{a.nom_fichier}</li>
                  ))}
                  {attachments.length > 3 && (
                    <li className="text-xs text-muted-foreground">+ {attachments.length - 3} autres…</li>
                  )}
                </ul>
              </div>
            )}

            {nbMessages > 0 && (
              <div className="px-3 py-2.5 flex items-center gap-1.5">
                <MessageCircle className="size-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {nbMessages} message{nbMessages > 1 ? "s" : ""}
                </span>
              </div>
            )}

            {tags.length > 0 && (
              <div className="px-3 py-2.5 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${TAG_COLOR_CLASSES[tag.couleur]}`}
                  >
                    {tag.nom}
                  </span>
                ))}
              </div>
            )}

            {dateEcheance && (
              <div className="px-3 py-2.5 flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  Échéance : {new Date(dateEcheance).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
            )}

            {nbRelations > 0 && (
              <div className="px-3 py-2.5 flex items-center gap-1.5">
                <Link2 className="size-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {nbRelations} relation{nbRelations > 1 ? "s" : ""}
                </span>
              </div>
            )}

            {aDemandeReouverture && (
              <div className="px-3 py-2.5 flex items-center gap-1.5 border-t bg-amber-500/10">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  ⚠ Demande de réouverture en attente
                </span>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
