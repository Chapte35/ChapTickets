/**
 * Types reflétant les contraintes `check` définies dans
 * supabase/migrations/0001_init.sql. Garder ce fichier synchronisé avec le
 * SQL à chaque migration qui touche ces colonnes.
 */

export type Role = "admin" | "client";

export type TicketStatut =
  | "ouvert"
  | "en_cours"
  | "en_attente_client"
  | "resolu"
  | "ferme";

export type TicketPriorite = "basse" | "normale" | "haute" | "urgente";

export type IdeeProjetStatut = "idee" | "a_explorer" | "valide" | "abandonne";

export const TICKET_STATUTS: readonly TicketStatut[] = [
  "ouvert",
  "en_cours",
  "en_attente_client",
  "resolu",
  "ferme",
] as const;

export const TICKET_PRIORITES: readonly TicketPriorite[] = [
  "basse",
  "normale",
  "haute",
  "urgente",
] as const;

// Labels FR pour l'affichage — évite de reformater les valeurs de la DB
// (snake_case) directement dans chaque composant qui les affiche.
export const TICKET_STATUT_LABELS: Record<TicketStatut, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  en_attente_client: "En attente client",
  resolu: "Résolu",
  ferme: "Fermé",
};

export const TICKET_PRIORITE_LABELS: Record<TicketPriorite, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

// Un client ne peut demander une réouverture que si le ticket est dans un
// de ces statuts (cf. policy `client_create_demande_reouverture`, à garder
// synchronisée avec supabase/migrations/0002_reopen_requests.sql).
export const STATUTS_ELIGIBLES_REOUVERTURE: readonly TicketStatut[] = [
  "resolu",
  "ferme",
];

export type DemandeReouvertureStatut = "en_attente" | "acceptee" | "refusee";

export const DEMANDE_REOUVERTURE_STATUT_LABELS: Record<
  DemandeReouvertureStatut,
  string
> = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  refusee: "Refusée",
};

/**
 * Mapping statut -> variante de <Badge>, centralisé ici pour que la couleur
 * d'un statut de ticket soit cohérente partout dans l'app (liste, détail,
 * dashboard) sans dupliquer un switch dans chaque composant.
 */
export function ticketStatutBadgeVariant(
  statut: TicketStatut
): "default" | "secondary" | "outline" | "destructive" {
  switch (statut) {
    case "ouvert":
      return "default";
    case "en_cours":
      return "secondary";
    case "en_attente_client":
      return "outline";
    case "resolu":
    case "ferme":
      return "outline";
  }
}

export function ticketPrioriteBadgeVariant(
  priorite: TicketPriorite
): "default" | "secondary" | "outline" | "destructive" {
  return priorite === "urgente" ? "destructive" : "outline";
}
