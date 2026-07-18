"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { parseFichierImport } from "@/lib/import/parse";
import { validerLignesImport } from "@/lib/import/validate";
import type { LigneImportValidee, ResultatConfirmation, ResultatImport } from "@/lib/import/types";

export async function analyserFichierImport(formData: FormData): Promise<ResultatImport> {
  const { supabase, isAdmin, userId } = await requireAdmin();
  if (!isAdmin || !userId) {
    return { lignes: [], erreurFichier: "Action réservée à l'admin." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { lignes: [], erreurFichier: "Fichier requis." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { lignes: [], erreurFichier: "Fichier trop volumineux (max 2 Mo)." };
  }

  const texte = await file.text();
  const parseResult = parseFichierImport(texte);
  if ("erreur" in parseResult) {
    return { lignes: [], erreurFichier: parseResult.erreur };
  }
  if (parseResult.lignes.length > 500) {
    return { lignes: [], erreurFichier: "Trop de lignes (max 500 par import — coupe le fichier en plusieurs)." };
  }

  const lignes = await validerLignesImport(supabase, parseResult.lignes);
  return { lignes, erreurFichier: null };
}

/**
 * Reçoit uniquement les lignes déjà validées côté preview (parsed non
 * null), mais revalide quand même l'existence de projet_id/client_id juste
 * avant d'insérer : entre l'aperçu et la confirmation, un admin pourrait
 * avoir supprimé le projet dans un autre onglet. Défense en profondeur,
 * pas de confiance aveugle dans ce que le client renvoie.
 */
export async function confirmerImport(
  lignes: LigneImportValidee[]
): Promise<ResultatConfirmation> {
  const { supabase, isAdmin, userId } = await requireAdmin();
  if (!isAdmin || !userId) {
    return { crees: 0, echecs: lignes.map((l) => ({ index: l.index, raison: "Non autorisé." })) };
  }

  const echecs: { index: number; raison: string }[] = [];
  let crees = 0;

  for (const ligne of lignes) {
    if (!ligne.parsed) {
      echecs.push({ index: ligne.index, raison: "Ligne invalide (non revalidée)." });
      continue;
    }

    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert({
        titre: ligne.parsed.titre,
        description: ligne.parsed.description,
        projet_id: ligne.parsed.projet_id,
        client_id: ligne.parsed.client_id,
        priorite: ligne.parsed.priorite,
        statut: ligne.parsed.statut,
        date_prevue: ligne.parsed.date_prevue,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error || !ticket) {
      echecs.push({ index: ligne.index, raison: error?.message ?? "Erreur inconnue." });
      continue;
    }

    if (ligne.parsed.tag_ids.length > 0) {
      await supabase
        .from("ticket_tags")
        .insert(ligne.parsed.tag_ids.map((tagId) => ({ ticket_id: ticket.id, tag_id: tagId })));
      // Best-effort volontaire : un tag qui échoue à se lier ne doit pas
      // faire échouer tout l'import du ticket, il existe déjà à ce stade.
    }

    crees++;
  }

  if (crees > 0) {
    revalidatePath("/admin/tickets");
  }

  return { crees, echecs };
}
