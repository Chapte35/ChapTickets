import { createClient } from "@/lib/supabase/server";
import { DemandesReouvertureClientView } from "./demandes-reouverture-client-view";

export type DemandeClient = {
  id: string;
  message: string | null;
  statut: "en_attente" | "acceptee" | "refusee";
  created_at: string;
  traitee_at: string | null;
  acknowledged_at: string | null;
  commentaire_refus: string | null;
  nouveau_ticket_id: string | null;
  ticket_id: string;
  tickets: {
    titre: string;
    rang_projet: number;
    projets: { nom: string; code_court: string | null } | null;
  } | null;
};

export default async function DemandesReouvertureClientPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Requête 1 : demandes sans join pour éviter l'ambiguïté FK PostgREST
  const { data: demandesRaw } = await supabase
    .from("demandes_reouverture")
    .select("id, message, statut, created_at, traitee_at, acknowledged_at, commentaire_refus, nouveau_ticket_id, ticket_id")
    .eq("demande_par", user.id)
    .order("created_at", { ascending: false });

  const demandes = demandesRaw ?? [];
  if (demandes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">Mes demandes de réouverture</h1>
        <DemandesReouvertureClientView demandes={[]} />
      </div>
    );
  }

  // Requête 2 : tickets concernés
  const ticketIds = [...new Set(demandes.map((d) => d.ticket_id))];
  const { data: ticketsRaw } = await supabase
    .from("tickets_avec_rang")
    .select("id, rang_projet, titre, projets(nom, code_court)")
    .in("id", ticketIds);

  const ticketsMap = new Map(
    (ticketsRaw ?? []).map((t) => [
      t.id,
      {
        titre: t.titre as string,
        rang_projet: t.rang_projet as number,
        projets: (Array.isArray(t.projets) ? t.projets[0] : t.projets) as {
          nom: string;
          code_court: string | null;
        } | null,
      },
    ])
  );

  const demandesEnrichies: DemandeClient[] = demandes.map((d) => ({
    id: d.id,
    message: d.message,
    statut: d.statut as DemandeClient["statut"],
    created_at: d.created_at,
    traitee_at: d.traitee_at,
    acknowledged_at: (d as unknown as { acknowledged_at: string | null }).acknowledged_at ?? null,
    commentaire_refus: (d as unknown as { commentaire_refus: string | null }).commentaire_refus ?? null,
    nouveau_ticket_id: d.nouveau_ticket_id,
    ticket_id: d.ticket_id,
    tickets: ticketsMap.get(d.ticket_id) ?? null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Mes demandes de réouverture</h1>
      <DemandesReouvertureClientView demandes={demandesEnrichies} />
    </div>
  );
}
