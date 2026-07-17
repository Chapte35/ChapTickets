import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjetMessageThread, type ProjetMessageRow } from "@/components/projet-message-thread";
import { postMessageProjetAdmin } from "../actions";

export default async function MessagerieProjetAdminPage({
  params,
}: {
  params: Promise<{ projetId: string }>;
}) {
  const { projetId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: projet, error }, { data: messages }] = await Promise.all([
    supabase.from("projets").select("id, nom").eq("id", projetId).single(),
    supabase
      .from("messages_projet")
      .select("id, contenu, created_at, auteur_id, profiles(role, full_name, email)")
      .eq("projet_id", projetId)
      .order("created_at", { ascending: true }),
  ]);

  if (error || !projet) notFound();

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Link
        href="/admin/messagerie"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Toutes les conversations
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{projet.nom}</CardTitle>
        </CardHeader>
        <CardContent>
          {user && (
            <ProjetMessageThread
              projetId={projet.id}
              messages={(messages ?? []) as unknown as ProjetMessageRow[]}
              currentUserId={user.id}
              action={postMessageProjetAdmin}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
