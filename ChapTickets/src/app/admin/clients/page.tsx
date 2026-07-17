import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { InviteClientForm } from "./invite-client-form";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Inviter un client</CardTitle>
          <CardDescription>
            Envoie un email d&apos;invitation. Le compte est créé
            immédiatement (rôle client), le client définit son mot de passe
            via le lien reçu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteClientForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clients ({clients?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive">
              Erreur de chargement : {error.message}
            </p>
          )}
          {!error && (!clients || clients.length === 0) && (
            <p className="text-sm text-muted-foreground">
              Aucun client pour l&apos;instant.
            </p>
          )}
          {clients && clients.length > 0 && (
            <ul className="flex flex-col gap-2">
              {clients.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0 text-sm"
                >
                  <span>{c.full_name || "(sans nom)"}</span>
                  <span className="text-muted-foreground">{c.email}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
