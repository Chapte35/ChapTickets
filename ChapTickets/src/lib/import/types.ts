import type { TicketPriorite, TicketStatut } from "@/lib/types";

/** Ligne brute telle qu'extraite du fichier, avant toute validation. */
export type LigneImportBrute = {
  titre?: string;
  description?: string;
  projet?: string;
  client_email?: string;
  priorite?: string;
  statut?: string;
  date_prevue?: string;
  tags?: string | string[];
};

/** Ligne après validation : soit exploitable (parsed rempli), soit en erreur. */
export type LigneImportValidee = {
  index: number;
  brute: LigneImportBrute;
  erreurs: string[];
  avertissements: string[];
  parsed: {
    titre: string;
    description: string | null;
    projet_id: string;
    projet_nom: string;
    client_id: string;
    client_label: string;
    priorite: TicketPriorite;
    statut: TicketStatut;
    date_prevue: string | null;
    tag_ids: string[];
    tag_labels: string[];
  } | null;
};

export type ResultatImport = {
  lignes: LigneImportValidee[];
  erreurFichier: string | null;
};

export type ResultatConfirmation = {
  crees: number;
  echecs: { index: number; raison: string }[];
};
