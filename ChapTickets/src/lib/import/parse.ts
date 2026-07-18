import Papa from "papaparse";
import type { LigneImportBrute } from "./types";

/**
 * Détecte le format par le contenu plutôt que par l'extension du fichier —
 * plus fiable si quelqu'un renomme un .json en .csv par erreur, et évite
 * de faire confiance à un détail que l'utilisateur contrôle sans le savoir.
 */
export function parseFichierImport(
  texte: string
): { lignes: LigneImportBrute[] } | { erreur: string } {
  const contenu = texte.trim();
  if (!contenu) return { erreur: "Fichier vide." };

  if (contenu.startsWith("[") || contenu.startsWith("{")) {
    return parseJson(contenu);
  }
  return parseCsv(contenu);
}

function parseJson(contenu: string): { lignes: LigneImportBrute[] } | { erreur: string } {
  let data: unknown;
  try {
    data = JSON.parse(contenu);
  } catch (e) {
    return { erreur: `JSON invalide : ${e instanceof Error ? e.message : "erreur de parsing"}` };
  }

  const tableau = Array.isArray(data) ? data : [data];
  if (tableau.length === 0) return { erreur: "Le fichier ne contient aucune ligne." };

  const lignes: LigneImportBrute[] = tableau.map((item) => {
    if (typeof item !== "object" || item === null) return {};
    const o = item as Record<string, unknown>;
    return {
      titre: typeof o.titre === "string" ? o.titre : undefined,
      description: typeof o.description === "string" ? o.description : undefined,
      projet: typeof o.projet === "string" ? o.projet : undefined,
      client_email: typeof o.client_email === "string" ? o.client_email : undefined,
      priorite: typeof o.priorite === "string" ? o.priorite : undefined,
      statut: typeof o.statut === "string" ? o.statut : undefined,
      date_prevue: typeof o.date_prevue === "string" ? o.date_prevue : undefined,
      tags: Array.isArray(o.tags)
        ? (o.tags as unknown[]).filter((t): t is string => typeof t === "string")
        : typeof o.tags === "string"
          ? o.tags
          : undefined,
    };
  });

  return { lignes };
}

function parseCsv(contenu: string): { lignes: LigneImportBrute[] } | { erreur: string } {
  const resultat = Papa.parse<Record<string, string>>(contenu, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (resultat.errors.length > 0) {
    return { erreur: `Erreur CSV : ${resultat.errors[0].message} (ligne ${resultat.errors[0].row ?? "?"})` };
  }
  if (resultat.data.length === 0) {
    return { erreur: "Le fichier ne contient aucune ligne." };
  }

  const lignes: LigneImportBrute[] = resultat.data.map((row) => ({
    titre: row.titre?.trim(),
    description: row.description?.trim(),
    projet: row.projet?.trim(),
    client_email: row.client_email?.trim(),
    priorite: row.priorite?.trim(),
    statut: row.statut?.trim(),
    date_prevue: row.date_prevue?.trim(),
    // Séparateur "|" plutôt que "," pour les tags : la virgule est déjà le
    // séparateur de colonnes CSV, l'utiliser aussi pour les tags dans une
    // cellule forcerait à jongler avec des guillemets pour rien.
    tags: row.tags?.trim() || undefined,
  }));

  return { lignes };
}
