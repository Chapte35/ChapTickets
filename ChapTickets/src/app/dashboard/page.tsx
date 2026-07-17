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

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // le layout redirige déjà, filet de sécurité

  const projets = await getProjetsDuClient(supabase, user.id);

  // Un seul projet : pas la peine de faire choisir, on atterrit directement
  // sur son overview. Décision explicite (pas devinée) : si un client a
  // plusieurs projets, on le laisse choisir plutôt que d'arbitrer à sa place.
  if (projets.length === 1) {
    redirect(`/dashboard/projets/${projets[0].id}`);
  }

  if (projets.length > 1) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">Tes projets</h1>
          <p className="text-sm text-muted-foreground">
            Choisis un projet pour voir son suivi.
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
    );
  }

  // Aucun projet rattaché : pas d'overview possible, on retombe sur la vue
  // générique tickets/messages (celle d'avant ce sprint).
  const { recents, nonLus } = await getClientDashboardData(supabase, user.id);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
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
  );
}
