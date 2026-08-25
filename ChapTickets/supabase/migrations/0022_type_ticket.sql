-- =============================================================================
-- Migration 0022 : type_ticket sur les tickets
-- Nullable (pas de valeur par défaut forcée — 141 tickets existants restent
-- sans type, on les catégorise via le bulk assign).
-- =============================================================================

alter table public.tickets
  add column if not exists type_ticket text
  check (type_ticket in ('epic', 'feature_fonctionnelle', 'feature_technique', 'bug', 'etude'));

-- Autoriser le client à modifier type_ticket (on le laisse hors de la liste
-- bloquée dans le trigger). La fonction du trigger est recréée pour inclure
-- type_ticket dans les champs libres (titre, description, ref_client,
-- updated_at, priorite-si-auteur, statut-si-en_attente_client→resolu).
-- Pas de modification du trigger nécessaire : type_ticket n'est pas dans la
-- liste des champs bloqués → autorisé par défaut pour le client.
