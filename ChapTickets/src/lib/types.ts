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

/**
 * Classes de fond littérales pour les mini barres de répartition (cartes
 * kanban projet). Même contrainte Tailwind JIT que TAG_COLOR_CLASSES :
 * il faut les noms de classes complets dans le source.
 */
export const TICKET_STATUT_BAR_COLORS: Record<TicketStatut, string> = {
  ouvert: "bg-blue-500",
  en_cours: "bg-amber-500",
  en_attente_client: "bg-purple-500",
  resolu: "bg-green-500",
  ferme: "bg-gray-400",
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

export const IDEE_STATUTS: readonly IdeeProjetStatut[] = [
  "idee",
  "a_explorer",
  "valide",
  "abandonne",
] as const;

export const IDEE_STATUT_LABELS: Record<IdeeProjetStatut, string> = {
  idee: "Idée",
  a_explorer: "À explorer",
  valide: "Validée",
  abandonne: "Abandonnée",
};

export function ideeStatutBadgeVariant(
  statut: IdeeProjetStatut
): "default" | "secondary" | "outline" | "destructive" {
  switch (statut) {
    case "idee":
      return "outline";
    case "a_explorer":
      return "secondary";
    case "valide":
      return "default";
    case "abandonne":
      return "destructive";
  }
}

/**
 * Statuts de projet, cf. supabase/migrations/0004_projet_statut_constraint.sql.
 * L'ORDRE ici définit l'ordre des colonnes du kanban (/admin/projets) — pas
 * juste une liste de valeurs, un contrat visuel.
 */
export type ProjetStatut = "a_demarrer" | "en_cours" | "en_pause" | "termine";

export const PROJET_STATUTS: readonly ProjetStatut[] = [
  "a_demarrer",
  "en_cours",
  "en_pause",
  "termine",
] as const;

export const PROJET_STATUT_LABELS: Record<ProjetStatut, string> = {
  a_demarrer: "À démarrer",
  en_cours: "En cours",
  en_pause: "En pause",
  termine: "Terminé",
};

/**
 * Palette fixe plutôt qu'un hex libre : Tailwind (JIT) a besoin de voir les
 * noms de classes complets et littéraux dans le code source pour les
 * générer — impossible de construire `bg-${couleur}-500` dynamiquement.
 * Cette map EST la liste des classes réellement utilisées.
 */
export const TAG_COLORS = [
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "pink",
  "gray",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export const TAG_COLOR_CLASSES: Record<TagColor, string> = {
  red: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  green: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  teal: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  indigo: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  purple: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  pink: "bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/30",
  gray: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
};

export type Tag = {
  id: string;
  nom: string;
  couleur: TagColor;
};
