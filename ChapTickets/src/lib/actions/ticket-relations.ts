"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { requireClient } from "@/lib/auth/guards";

export type FormState = { error: string | null };

/**
 * Ajoute une relation entre deux tickets (admin ou client).
 * Le trigger DB crée automatiquement la relation inverse.
 */
export async function ajouterRelation(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const ticketId = formData.get("ticket_id");
  const cibleId = formData.get("ticket_cible_id");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };
  if (typeof cibleId !== "string" || !cibleId) return { error: "Ticket cible invalide." };
  if (ticketId === cibleId) return { error: "Un ticket ne peut pas être lié à lui-même." };

  // Tente admin d'abord, sinon client
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  let userId: string | null = null;

  const adminResult = await requireAdmin();
  if (adminResult.isAdmin) {
    supabase = adminResult.supabase;
    userId = adminResult.userId ?? null;
  } else {
    const clientResult = await requireClient();
    if (!clientResult.isClient) return { error: "Non autorisé." };
    supabase = clientResult.supabase;
    userId = clientResult.userId ?? null;
  }

  const { error } = await supabase.from("ticket_relations").insert({
    ticket_id: ticketId,
    ticket_cible_id: cibleId,
    type: "en_relation_avec",
    created_by: userId,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ces tickets sont déjà liés." };
    return { error: `Erreur : ${error.message}` };
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { error: null };
}

/**
 * Supprime une relation (les deux sens supprimés par le trigger).
 */
export async function supprimerRelation(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const ticketId = formData.get("ticket_id");
  const cibleId = formData.get("ticket_cible_id");

  if (typeof ticketId !== "string" || !ticketId) return { error: "Ticket invalide." };
  if (typeof cibleId !== "string" || !cibleId) return { error: "Ticket cible invalide." };

  const adminResult = await requireAdmin();
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];

  if (adminResult.isAdmin) {
    supabase = adminResult.supabase;
  } else {
    const clientResult = await requireClient();
    if (!clientResult.isClient) return { error: "Non autorisé." };
    supabase = clientResult.supabase;
  }

  const { error } = await supabase
    .from("ticket_relations")
    .delete()
    .eq("ticket_id", ticketId)
    .eq("ticket_cible_id", cibleId);

  if (error) return { error: `Erreur : ${error.message}` };

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  return { error: null };
}

/**
 * Recherche de tickets par ref (ex: CHAP#12) ou titre — pour le picker.
 * Exclut le ticket courant et ceux déjà liés.
 *
 * IMPORTANT : on évite le filtre PostgREST sur les colonnes de join embed
 * (projets.code_court) car PostgREST filtre silencieusement les lignes
 * sans match au lieu de ne filtrer que le join — on fait deux queries
 * séparées à la place.
 */
export async function rechercherTicketsPourRelation(
  ticketId: string,
  query: string
): Promise<Array<{ id: string; rang_projet: number; titre: string; code_court: string | null }>> {
  if (!query.trim()) return [];

  const adminResult = await requireAdmin();
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];

  if (adminResult.isAdmin) {
    supabase = adminResult.supabase;
  } else {
    const clientResult = await requireClient();
    if (!clientResult.isClient) return [];
    supabase = clientResult.supabase;
  }

  // Récupère les IDs déjà liés pour les exclure
  const { data: dejaLies } = await supabase
    .from("ticket_relations")
    .select("ticket_cible_id")
    .eq("ticket_id", ticketId);

  const exclus = new Set<string>([ticketId, ...(dejaLies ?? []).map((r) => r.ticket_cible_id)]);
  const exclusFilter = `(${[...exclus].join(",")})`;

  function mapResult(t: unknown): { id: string; rang_projet: number; titre: string; code_court: string | null } {
    const row = t as { id: string; rang_projet: number; titre: string; projets: unknown };
    return {
      id: row.id,
      rang_projet: row.rang_projet,
      titre: row.titre,
      code_court: (row.projets as { code_court: string | null } | null)?.code_court ?? null,
    };
  }

  const resultats: Array<{ id: string; rang_projet: number; titre: string; code_court: string | null }> = [];

  // 1. Recherche par ref formatée (ex: "CHAP#12", "CHAP", "CHAP12")
  // On fait la résolution du code_court EN AMONT pour éviter le bug PostgREST.
  const qUpper = query.trim().toUpperCase();
  const refMatch = qUpper.match(/^([A-Z]+)#?(\d*)$/);

  if (refMatch) {
    const [, codeCourt, rang] = refMatch;

    // Récupérer d'abord les projet_ids dont le code_court match
    const { data: projetsMatch } = await supabase
      .from("projets")
      .select("id")
      .ilike("code_court", `${codeCourt}%`);

    const projetIds = (projetsMatch ?? []).map((p) => p.id);

    if (projetIds.length > 0) {
      let refQuery = supabase
        .from("tickets_avec_rang")
        .select("id, rang_projet, titre, projets(code_court)")
        .not("id", "in", exclusFilter)
        .in("projet_id", projetIds);

      if (rang) refQuery = refQuery.eq("rang_projet", parseInt(rang));

      const { data: parRef } = await refQuery.limit(8);
      for (const t of parRef ?? []) {
        const r = mapResult(t);
        if (!exclus.has(r.id)) {
          exclus.add(r.id);
          resultats.push(r);
        }
      }
    }
  }

  // 2. Recherche par titre (ilike) si pas encore assez de résultats
  if (resultats.length < 8) {
    const currentExclus = `(${[...exclus].join(",")})`;
    const titreSafe = query.replace(/#/g, "\\#");
    const { data: parTitre } = await supabase
      .from("tickets_avec_rang")
      .select("id, rang_projet, titre, projets(code_court)")
      .not("id", "in", currentExclus)
      .ilike("titre", `%${titreSafe}%`)
      .limit(8 - resultats.length);

    for (const t of parTitre ?? []) {
      const r = mapResult(t);
      if (!exclus.has(r.id)) {
        exclus.add(r.id);
        resultats.push(r);
      }
    }
  }

  // 3. Recherche par numéro pur (ex: "12" → rang_projet = 12)
  const numMatch = query.trim().match(/^\d+$/);
  if (numMatch && resultats.length < 8) {
    const rang = parseInt(query.trim());
    const currentExclus = `(${[...exclus].join(",")})`;
    const { data: parNum } = await supabase
      .from("tickets_avec_rang")
      .select("id, rang_projet, titre, projets(code_court)")
      .not("id", "in", currentExclus)
      .eq("rang_projet", rang)
      .limit(8 - resultats.length);

    for (const t of parNum ?? []) {
      const r = mapResult(t);
      if (!exclus.has(r.id)) {
        exclus.add(r.id);
        resultats.push(r);
      }
    }
  }

  return resultats.slice(0, 8);
}
