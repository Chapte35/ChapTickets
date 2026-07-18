"use client";

import { useState } from "react";
import Link from "next/link";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  TICKET_STATUT_LABELS,
  TICKET_PRIORITE_LABELS,
  ticketStatutBadgeVariant,
  ticketPrioriteBadgeVariant,
} from "@/lib/types";
import type { TicketSummary } from "@/lib/queries/dashboard";
import { initiales } from "@/lib/initiales";

function SortableHeader({
  label,
  column,
}: {
  label: string;
  column: {
    toggleSorting: (desc?: boolean) => void;
    getIsSorted: () => false | "asc" | "desc";
  };
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ml-1.5 size-3.5" />
    </Button>
  );
}

const columns: ColumnDef<TicketSummary>[] = [
  {
    accessorKey: "titre",
    header: ({ column }) => <SortableHeader label="Titre" column={column} />,
    cell: ({ row }) => {
      const t = row.original;
      const contenu = (
        <Link
          href={`/admin/tickets/${t.id}`}
          className="font-medium hover:underline underline-offset-2"
        >
          <span className="text-muted-foreground font-normal">#{t.numero}</span> {t.titre}
        </Link>
      );
      if (!t.description) return contenu;
      return (
        <HoverCard>
          <HoverCardTrigger asChild>{contenu}</HoverCardTrigger>
          <HoverCardContent>
            <p className="text-sm text-muted-foreground line-clamp-4">
              {t.description}
            </p>
          </HoverCardContent>
        </HoverCard>
      );
    },
  },
  {
    accessorFn: (t) => t.projets?.nom ?? "—",
    id: "projet",
    header: ({ column }) => <SortableHeader label="Projet" column={column} />,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue<string>()}</span>
    ),
  },
  {
    id: "client",
    header: "Client",
    cell: ({ row }) => {
      const p = row.original.profiles;
      const nom = p?.full_name || p?.email;
      if (!nom) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback className="text-[10px]">{initiales(nom)}</AvatarFallback>
          </Avatar>
          <span className="truncate max-w-[140px]">{nom}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "priorite",
    header: ({ column }) => <SortableHeader label="Priorité" column={column} />,
    cell: ({ getValue }) => {
      const p = getValue<TicketSummary["priorite"]>();
      return <Badge variant={ticketPrioriteBadgeVariant(p)}>{TICKET_PRIORITE_LABELS[p]}</Badge>;
    },
  },
  {
    accessorKey: "statut",
    header: ({ column }) => <SortableHeader label="Statut" column={column} />,
    cell: ({ getValue }) => {
      const s = getValue<TicketSummary["statut"]>();
      return <Badge variant={ticketStatutBadgeVariant(s)}>{TICKET_STATUT_LABELS[s]}</Badge>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <SortableHeader label="Créé le" column={column} />,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground text-xs">
        {new Date(getValue<string>()).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </span>
    ),
  },
];

export function TicketsDataTable({ tickets }: { tickets: TicketSummary[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (tickets.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>Rien ici</EmptyTitle>
          <EmptyDescription>
            Aucun ticket ne correspond pour l&apos;instant.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
