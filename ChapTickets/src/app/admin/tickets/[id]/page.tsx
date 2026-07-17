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
  TICKET_PRIORITE_LABELS,
  ticketPrioriteBadgeVariant,
  type TicketPriorite,
  type TicketStatut,
} from "@/lib/types";
import { StatusUpdateForm } from "./status-update-form";
import {
  ReopenRequestsPanel,
  type DemandeReouverture,
} from "./reopen-requests-panel";
import { MessageThread, type MessageRow } from "@/components/message-thread";
import { postMessageAdmin } from "../actions";

export default async function AdminTicketDetailPage({
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
        .select(
          "id, titre, description, statut, priorite, created_at, projets(nom), profiles:profiles!tickets_client_id_fkey(email, full_name)"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("demandes_reouverture")
        .select(
          "id, message, statut, created_at, profiles:profiles!demandes_reouverture_demande_par_fkey(email, full_name)"
        )
        .eq("ticket_id", id)
        .order("created_at", { ascending: false }),
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
  const client = ticket.profiles as unknown as {
    email: string | null;
    full_name: string | null;
  } | null;
  const statut = ticket.statut as TicketStatut;
  const priorite = ticket.priorite as TicketPriorite;

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{ticket.titre}</CardTitle>
              <CardDescription>
                {projet?.nom ?? "—"} · {client?.full_name || client?.email || "—"}
              </CardDescription>
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
          <StatusUpdateForm ticketId={ticket.id} currentStatut={statut} />
          <ReopenRequestsPanel
            ticketId={ticket.id}
            demandes={(demandes ?? []) as unknown as DemandeReouverture[]}
          />
          {user && (
            <MessageThread
              ticketId={ticket.id}
              messages={(messages ?? []) as unknown as MessageRow[]}
              currentUserId={user.id}
              action={postMessageAdmin}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
