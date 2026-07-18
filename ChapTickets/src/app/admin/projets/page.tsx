import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TicketKanbanReadonly, type TicketKanbanItem } from "@/components/ticket-kanban-readonly";
import { PROJET_STATUT_LABELS, type ProjetStatut, type TicketStatut, type TicketPriorite } from "@/lib/types";

export default async function ProjetsPage() {
  const supabase = await createClient();

  const [{ data: projets, error }, { data: tickets }] = await Promise.all([
    supabase.from("projets").select("id, nom, statut").order("nom"),
    supabase.from("tickets").select("id, titre, statut, priorite, projet_id"),
  ]);

  const ticketsParProjet = new Map<string, TicketKanbanItem[]>();
  for (const t of tickets ?? []) {
    const liste = ticketsParProjet.get(t.projet_id) ?? [];
    liste.push({
      id: t.id,
      titre: t.titre,
      statut: t.statut as TicketStatut,
      priorite: t.priorite as TicketPriorite,
    });
    ticketsParProjet.set(t.projet_id, liste);
  }

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

      {!error && (!projets || projets.length === 0) && (
        <p className="text-sm text-muted-foreground py-6">Aucun projet pour l&apos;instant.</p>
      )}

      {!error &&
        projets?.map((p) => {
          const ticketsDuProjet = ticketsParProjet.get(p.id) ?? [];
          return (
            <Card key={p.id}>
              <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{p.nom}</CardTitle>
                  <Badge variant="outline">{PROJET_STATUT_LABELS[p.statut as ProjetStatut]}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/projets/${p.id}/overview`}
                    className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Overview
                  </Link>
                  <Link
                    href={`/admin/projets/${p.id}`}
                    className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Gérer
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {ticketsDuProjet.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Aucun ticket sur ce projet.</p>
                ) : (
                  <TicketKanbanReadonly tickets={ticketsDuProjet} basePath="/admin/tickets" />
                )}
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
