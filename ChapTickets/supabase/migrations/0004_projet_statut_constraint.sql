-- =============================================================================
-- Sprint 5 — Statuts de projet (pour le kanban)
-- =============================================================================
-- `projets.statut` était un texte libre sans contrainte depuis la migration
-- 0001 (juste un défaut 'en_cours'). Le kanban a besoin de colonnes fixes :
-- on verrouille maintenant les valeurs possibles. 'en_cours' reste une
-- valeur valide donc les projets de test existants ne sont pas cassés.
-- =============================================================================

alter table public.projets
  add constraint projets_statut_check
  check (statut in ('a_demarrer', 'en_cours', 'en_pause', 'termine'));
