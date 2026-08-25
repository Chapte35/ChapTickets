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
  const router = useRouter();

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
          <TableHead className="w-24">Priorité</TableHead>
          <TableHead className="w-36">Statut</TableHead>
          <TableHead>Titre</TableHead>
          <TableHead className="w-24">Créé le</TableHead>
          {/* Colonne Actions — isolée, ne déclenche pas la navigation */}
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((t) => (
          <TableRow
            key={t.id}
            className="cursor-pointer"
            onClick={() => router.push(`/dashboard/tickets/${t.id}`)}
          >
            <TableCell className="text-muted-foreground text-xs">
              {t.ref_client ?? <span className="italic text-muted-foreground/50">—</span>}
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums font-mono text-xs">
              {formatRefTicket(t.rang_projet, t.projets?.code_court)}
            </TableCell>
            <TableCell>
              <PrioriteBadge priorite={t.priorite} />
            </TableCell>
            <TableCell>
              <Badge variant={ticketStatutBadgeVariant(t.statut)}>
                {TICKET_STATUT_LABELS[t.statut]}
              </Badge>
            </TableCell>
            <TableCell className="font-medium">
              {t.titre}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs tabular-nums">
              {new Date(t.created_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })}
            </TableCell>
            {/* Actions — stopPropagation pour ne pas naviguer au clic */}
            <TableCell onClick={(e) => e.stopPropagation()}>
              <TicketPreviewPopover
                ticketId={t.id}
                titre={t.titre}
                statut={t.statut}
                priorite={t.priorite}
                description={t.description}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
