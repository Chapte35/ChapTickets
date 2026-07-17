import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ProjetsKanban, type ProjetCard } from "./kanban-board";
import type { ProjetStatut, TicketStatut } from "@/lib/types";
import { TICKET_STATUTS } from "@/lib/types";

export default async function ProjetsPage() {
  const supabase = await createClient();

  const [{ data: projets, error }, { data: clientLinks }, { data: tickets }] =
    await Promise.all([
      supabase.from("projets").select("id, nom, statut").order("created_at", { ascending: false }),
      supabase.from("client_projets").select("projet_id, profiles(id, full_name, email)"),
      supabase.from("tickets").select("projet_id, statut, priorite"),
    ]);

  const clientsParProjet = new Map<string, { id: string; nom: string }[]>();
  for (const row of clientLinks ?? []) {
    const profile = row.profiles as unknown as {
      id: string;
      full_name: string | null;
      email: string | null;
    } | null;
    if (!profile) continue;
    const liste = clientsParProjet.get(row.projet_id) ?? [];
    liste.push({ id: profile.id, nom: profile.full_name || profile.email || "?" });
    clientsParProjet.set(row.projet_id, liste);
  }

  const ticketsParProjet = new Map<string, { statut: TicketStatut; priorite: string }[]>();
  for (const t of tickets ?? []) {
    const liste = ticketsParProjet.get(t.projet_id) ?? [];
    liste.push({ statut: t.statut as TicketStatut, priorite: t.priorite });
    ticketsParProjet.set(t.projet_id, liste);
  }

  const cards: ProjetCard[] = (projets ?? []).map((p) => {
    const ticketsDuProjet = ticketsParProjet.get(p.id) ?? [];
    const ticketsParStatut = Object.fromEntries(
      TICKET_STATUTS.map((s) => [s, ticketsDuProjet.filter((t) => t.statut === s).length])
    ) as Record<TicketStatut, number>;
    const ticketsUrgentsNonResolus = ticketsDuProjet.filter(
      (t) => t.priorite === "urgente" && t.statut !== "resolu" && t.statut !== "ferme"
    ).length;

    return {
      id: p.id,
      nom: p.nom,
      statut: p.statut as ProjetStatut,
      clients: clientsParProjet.get(p.id) ?? [],
      ticketsParStatut,
      ticketsTotal: ticketsDuProjet.length,
      ticketsUrgentsNonResolus,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Projets</h1>
        <Button asChild size="sm">
          <Link href="/admin/projets/new">Nouveau projet</Link>
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Erreur de chargement : {error.message}
        </p>
      )}

      {!error && <ProjetsKanban initialProjets={cards} />}
    </div>
  );
}
