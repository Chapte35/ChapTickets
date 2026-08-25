"use client";

import { useState, useRef } from "react";
import { Eye, Paperclip, CheckSquare, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PrioriteBadge } from "@/components/priorite-badge";
import {
  TICKET_STATUT_LABELS,
  ticketStatutBadgeVariant,
  type TicketStatut,
  type TicketPriorite,
} from "@/lib/types";
import { initiales } from "@/lib/initiales";
import { createClient } from "@/lib/supabase/client";

type ChecklistItem = { id: string; contenu: string; complete: boolean };
type Attachment = { id: string; nom_fichier: string; taille_octets: number | null };
type Assigne = { full_name: string | null; email: string | null } | null;

type PreviewData = {
  description: string | null;
  checklist: ChecklistItem[];
  attachments: Attachment[];
  assigne: Assigne;
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
        .select("assigne_a, profiles:profiles!tickets_assigne_a_fkey(full_name, email)")
        .eq("id", ticketId)
        .single(),
    ]);

    setData({
      description: descriptionInitiale,
      checklist: (checklist ?? []) as ChecklistItem[],
      attachments: (attachments ?? []) as Attachment[],
      assigne: (ticketDetail?.profiles as unknown as Assigne) ?? null,
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
  const faites = checklist.filter((i) => i.complete).length;
  const pct = total > 0 ? Math.round((faites / total) * 100) : 0;
  const assigneNom = data?.assigne?.full_name || data?.assigne?.email || null;

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
          </div>
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

            {assigneNom && (
              <div className="px-3 py-2.5 flex items-center gap-2">
                <UserCheck className="size-3 text-muted-foreground shrink-0" />
                <Avatar size="sm">
                  <AvatarFallback className="text-[10px]">
                    {initiales(assigneNom)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">{assigneNom}</span>
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
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
