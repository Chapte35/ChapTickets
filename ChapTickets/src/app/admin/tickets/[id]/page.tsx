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
  tagsVisiblesPourProjet,
  formatRefTicket,
} from "@/lib/types";
import { getAllTags } from "@/lib/queries/tags";
import { getTousLesProfils } from "@/lib/queries/tickets";
import { StatusUpdateForm } from "./status-update-form";
import { DateEcheanceForm } from "./date-echeance-form";
import { AssigneAForm } from "./assigne-a-form";
import {
  ReopenRequestsPanel,
  type DemandeReouverture,
} from "./reopen-requests-panel";
import { MessageThread, type MessageRow } from "@/components/message-thread";
import { MarkTicketRead } from "@/components/mark-ticket-read";
import { BackButton } from "@/components/back-button";
import { RefClientDisplay } from "@/components/ref-client-display";
import { TicketDetailEditable } from "./ticket-detail-editable";
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
    profils,
  ] = await Promise.all([
    supabase
      .from("tickets_avec_rang")
      .select(
        "id, rang_projet, ref_client, titre, description, statut, priorite, created_at, date_prevue, ticket_origine_id, projet_id, assigne_a, projets(nom, code_court), profiles:profiles!tickets_client_id_fkey(email, full_name)"
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
    supabase.from("ticket_tags").select("tags(id, nom, couleur, projet_id)").eq("ticket_id", id),
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
    getTousLesProfils(supabase),
  ]);

  if (error || !ticket) notFound();

  // Clients rattachés au projet — fetchés après avoir le ticket pour avoir projet_id
  const { data: clientsDuProjetRows } = await supabase
    .from("client_projets")
    .select("profiles(id, email, full_name)")
    .eq("projet_id", ticket.projet_id);

  const clientsDuProjet = (clientsDuProjetRows ?? [])
    .map((r) => r.profiles as unknown as { id: string; email: string | null; full_name: string | null } | null)
    .filter((c): c is { id: string; email: string | null; full_name: string | null } => c !== null);

  const projet = ticket.projets as unknown as { nom: string; code_court: string | null } | null;
  const client = ticket.profiles as unknown as {
    email: string | null;
    full_name: string | null;
  } | null;
  const statut = ticket.statut as TicketStatut;
  const priorite = ticket.priorite as TicketPriorite;
  const assigneAId = (ticket as unknown as { assigne_a: string | null }).assigne_a;

  const refAffichee = formatRefTicket(ticket.rang_projet, projet?.code_court);

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

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6 min-w-0">
          <RefClientDisplay ticketId={ticket.id} refClient={ticket.ref_client} />

          {ticketOrigine && (
            <Link
              href={`/admin/tickets/${ticketOrigine.id}`}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 w-fit"
            >
              Fait suite à « {ticketOrigine.titre} » →
            </Link>
          )}

          <TicketDetailEditable
            ticketId={ticket.id}
            titre={ticket.titre}
            description={ticket.description ?? ""}
            priorite={priorite}
            statut={statut}
            projetNom={projet?.nom ?? null}
            clientNom={client?.full_name || client?.email || null}
            dateEcheance={ticket.date_prevue}
            tags={tagsActuels}
            tousLesTags={tagsVisiblesPourProjet(tousLesTags, ticket.projet_id)}
            refAffichee={refAffichee}
            clientsDuProjet={clientsDuProjet}
            clientIdActuel={(ticket as unknown as { client_id: string | null }).client_id}
          />

          <Card>
            <CardContent className="flex flex-col gap-6 pt-6">
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
                <span className="text-xs text-muted-foreground">Assigné à</span>
                <AssigneAForm
                  ticketId={ticket.id}
                  assigneAId={assigneAId}
                  profils={profils}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Échéance</span>
                <DateEcheanceForm ticketId={ticket.id} dateActuelle={ticket.date_prevue} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
