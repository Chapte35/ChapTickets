import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketList } from "@/components/ticket-list";
import { getAdminDashboardData } from "@/lib/queries/dashboard";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const { urgents, recents, projetsEnCours } = await getAdminDashboardData(supabase);

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Urgences</CardTitle>
          <CardDescription>
            Priorité urgente, pas encore résolus ni fermés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketList tickets={urgents} basePath="/admin/tickets" showClient />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets récents</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketList tickets={recents} basePath="/admin/tickets" showClient />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projets en cours</CardTitle>
        </CardHeader>
        <CardContent>
          {projetsEnCours.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              Aucun projet en cours pour l&apos;instant.
            </p>
          )}
          {projetsEnCours.length > 0 && (
            <ul className="flex flex-col divide-y">
              {projetsEnCours.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/projets/${p.id}`}
                    className="flex items-center justify-between gap-4 py-2.5 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <span className="text-sm font-medium">{p.nom}</span>
                    <Badge variant="outline">
                      {p.ticketsCount} ticket{p.ticketsCount > 1 ? "s" : ""}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
