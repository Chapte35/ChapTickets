-- =============================================================================
-- Sprint 12 — Assignation explicite ticket <-> release
-- =============================================================================
-- Remplace le calcul par plage de dates (cf. commentaire d'origine dans
-- 0008_calendrier_releases.sql) par une vraie colonne stockée : décision
-- prise en clarification sprint 12, l'assignation automatique par date ne
-- fonctionnait pas correctement en pratique. Un ticket appartient à au plus
-- une release, choisie explicitement à la création de la release (ou plus
-- tard, cf. UI du formulaire de release) plutôt que déduite de sa date de
-- création.
-- =============================================================================

alter table public.tickets
  add column release_id uuid references public.releases(id) on delete set null;

comment on column public.tickets.release_id is
  'Assignation explicite, choisie dans le formulaire de création de release (tickets sans release proposés au choix). Remplace l''ancien calcul par plage de dates. Null = pas encore assigné à une release.';

create index tickets_release_id_idx on public.tickets (release_id);
