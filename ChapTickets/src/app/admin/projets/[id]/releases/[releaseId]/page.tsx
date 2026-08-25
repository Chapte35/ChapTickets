import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BackButton } from "@/components/back-button";
import { PrioriteBadge } from "@/components/priorite-badge";
import {
  TICKET_STATUT_LABELS,
  ticketStatutBadgeVariant,
  formatRefTicket,
  type TicketStatut,
  type TicketPriorite,
} from "@/lib/types";

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string; releaseId: string }>;
}) {
  const { id: projetId, releaseId } = await params;
  const supabase = await createClient();

  const [{ data: release, error: releaseError }, { data: tickets }] = await Promise.all([
    supabase
      .from("releases")
      .select("id, nom, date, description, projet_id, projets(nom, code_court)")
      .eq("id", releaseId)
      .eq("projet_id", projetId)
      .single(),
    supabase
      .from("tickets_avec_rang")
      .select("id, rang_projet, titre, statut, priorite, projets(nom, code_court)")
      .eq("release_id", releaseId)
      .order("created_at", { ascending: true }),
  ]);

  if (releaseError || !release) notFound();

  const projet = release.projets as unknown as { nom: string; code_court: string | null } | null;
  const ticketsList = (tickets ?? []) as unknown as Array<{
    id: string;
    rang_projet: number;
    titre: string;
    statut: TicketStatut;
    priorite: TicketPriorite;
    projets: { nom: string; code_court: string | null } | null;
  }>;

  const resolus = ticketsList.filter(
    (t) => t.statut === "resolu" || t.statut === "ferme"
  ).length;
  const total = ticketsList.length;
  const pct = total > 0 ? Math.round((resolus / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <BackButton />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {projet?.nom ?? "—"} · Release
          </p>
          <h1 className="text-lg font-semibold">{release.nom}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(release.date).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Link
          href={`/admin/projets/${projetId}/overview`}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0"
        >
          ← Vue projet
        </Link>
      </div>

      {release.description && (
        <p className="text-sm text-muted-foreground">{release.description}</p>
      )}

      {/* Barre de progression */}
      <Card>
        <CardContent className="pt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progression</span>
            <span className="text-muted-foreground">
              {resolus}/{total} tickets résolus
            </span>
          </div>
          {total > 0 ? (
            <Progress value={pct} className="h-2" />
          ) : (
            <p className="text-xs text-muted-foreground">Aucun ticket rattaché.</p>
          )}
        </CardContent>
      </Card>

      {/* Liste des tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Tickets ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ticketsList.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-4">
              Aucun ticket assigné à cette release.
            </p>
          ) : (
            <ul className="divide-y">
              {ticketsList.map((t) => {
                const ref = formatRefTicket(t.rang_projet, t.projets?.code_court ?? projet?.code_court);
                return (
                  <li key={t.id}>
                    <Link
                      href={`/admin/tickets/${t.id}`}
                      className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-medium truncate">
                          <span className="text-muted-foreground font-normal font-mono text-xs">
                            {ref}{" "}
                          </span>
                          {t.titre}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PrioriteBadge priorite={t.priorite} />
                        <Badge variant={ticketStatutBadgeVariant(t.statut)}>
                          {TICKET_STATUT_LABELS[t.statut]}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
