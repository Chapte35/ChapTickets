import { notFound } from "next/navigation";
import Link from "next/link";
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
  type Tag,
} from "@/lib/types";
import { getAllTags } from "@/lib/queries/tags";
import { StatusUpdateForm } from "./status-update-form";
import { DateEcheanceForm } from "./date-echeance-form";
import {
  ReopenRequestsPanel,
  type DemandeReouverture,
} from "./reopen-requests-panel";
import { MessageThread, type MessageRow } from "@/components/message-thread";
import { MarkTicketRead } from "@/components/mark-ticket-read";
import { TicketTagsEditor } from "@/components/ticket-tags-editor";
import { ChecklistPanel, type ChecklistItemRow } from "@/components/checklist-panel";
import { AttachmentsPanel, type AttachmentRow } from "@/components/attachments-panel";
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

  const [
    { data: ticket, error },
    { data: demandes },
    { data: messages },
    { data: ticketTagsRows },
    tousLesTags,
    { data: checklist },
    { data: attachmentsRows },
  ] = await Promise.all([
    supabase
      .from("tickets")
      .select(
        "id, titre, description, statut, priorite, created_at, date_prevue, ticket_origine_id, projets(nom), profiles:profiles!tickets_client_id_fkey(email, full_name)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("demandes_reouverture")
      .select(
        "id, message, statut, created_at, nouveau_ticket_id, profiles:profiles!demandes_reouverture_demande_par_fkey(email, full_name)"
      )
      .eq("ticket_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("id, contenu, created_at, auteur_id, profiles(role, full_name, email)")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("ticket_tags").select("tags(id, nom, couleur)").eq("ticket_id", id),
    getAllTags(supabase),
    supabase
      .from("ticket_checklist_items")
      .select("id, contenu, complete")
      .eq("ticket_id", id)
      .order("ordre")
      .order("created_at"),
    supabase
      .from("ticket_attachments")
      .select("id, storage_path, nom_fichier, taille_octets, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (error || !ticket) notFound();

  const projet = ticket.projets as unknown as { nom: string } | null;
  const client = ticket.profiles as unknown as {
    email: string | null;
    full_name: string | null;
  } | null;
  const statut = ticket.statut as TicketStatut;
  const priorite = ticket.priorite as TicketPriorite;

  // Requête séparée plutôt qu'une jointure auto-référencée dans le select
  // principal (tickets -> tickets) : ce genre de self-join via PostgREST
  // s'est révélé fragile et a fait planter la fiche ticket entière (404
  // sur des tickets pourtant valides). Un ticket n'a de toute façon
  // qu'exceptionnellement une origine, autant faire cette requête à part.
  const ticketOrigine = ticket.ticket_origine_id
    ? (
        await supabase
          .from("tickets")
          .select("id, titre")
          .eq("id", ticket.ticket_origine_id)
          .single()
      ).data
    : null;

  const tagsActuels = (ticketTagsRows ?? [])
    .map((r) => r.tags as unknown as Tag | null)
    .filter((t): t is Tag => t !== null);

  // URLs signées générées ici (côté serveur) : le bucket est privé, un lien
  // brut vers storage_path ne fonctionnerait pas sans authentification.
  const attachments: AttachmentRow[] = await Promise.all(
    (attachmentsRows ?? []).map(async (a) => {
      const { data: signed } = await supabase.storage
        .from("ticket-attachments")
        .createSignedUrl(a.storage_path, 3600);
      return {
        id: a.id,
        nom_fichier: a.nom_fichier,
        taille_octets: a.taille_octets,
        created_at: a.created_at,
        url: signed?.signedUrl ?? null,
      };
    })
  );

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <MarkTicketRead ticketId={ticket.id} />
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
          {ticketOrigine && (
            <Link
              href={`/admin/tickets/${ticketOrigine.id}`}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 w-fit"
            >
              Fait suite à « {ticketOrigine.titre} » →
            </Link>
          )}
          {ticket.description && (
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          )}

          <TicketTagsEditor
            ticketId={ticket.id}
            tagsActuels={tagsActuels}
            tousLesTags={tousLesTags}
          />

          <StatusUpdateForm ticketId={ticket.id} currentStatut={statut} />

          <DateEcheanceForm ticketId={ticket.id} dateActuelle={ticket.date_prevue} />

          <ReopenRequestsPanel
            ticketId={ticket.id}
            demandes={(demandes ?? []) as unknown as DemandeReouverture[]}
          />

          <ChecklistPanel
            ticketId={ticket.id}
            items={(checklist ?? []) as unknown as ChecklistItemRow[]}
          />

          <AttachmentsPanel ticketId={ticket.id} attachments={attachments} />

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
