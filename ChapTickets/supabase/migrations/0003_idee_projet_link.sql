-- =============================================================================
-- Sprint 4 — Lien optionnel idée -> projet
-- =============================================================================
-- Décision explicite : idées et projets ne sont PAS obligatoirement liés.
-- Un projet peut exister sans être issu d'une idée (créé directement), et
-- une idée peut rester une idée indéfiniment sans jamais devenir un projet.
-- Cette colonne sert uniquement de traçabilité optionnelle : "cette idée a
-- donné naissance à ce projet", rien de plus. `on delete set null` : si le
-- projet est supprimé un jour, l'idée redevient "non transformée" plutôt
-- que de disparaître avec lui.
-- =============================================================================

alter table public.idees_projets
  add column projet_id uuid references public.projets(id) on delete set null;

comment on column public.idees_projets.projet_id is
  'Optionnel. Rempli uniquement si cette idée a été transformée en projet via /admin/idees. Ne conditionne rien côté RLS ni côté logique métier.';
