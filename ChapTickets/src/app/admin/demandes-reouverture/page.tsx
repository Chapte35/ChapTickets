import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DemandesReouvertureAdminClient } from "./demandes-reouverture-admin-client";

export type DemandeAdmin = {
  id: string;
  message: string | null;
  statut: "en_attente" | "acceptee" | "refusee";
  created_at: string;
  traitee_at: string | null;
  commentaire_refus: string | null;
  nouveau_ticket_id: string | null;
  ticket_id: string;
  tickets: {
    titre: string;
    rang_projet: number;
    projet_id: string;
    projets: { nom: string; code_court: string | null } | null;
  } | null;
  profiles: { full_name: string | null; email: string | null } | null;
};

export default async function DemandesReouvertureAdminPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const projetId = cookieStore.get("chaptickets_selected_projet_id")?.value ?? null;

  // Requête 1 : demandes seules — pas de join pour éviter l'ambiguïté FK
  const { data: demandesRaw, error } = await supabase
    .from("demandes_reouverture")
    .select("id, message, statut, created_at, traitee_at, commentaire_refus, nouveau_ticket_id, ticket_id, demande_par")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[DemandesAdmin] erreur fetch:", error);
  }

  const demandes = demandesRaw ?? [];
  if (demandes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">Demandes de réouverture</h1>
        <DemandesReouvertureAdminClient demandes={[]} />
      </div>
    );
  }

  // Requête 2 : tickets concernés
  const ticketIds = [...new Set(demandes.map((d) => d.ticket_id))];
  const { data: ticketsRaw } = await supabase
    .from("tickets_avec_rang")
    .select("id, rang_projet, titre, projet_id, projets(nom, code_court)")
    .in("id", ticketIds);

  const ticketsMap = new Map(
    (ticketsRaw ?? []).map((t) => [
      t.id,
      {
        titre: t.titre as string,
        rang_projet: t.rang_projet as number,
        projet_id: t.projet_id as string,
        projets: (Array.isArray(t.projets) ? t.projets[0] : t.projets) as { nom: string; code_court: string | null } | null,
      },
    ])
  );

  // Requête 3 : profils des demandeurs
  const demandeurIds = [...new Set(demandes.map((d) => d.demande_par).filter(Boolean))];
  const { data: profilsRaw } = demandeurIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", demandeurIds)
    : { data: [] };

  const profilsMap = new Map(
    (profilsRaw ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }])
  );

  // Assemblage
  const demandesEnrichies: DemandeAdmin[] = demandes.map((d) => ({
    id: d.id,
    message: d.message,
    statut: d.statut as DemandeAdmin["statut"],
    created_at: d.created_at,
    traitee_at: d.traitee_at,
    commentaire_refus: d.commentaire_refus ?? null,
    nouveau_ticket_id: d.nouveau_ticket_id,
    ticket_id: d.ticket_id,
    tickets: ticketsMap.get(d.ticket_id) ?? null,
    profiles: profilsMap.get(d.demande_par) ?? null,
  }));

  // Filtre projet côté JS
  const demandesFiltrees = projetId
    ? demandesEnrichies.filter((d) => d.tickets?.projet_id === projetId)
    : demandesEnrichies;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Demandes de réouverture</h1>
      <DemandesReouvertureAdminClient demandes={demandesFiltrees} />
    </div>
  );
}
