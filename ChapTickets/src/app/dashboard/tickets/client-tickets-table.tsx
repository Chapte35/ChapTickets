"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TICKET_STATUT_LABELS,
  ticketStatutBadgeVariant,
  formatRefTicket,
  type TicketStatut,
  type TicketPriorite,
  type TicketType,
} from "@/lib/types";
import { PrioriteBadge } from "@/components/priorite-badge";
import { TicketTypeBadge } from "@/components/ticket-type-badge";
import { TicketPreviewPopover, useRowHoverPreview } from "@/components/ticket-preview-popover";
import { Avatar, type AvatarCouleur } from "@/components/avatar";

export type ClientTicketRow = {
  id: string;
  rang_projet: number;
  ref_client: string | null;
  type_ticket?: string | null;
  titre: string;
  description: string | null;
  statut: TicketStatut;
  priorite: TicketPriorite;
  created_at: string;
  projets: { nom: string; code_court?: string | null } | null;
  createur_nom?: string | null;
  createur_couleur?: string | null;
  createur_initiales?: string | null;
  assigne_nom?: string | null;
  assigne_couleur?: string | null;
  assigne_initiales?: string | null;
};

export function ClientTicketsTable({ tickets }: { tickets: ClientTicketRow[] }) {
  const router = useRouter();
  const { openId, rowHandlers, popoverHandlers, closePopover } = useRowHoverPreview();

  if (tickets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6">
        Aucun ticket ne correspond à ces critères.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-32">Réf. client</TableHead>
          <TableHead className="w-28">Réf. interne</TableHead>
          <TableHead className="w-8">Type</TableHead>
          <TableHead className="w-24">Priorité</TableHead>
          <TableHead className="w-36">Statut</TableHead>
          <TableHead>Titre</TableHead>
          <TableHead className="w-10">Créé par</TableHead>
          <TableHead className="w-10">Assigné</TableHead>
          <TableHead className="w-24">Créé le</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((t) => (
          <TableRow
            key={t.id}
            className="cursor-pointer"
            onClick={() => router.push(`/dashboard/tickets/${t.id}`)}
            {...rowHandlers(t.id)}
          >
            <TableCell className="text-muted-foreground text-xs">
              {t.ref_client ?? <span className="italic text-muted-foreground/50">—</span>}
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums font-mono text-xs">
              {formatRefTicket(t.rang_projet, t.projets?.code_court)}
            </TableCell>
            <TableCell>
              {t.type_ticket && (
                <TicketTypeBadge type={t.type_ticket as TicketType} variant="icon" />
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
            <TableCell className="w-10">
              {t.createur_nom ? (
                <Avatar
                  nom={t.createur_nom}
                  size="sm"
                  couleur={(t.createur_couleur as AvatarCouleur | null) ?? null}
                  initiales={t.createur_initiales ?? null}
                />
              ) : <span className="italic text-muted-foreground/50 text-xs">—</span>}
            </TableCell>
            <TableCell className="w-10">
              {t.assigne_nom ? (
                <Avatar
                  nom={t.assigne_nom}
                  size="sm"
                  couleur={(t.assigne_couleur as AvatarCouleur | null) ?? null}
                  initiales={t.assigne_initiales ?? null}
                />
              ) : <span className="italic text-muted-foreground/50 text-xs">—</span>}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs tabular-nums">
              {new Date(t.created_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
