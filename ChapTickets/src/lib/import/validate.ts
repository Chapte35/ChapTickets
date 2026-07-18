import type { SupabaseClient } from "@supabase/supabase-js";
import { TICKET_PRIORITES, TICKET_STATUTS, type TicketPriorite, type TicketStatut } from "@/lib/types";
import type { LigneImportBrute, LigneImportValidee } from "./types";

type Referentiels = {
  projetsParNom: Map<string, { id: string; nom: string }>;
  clientsParEmail: Map<string, { id: string; label: string }>;
  clientProjetIds: Set<string>; // "clientId:projetId"
  tagsParNom: Map<string, { id: string; nom: string }>;
};

async function chargerReferentiels(supabase: SupabaseClient): Promise<Referentiels> {
  const [{ data: projets }, { data: clients }, { data: liens }, { data: tags }] =
    await Promise.all([
      supabase.from("projets").select("id, nom"),
      supabase.from("profiles").select("id, email, full_name").eq("role", "client"),
      supabase.from("client_projets").select("client_id, projet_id"),
      supabase.from("tags").select("id, nom"),
    ]);

  return {
    projetsParNom: new Map(
      (projets ?? []).map((p) => [p.nom.trim().toLowerCase(), { id: p.id, nom: p.nom }])
    ),
    clientsParEmail: new Map(
      (clients ?? []).map((c) => [
        (c.email ?? "").trim().toLowerCase(),
        { id: c.id, label: c.full_name || c.email || c.id },
      ])
    ),
    clientProjetIds: new Set((liens ?? []).map((l) => `${l.client_id}:${l.projet_id}`)),
    tagsParNom: new Map((tags ?? []).map((t) => [t.nom.trim().toLowerCase(), { id: t.id, nom: t.nom }])),
  };
}

function validerLigne(
  index: number,
  brute: LigneImportBrute,
  ref: Referentiels
): LigneImportValidee {
  const erreurs: string[] = [];
  const avertissements: string[] = [];

  const titre = brute.titre?.trim();
  if (!titre) erreurs.push("Titre manquant.");

  let projetTrouve: { id: string; nom: string } | undefined;
  const projetNom = brute.projet?.trim();
  if (!projetNom) {
    erreurs.push("Projet manquant.");
  } else {
    projetTrouve = ref.projetsParNom.get(projetNom.toLowerCase());
    if (!projetTrouve) erreurs.push(`Projet introuvable : "${projetNom}".`);
  }

  let clientTrouve: { id: string; label: string } | undefined;
  const clientEmail = brute.client_email?.trim();
  if (!clientEmail) {
    erreurs.push("Email client manquant.");
  } else {
    clientTrouve = ref.clientsParEmail.get(clientEmail.toLowerCase());
    if (!clientTrouve) erreurs.push(`Client introuvable : "${clientEmail}".`);
  }

  if (projetTrouve && clientTrouve) {
    const lien = `${clientTrouve.id}:${projetTrouve.id}`;
    if (!ref.clientProjetIds.has(lien)) {
      erreurs.push(
        `Le client "${clientEmail}" n'est pas rattaché au projet "${projetNom}" (rattache-le d'abord, ou corrige la ligne).`
      );
    }
  }

  let priorite: TicketPriorite = "normale";
  const prioriteBrute = brute.priorite?.trim().toLowerCase();
  if (prioriteBrute) {
    if (TICKET_PRIORITES.includes(prioriteBrute as TicketPriorite)) {
      priorite = prioriteBrute as TicketPriorite;
    } else {
      erreurs.push(`Priorité invalide : "${brute.priorite}" (attendu : ${TICKET_PRIORITES.join(", ")}).`);
    }
  }

  let statut: TicketStatut = "ouvert";
  const statutBrut = brute.statut?.trim().toLowerCase();
  if (statutBrut) {
    if (TICKET_STATUTS.includes(statutBrut as TicketStatut)) {
      statut = statutBrut as TicketStatut;
    } else {
      erreurs.push(`Statut invalide : "${brute.statut}" (attendu : ${TICKET_STATUTS.join(", ")}).`);
    }
  }

  let datePrevue: string | null = null;
  if (brute.date_prevue?.trim()) {
    const d = brute.date_prevue.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      datePrevue = d;
    } else {
      erreurs.push(`Date invalide : "${d}" (format attendu : AAAA-MM-JJ).`);
    }
  }

  const tagIds: string[] = [];
  const tagLabels: string[] = [];
  const tagsBrutsListe = Array.isArray(brute.tags)
    ? brute.tags
    : brute.tags
      ? brute.tags.split("|")
      : [];
  for (const nomBrut of tagsBrutsListe) {
    const nom = nomBrut.trim();
    if (!nom) continue;
    const trouve = ref.tagsParNom.get(nom.toLowerCase());
    if (trouve) {
      tagIds.push(trouve.id);
      tagLabels.push(trouve.nom);
    } else {
      // Avertissement, pas une erreur : un tag inconnu ne doit pas bloquer
      // la création du ticket, juste être ignoré (et signalé).
      avertissements.push(`Tag inconnu ignoré : "${nom}".`);
    }
  }

  const parsed =
    erreurs.length === 0 && titre && projetTrouve && clientTrouve
      ? {
          titre,
          description: brute.description?.trim() || null,
          projet_id: projetTrouve.id,
          projet_nom: projetTrouve.nom,
          client_id: clientTrouve.id,
          client_label: clientTrouve.label,
          priorite,
          statut,
          date_prevue: datePrevue,
          tag_ids: tagIds,
          tag_labels: tagLabels,
        }
      : null;

  return { index, brute, erreurs, avertissements, parsed };
}

export async function validerLignesImport(
  supabase: SupabaseClient,
  lignesBrutes: LigneImportBrute[]
): Promise<LigneImportValidee[]> {
  const ref = await chargerReferentiels(supabase);
  return lignesBrutes.map((brute, i) => validerLigne(i, brute, ref));
}
