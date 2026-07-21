"use client";

import { useState } from "react";
import { Eye, Paperclip, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { createClient } from "@/lib/supabase/client";

type ChecklistItem = { id: string; contenu: string; complete: boolean };
type Attachment = { id: string; nom_fichier: string; taille_octets: number | null };

type PreviewData = {
  description: string | null;
  checklist: ChecklistItem[];
  attachments: Attachment[];
};

/**
 * Bouton œil + popover de prévisualisation rapide d'un ticket.
 * Charge checklist et pièces jointes au clic (pas au survol pour éviter
 * les requêtes intempestives). Disponible sur /admin/tickets et
 * /dashboard/tickets.
 */
export function TicketPreviewPopover({
  ticketId,
  titre,
  statut,
  priorite,
  description: descriptionInitiale,
}: {
  ticketId: string;
  titre: string;
  statut: TicketStatut;
  priorite: TicketPriorite;
  description: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  async function chargerDetails() {
    if (data) return; // déjà chargé
    setLoading(true);
    const supabase = createClient();
    const [{ data: checklist }, { data: attachments }] = await Promise.all([
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
    ]);
    setData({
      description: descriptionInitiale,
      checklist: (checklist ?? []) as ChecklistItem[],
      attachments: (attachments ?? []) as Attachment[],
    });
    setLoading(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) chargerDetails();
  }

  const checklist = data?.checklist ?? [];
  const attachments = data?.attachments ?? [];
  const total = checklist.length;
  const faites = checklist.filter((i) => i.complete).length;
  const pct = total > 0 ? Math.round((faites / total) * 100) : 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          aria-label={`Aperçu du ticket ${titre}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Eye className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
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
            {/* Description */}
            <div className="px-3 py-2.5">
              {data?.description ? (
                <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {data.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">Pas de description.</p>
              )}
            </div>

            {/* Checklist */}
            {total > 0 && (
              <div className="px-3 py-2.5 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Checklist — {faites}/{total}
                  </span>
                </div>
                <Progress value={pct} className="h-1" />
                <ul className="flex flex-col gap-0.5 mt-0.5">
                  {checklist.slice(0, 5).map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <span
                        className={
                          item.complete
                            ? "text-muted-foreground line-through"
                            : "text-foreground"
                        }
                      >
                        {item.complete ? "✓" : "○"} {item.contenu}
                      </span>
                    </li>
                  ))}
                  {checklist.length > 5 && (
                    <li className="text-xs text-muted-foreground">
                      + {checklist.length - 5} autres…
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Pièces jointes */}
            {attachments.length > 0 && (
              <div className="px-3 py-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Paperclip className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {attachments.length} pièce{attachments.length > 1 ? "s" : ""} jointe
                    {attachments.length > 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="flex flex-col gap-0.5">
                  {attachments.slice(0, 3).map((a) => (
                    <li key={a.id} className="text-xs text-muted-foreground truncate">
                      {a.nom_fichier}
                    </li>
                  ))}
                  {attachments.length > 3 && (
                    <li className="text-xs text-muted-foreground">
                      + {attachments.length - 3} autres…
                    </li>
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
