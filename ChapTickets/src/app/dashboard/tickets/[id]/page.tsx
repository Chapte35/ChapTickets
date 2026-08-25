import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  STATUTS_ELIGIBLES_REOUVERTURE,
  formatRefTicket,
  type TicketStatut,
  type TicketPriorite,
  type Tag,
  tagsVisiblesPourProjet,
} from "@/lib/types";
import { getAllTags } from "@/lib/queries/tags";
import { ReopenRequestButton } from "./reopen-request-button";
import { ValidationClientPanel } from "./validation-client-panel";
import { MessageThread, type MessageRow } from "@/components/message-thread";
import { TicketHistorique } from "@/components/ticket-historique";
import { TicketRelations, type TicketRelation } from "@/components/ticket-relations";
import { MarkTicketRead } from "@/components/mark-ticket-read";
import { BackButton } from "@/components/back-button";
import { RefClientDisplay } from "@/components/ref-client-display";
import { TicketDetailEditableClient } from "./ticket-detail-editable-client";
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
    { data: relationsRows },
  ] = await Promise.all([
    supabase
      .from("tickets_avec_rang")
      .select(
        "id, rang_projet, ref_client, titre, description, statut, priorite, created_at, date_prevue, ticket_origine_id, projet_id, assigne_a, created_by, projets(nom, code_court)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("demandes_reouverture")
      .select("statut, nouveau_ticket_id")
      .eq("ticket_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
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
    supabase
      .from("ticket_relations")
      .select("ticket_cible_id, tickets_avec_rang!ticket_relations_ticket_cible_id_fkey(id, rang_projet, titre, statut, priorite, projets(code_court))")
      .eq("ticket_id", id),
  ]);

  if (error || !ticket) notFound();

  const projet = ticket.projets as unknown as { nom: string; code_court: string | null } | null;
  const statut = ticket.statut as TicketStatut;
  const priorite = ticket.priorite as TicketPriorite;
  const refAffichee = formatRefTicket(ticket.rang_projet, projet?.code_court);
  const createdBy = (ticket as unknown as { created_by: string | null }).created_by;
  const estAuteur = !!user && createdBy === user.id;

  const relationsFormatees: TicketRelation[] = (relationsRows ?? []).map((r) => {
    const t = r.tickets_avec_rang as unknown as {
      id: string; rang_projet: number; titre: string;
      statut: string; priorite: string;
      projets: { code_court: string | null } | null;
    };
    return {
      id: t.id,
      rang_projet: t.rang_projet,
      titre: t.titre,
      statut: t.statut as TicketStatut,
      priorite: t.priorite as TicketPriorite,
      code_court: t.projets?.code_court ?? null,
      lien: `/dashboard/tickets/${t.id}`,
    };
  });
  const derniereDemande = demandes?.[0] ?? null;
  // Une fois une demande acceptée, ce ticket est remplacé par un nouveau —
  // pas la peine (et pas cohérent) de permettre une nouvelle demande dessus.
  const dejaRemplace = derniereDemande?.statut === "acceptee";
  const peutDemanderReouverture =
    STATUTS_ELIGIBLES_REOUVERTURE.includes(statut) && !dejaRemplace;

  // Requête séparée plutôt qu'une jointure auto-référencée (cf. fiche
  // admin pour le détail de pourquoi ce choix).
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

      {/* Même layout 2 colonnes que côté admin (cf. admin/tickets/[id]) :
          cohérence des deux fiches, et ça évite pareillement d'empiler
          toutes les metadata au-dessus d'une colonne étroite. */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6 min-w-0">
          <RefClientDisplay ticketId={ticket.id} refClient={ticket.ref_client} />

          {ticketOrigine && (
            <Link
              href={`/dashboard/tickets/${ticketOrigine.id}`}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 w-fit"
            >
              Fait suite à « {ticketOrigine.titre} » →
            </Link>
          )}

          <TicketDetailEditableClient
            ticketId={ticket.id}
            titre={ticket.titre}
            description={ticket.description ?? ""}
            priorite={priorite}
            statut={statut}
            projetNom={projet?.nom ?? null}
            dateEcheance={ticket.date_prevue}
            tags={tagsActuels}
            tousLesTags={tagsVisiblesPourProjet(tousLesTags, ticket.projet_id)}
            refAffichee={refAffichee}
            estAuteur={estAuteur}
          />

          <Card>
            <CardContent className="flex flex-col gap-6 pt-6">
              {dejaRemplace && derniereDemande?.nouveau_ticket_id && (
                <Link
                  href={`/dashboard/tickets/${derniereDemande.nouveau_ticket_id}`}
                  className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground w-fit"
                >
                  Réouverture acceptée — voir le nouveau ticket →
                </Link>
              )}

              <ChecklistPanel
                ticketId={ticket.id}
                items={(checklist ?? []) as unknown as ChecklistItemRow[]}
              />

              <AttachmentsPanel ticketId={ticket.id} attachments={attachments} />

              {/* Validation client : affiché si le ticket est en attente de retour */}
              {statut === "en_attente_client" && (
                <div className="flex flex-col gap-1.5 border-t pt-4">
                  <ValidationClientPanel
                    ticketId={ticket.id}
                    demandeEnCours={derniereDemande}
                  />
                </div>
              )}

              {/* Réouverture classique : pour les tickets déjà résolus/fermés */}
              {peutDemanderReouverture && (
                <div className="flex flex-col gap-1.5 border-t pt-4">
                  <ReopenRequestButton
                    ticketId={ticket.id}
                    demandeEnCours={derniereDemande}
                  />
                </div>
              )}

              {user && (
                <MessageThread
                  context={{ field: "ticket_id", value: ticket.id }}
                  messages={(messages ?? []) as unknown as MessageRow[]}
                  currentUserId={user.id}
                  action={postMessageClient}
                />
              )}

              <TicketRelations
                ticketId={ticket.id}
                relationsInitiales={relationsFormatees}
              />

              <TicketHistorique ticketId={ticket.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
