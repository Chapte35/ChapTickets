"use client";

import dynamic from "next/dynamic";
import type { ProjetOption, ClientOption } from "@/lib/queries/tickets";
import type { TicketSansRelease } from "./page";

const ReleasesBoard = dynamic(
  () => import("./releases-board").then((m) => m.ReleasesBoard),
  { ssr: false, loading: () => <p className="text-sm text-muted-foreground py-6">Chargement…</p> }
);

type ReleaseExistante = {
  id: string;
  projet_id: string;
  nom: string;
  date: string;
  description: string | null;
};

export function ReleasesBoardClient({
  tickets,
  projets,
  projetIdActuel,
  clientsParProjet,
  releases,
}: {
  tickets: TicketSansRelease[];
  projets: ProjetOption[];
  projetIdActuel: string | null;
  clientsParProjet: Record<string, ClientOption[]>;
  releases: ReleaseExistante[];
}) {
  return (
    <ReleasesBoard
      tickets={tickets}
      projets={projets}
      projetIdActuel={projetIdActuel}
      clientsParProjet={clientsParProjet}
      releases={releases}
    />
  );
}
