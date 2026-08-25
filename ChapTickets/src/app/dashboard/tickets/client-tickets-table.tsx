"use client";

import Link from "next/link";
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
} from "@/lib/types";
import { PrioriteBadge } from "@/components/priorite-badge";
import { TicketPreviewPopover } from "@/components/ticket-preview-popover";

export type ClientTicketRow = {
  id: string;
  rang_projet: number;
  ref_client: string | null;
  titre: string;
  description: string | null;
  statut: TicketStatut;
  priorite: TicketPriorite;
  created_at: string;
  projets: { nom: string; code_court?: string | null } | null;
};

export function ClientTicketsTable({ tickets }: { tickets: ClientTicketRow[] }) {
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
          <TableHead className="w-28">Réf. interne</TableHead>
          <TableHead className="w-36">Réf. client</TableHead>
          <TableHead>Titre</TableHead>
          <TableHead>Projet</TableHead>
          <TableHead>Priorité</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="w-24">Créé le</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="text-muted-foreground tabular-nums font-mono text-xs">
              {formatRefTicket(t.rang_projet, t.projets?.code_court)}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {t.ref_client ?? <span className="italic">—</span>}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/dashboard/tickets/${t.id}`}
                  className="font-medium hover:underline underline-offset-2"
                >
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
            <TableCell className="text-muted-foreground">
              {t.projets?.nom ?? "—"}
            </TableCell>
            <TableCell>
              <PrioriteBadge priorite={t.priorite} />
            </TableCell>
            <TableCell>
              <Badge variant={ticketStatutBadgeVariant(t.statut)}>
                {TICKET_STATUT_LABELS[t.statut]}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-xs tabular-nums">
              {new Date(t.created_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })}
            </TableCell>
            <TableCell />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
