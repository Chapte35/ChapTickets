import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ProjetsKanban, type ProjetCard } from "./kanban-board";
import type { ProjetStatut } from "@/lib/types";

export default async function ProjetsPage() {
  const supabase = await createClient();
  const { data: projets, error } = await supabase
    .from("projets")
    .select("id, nom, statut, client_projets(count), tickets(count)")
    .order("created_at", { ascending: false });

  const cards: ProjetCard[] = (projets ?? []).map((p) => ({
    id: p.id,
    nom: p.nom,
    statut: p.statut as ProjetStatut,
    clientsCount:
      (p.client_projets as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    ticketsCount: (p.tickets as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }));

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
