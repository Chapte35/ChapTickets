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
