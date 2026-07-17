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
  type Tag,
} from "@/lib/types";
import { getAllTags } from "@/lib/queries/tags";
import { ReopenRequestButton } from "./reopen-request-button";
import { MessageThread, type MessageRow } from "@/components/message-thread";
import { MarkTicketRead } from "@/components/mark-ticket-read";
import { TicketTagsEditor } from "@/components/ticket-tags-editor";
import { ChecklistPanel, type ChecklistItemRow } from "@/components/checklist-panel";
import { AttachmentsPanel, type AttachmentRow } from "@/components/attachments-panel";
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
  const statut = ticket.statut as TicketStatut;
  const priorite = ticket.priorite as TicketPriorite;
  const peutDemanderReouverture = STATUTS_ELIGIBLES_REOUVERTURE.includes(statut);

  const tagsActuels = (ticketTagsRows ?? [])
    .map((r) => r.tags as unknown as Tag | null)
    .filter((t): t is Tag => t !== null);

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

        <TicketTagsEditor
          ticketId={ticket.id}
          tagsActuels={tagsActuels}
          tousLesTags={tousLesTags}
        />

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
            action={postMessageClient}
          />
        )}
      </CardContent>
    </Card>
  );
}
