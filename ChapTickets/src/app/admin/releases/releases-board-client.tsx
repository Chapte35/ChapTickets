"use client";

import dynamic from "next/dynamic";
import type { ProjetOption } from "@/lib/queries/tickets";
import type { TicketSansRelease } from "./page";

// dnd-kit génère des aria-describedby avec des IDs incrémentaux qui
// divergent entre SSR et client → hydration mismatch. ssr:false doit
// vivre dans un Client Component, d'où ce wrapper.
const ReleasesBoard = dynamic(
  () => import("./releases-board").then((m) => m.ReleasesBoard),
  { ssr: false, loading: () => <p className="text-sm text-muted-foreground py-6">Chargement…</p> }
);

export function ReleasesBoardClient({
  tickets,
  projets,
  projetIdActuel,
}: {
  tickets: TicketSansRelease[];
  projets: ProjetOption[];
  projetIdActuel: string | null;
}) {
  return (
    <ReleasesBoard
      tickets={tickets}
      projets={projets}
      projetIdActuel={projetIdActuel}
    />
  );
}
