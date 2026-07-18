import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type TicketPriorite,
  type TicketStatut,
  type Tag,
} from "@/lib/types";
import { getAllTags } from "@/lib/queries/tags";
import { StatusUpdateForm } from "./status-update-form";
import { PriorityUpdateForm } from "./priority-update-form";
import { DateEcheanceForm } from "./date-echeance-form";
import {
  ReopenRequestsPanel,
  type DemandeReouverture,
} from "./reopen-requests-panel";
import { MessageThread, type MessageRow } from "@/components/message-thread";
import { MarkTicketRead } from "@/components/mark-ticket-read";
import { BackButton } from "@/components/back-button";
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
      .select("id, contenu, created_at, auteur_id, profiles!messages_auteur_id_fkey(role, full_name, email)")
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
    <div className="flex flex-col gap-4">
      <MarkTicketRead ticketId={ticket.id} />
      <BackButton />

      {/* Layout à 2 colonnes (façon Linear/GitHub Issues) : le contenu
          narratif (description, checklist, PJ, messages) prend toute la
          largeur disponible à gauche, les métadonnées éditables vivent
          dans une sidebar fixe à droite. Sur mobile, la sidebar repasse
          simplement sous le contenu principal (grid-cols-1). */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6 min-w-0">
          <div>
            <h1 className="text-lg font-semibold">{ticket.titre}</h1>
            <p className="text-sm text-muted-foreground">
              {projet?.nom ?? "—"} · {client?.full_name || client?.email || "—"}
            </p>
          </div>

          {ticketOrigine && (
            <Link
              href={`/admin/tickets/${ticketOrigine.id}`}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 w-fit -mt-4"
            >
              Fait suite à « {ticketOrigine.titre} » →
            </Link>
          )}

          <Card>
            <CardContent className="flex flex-col gap-6 pt-6">
              {ticket.description && (
                <p className="text-sm whitespace-pre-wrap max-w-prose">{ticket.description}</p>
              )}

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
                  context={{ field: "ticket_id", value: ticket.id }}
                  messages={(messages ?? []) as unknown as MessageRow[]}
                  currentUserId={user.id}
                  action={postMessageAdmin}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Détails</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Priorité</span>
                <PriorityUpdateForm ticketId={ticket.id} currentPriorite={priorite} />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Statut</span>
                <StatusUpdateForm ticketId={ticket.id} currentStatut={statut} />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Échéance</span>
                <DateEcheanceForm ticketId={ticket.id} dateActuelle={ticket.date_prevue} />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Tags</span>
                <TicketTagsEditor
                  ticketId={ticket.id}
                  tagsActuels={tagsActuels}
                  tousLesTags={tousLesTags}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
