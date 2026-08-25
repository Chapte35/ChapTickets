"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, PackageOpen, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  TICKET_STATUT_LABELS,
  TICKET_TYPE_LABELS,
  ticketStatutBadgeVariant,
  formatRefTicket,
} from "@/lib/types";
import { PrioriteBadge } from "@/components/priorite-badge";
import { TicketTypeBadge } from "@/components/ticket-type-badge";
import { TicketPreviewPopover, useRowHoverPreview } from "@/components/ticket-preview-popover";
import type { ProjetAvecReleases, ReleaseAvecTickets, TicketDeLaRelease } from "./page";

// ── Ligne ticket dans la release ─────────────────────────────────────────────

function LigneTicket({
  ticket,
  open,
  onOpenChange,
  popoverHandlers,
}: {
  ticket: TicketDeLaRelease;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  popoverHandlers: ReturnType<ReturnType<typeof useRowHoverPreview>["popoverHandlers"]>;
}) {
  const ref = formatRefTicket(ticket.rang_projet, ticket.projets?.code_court);
  const estResolu = ticket.statut === "resolu" || ticket.statut === "ferme";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors",
        open && "bg-accent/40"
      )}
    >
      {/* Indicateur résolu */}
      <span className="shrink-0">
        {estResolu ? (
          <CheckCircle2 className="size-3.5 text-green-500" />
        ) : (
          <Clock className="size-3.5 text-muted-foreground" />
        )}
      </span>

      {/* Type icône */}
      {ticket.type_ticket && (
        <TicketTypeBadge type={ticket.type_ticket} variant="icon" className="shrink-0" />
      )}

      {/* Ref + titre */}
      <span className="flex-1 min-w-0">
        <span className="font-mono text-xs text-muted-foreground mr-1.5">{ref}</span>
        <span className={cn("text-sm", estResolu && "text-muted-foreground line-through")}>
          {ticket.titre}
        </span>
      </span>

      {/* Priorité + statut */}
      <div className="flex items-center gap-2 shrink-0">
        <PrioriteBadge priorite={ticket.priorite} />
        <Badge variant={ticketStatutBadgeVariant(ticket.statut)} className="text-xs hidden sm:inline-flex">
          {TICKET_STATUT_LABELS[ticket.statut]}
        </Badge>
      </div>

      {/* Preview popover */}
      <div onClick={(e) => e.stopPropagation()}>
        <TicketPreviewPopover
          ticketId={ticket.id}
          titre={ticket.titre}
          statut={ticket.statut}
          priorite={ticket.priorite}
          description={ticket.description}
          open={open}
          onOpenChange={onOpenChange}
          popoverHandlers={popoverHandlers}
        />
      </div>
    </div>
  );
}

// ── Card release avec accordéon ───────────────────────────────────────────────

function CardRelease({ release }: { release: ReleaseAvecTickets }) {
  const [ouvert, setOuvert] = useState(false);
  const { openId, rowHandlers, popoverHandlers } = useRowHoverPreview();

  const total = release.tickets.length;
  const resolus = release.tickets.filter(
    (t) => t.statut === "resolu" || t.statut === "ferme"
  ).length;
  const pct = total > 0 ? Math.round((resolus / total) * 100) : 0;
  const dateFormatee = new Date(release.date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const estPassee = new Date(release.date) < new Date();

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* En-tête cliquable */}
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
      >
        <span className="mt-0.5 shrink-0">
          <PackageOpen className="size-4 text-muted-foreground" />
        </span>

        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-sm">{release.nom}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">{dateFormatee}</span>
              {estPassee && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-500/30 bg-green-500/10">
                  Livrée
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {resolus}/{total} ticket{total !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>

          {total > 0 && <Progress value={pct} className="h-1" />}

          {release.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {release.description}
            </p>
          )}
        </div>

        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {ouvert ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </span>
      </button>

      {/* Liste des tickets — accordéon */}
      {ouvert && (
        <div className="border-t bg-muted/20">
          {total === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-3 italic">
              Aucun ticket dans cette release.
            </p>
          ) : (
            <div className="flex flex-col py-1">
              {release.tickets.map((t) => (
                <div
                  key={t.id}
                  {...rowHandlers(t.id)}
                >
                  <LigneTicket
                    ticket={t}
                    open={openId === t.id}
                    onOpenChange={(v) => { if (!v) return; }}
                    popoverHandlers={popoverHandlers()}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Vue principale ────────────────────────────────────────────────────────────

export function ClientReleasesView({ projets }: { projets: ProjetAvecReleases[] }) {
  return (
    <div className="flex flex-col gap-8">
      {projets.map((projet) => (
        <section key={projet.id} className="flex flex-col gap-3">
          {/* Titre du projet — affiché seulement si plusieurs projets */}
          {projets.length > 1 && (
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {projet.nom}
            </h2>
          )}

          <div className="flex flex-col gap-3">
            {projet.releases.map((release) => (
              <CardRelease key={release.id} release={release} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
