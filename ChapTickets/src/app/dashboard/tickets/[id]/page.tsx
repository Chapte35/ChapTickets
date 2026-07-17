import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TICKET_STATUT_LABELS,
  TICKET_PRIORITE_LABELS,
  STATUTS_ELIGIBLES_REOUVERTURE,
  ticketStatutBadgeVariant,
  ticketPrioriteBadgeVariant,
  type TicketStatut,
  type TicketPriorite,
} from "@/lib/types";
import { ReopenRequestButton } from "./reopen-request-button";
import { MessageThread, type MessageRow } from "@/components/message-thread";
import { MarkTicketRead } from "@/components/mark-ticket-read";
import { postMessageClient } from "../actions";

export default async function ClientTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: ticket, error }, { data: demandes }, { data: messages }] =
    await Promise.all([
      supabase
        .from("tickets")
        .select("id, titre, description, statut, priorite, created_at, projets(nom)")
        .eq("id", id)
        .single(),
      supabase
        .from("demandes_reouverture")
        .select("statut")
        .eq("ticket_id", id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("messages")
        .select(
          "id, contenu, created_at, auteur_id, profiles(role, full_name, email)"
        )
        .eq("ticket_id", id)
        .order("created_at", { ascending: true }),
    ]);

  if (error || !ticket) notFound();

  const projet = ticket.projets as unknown as { nom: string } | null;
  const statut = ticket.statut as TicketStatut;
  const priorite = ticket.priorite as TicketPriorite;
  const peutDemanderReouverture = STATUTS_ELIGIBLES_REOUVERTURE.includes(statut);

  return (
    <Card className="max-w-2xl">
      <MarkTicketRead ticketId={ticket.id} />
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{ticket.titre}</CardTitle>
            <CardDescription>{projet?.nom ?? "—"}</CardDescription>
          </div>
          <Badge variant={ticketPrioriteBadgeVariant(priorite)}>
            {TICKET_PRIORITE_LABELS[priorite]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {ticket.description && (
          <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Statut :</span>
          <Badge variant={ticketStatutBadgeVariant(statut)}>
            {TICKET_STATUT_LABELS[statut]}
          </Badge>
        </div>
        {peutDemanderReouverture && (
          <ReopenRequestButton
            ticketId={ticket.id}
            demandeEnCours={demandes?.[0] ?? null}
          />
        )}
        {user && (
          <MessageThread
            ticketId={ticket.id}
            messages={(messages ?? []) as unknown as MessageRow[]}
            currentUserId={user.id}
            action={postMessageClient}
          />
        )}
      </CardContent>
    </Card>
  );
}
