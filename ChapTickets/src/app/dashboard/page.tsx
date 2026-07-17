import Link from "next/link";
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
import { TICKET_STATUT_LABELS } from "@/lib/types";

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // le layout redirige déjà, filet de sécurité

  const { recents, nonLus } = await getClientDashboardData(supabase, user.id);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Messages non lus</CardTitle>
        </CardHeader>
        <CardContent>
          {nonLus.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              Rien de nouveau.
            </p>
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
                    <Badge>{t.nonLus} nouveau{t.nonLus > 1 ? "x" : ""}</Badge>
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
