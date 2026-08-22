import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketList } from "@/components/ticket-list";
import { getClientDashboardData } from "@/lib/queries/dashboard";
import { getProjetsDuClient } from "@/lib/queries/tickets";
import { TICKET_STATUT_LABELS } from "@/lib/types";
import { DashboardProjetSync } from "@/components/dashboard-projet-sync";

export default async function ClientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const projetId = params.projet ?? undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const projets = await getProjetsDuClient(supabase, user.id);

  // 1 projet et pas de filtre sidebar actif → redirect vers l'overview projet
  // (comportement existant, préservé)
  if (projets.length === 1 && !projetId) {
    redirect(`/dashboard/projets/${projets[0].id}`);
  }

  // 2+ projets sans projet sélectionné → sélecteur de cartes
  if (projets.length > 1 && !projetId) {
    return (
      <>
        <DashboardProjetSync projets={projets} />
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold">Tes projets</h1>
            <p className="text-sm text-muted-foreground">
              Choisis un projet pour voir son suivi, ou sélectionne-en un dans la sidebar.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projets.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/projets/${p.id}`}
                className="flex items-center justify-between rounded-lg border bg-card p-4 hover:shadow-sm hover:border-foreground/20 transition-all"
              >
                <span className="text-sm font-medium">{p.nom}</span>
                <span className="text-muted-foreground">→</span>
              </Link>
            ))}
          </div>
        </div>
      </>
    );
  }

  // Projet sélectionné (via sidebar) OU 0 projet → vue générique filtrée
  const { recents, nonLus } = await getClientDashboardData(supabase, user.id, projetId);

  const projetActif = projetId
    ? projets.find((p) => p.id === projetId) ?? null
    : null;

  return (
    <>
      <DashboardProjetSync projets={projets} />
      <div className="grid gap-4 xl:grid-cols-2">
        {projetActif && (
          <p className="xl:col-span-2 text-xs text-muted-foreground">
            Filtré sur le projet{" "}
            <span className="font-medium text-foreground">{projetActif.nom}</span>
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Messages non lus</CardTitle>
          </CardHeader>
          <CardContent>
            {nonLus.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">Rien de nouveau.</p>
            )}
            {nonLus.length > 0 && (
              <ul className="flex flex-col divide-y">
                {nonLus.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/dashboard/tickets/${t.id}`}
                      className="flex items-center justify-between gap-4 py-2.5 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{t.titre}</span>
                        <span className="text-xs text-muted-foreground">
                          {TICKET_STATUT_LABELS[t.statut]}
                        </span>
                      </div>
                      <Badge>
                        {t.nonLus} nouveau{t.nonLus > 1 ? "x" : ""}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mes tickets récents</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketList tickets={recents} basePath="/dashboard/tickets" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
