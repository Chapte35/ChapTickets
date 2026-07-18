-- =============================================================================
-- Sprint 8 — Calendrier & releases
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Releases — jalons par projet. L'appartenance d'un ticket à une release
--    n'est PAS stockée : elle se calcule à la demande (tickets créés entre
--    la release précédente et celle-ci, cf. src/lib/queries/releases.ts).
--    Décision explicite : pas de table de jointure, la fenêtre temporelle
--    suffit et évite un champ de plus à maintenir manuellement.
-- -----------------------------------------------------------------------------
create table public.releases (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  nom text not null,
  date date not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.releases enable row level security;

create policy "admin_full_access_releases"
  on public.releases for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "client_read_own_releases"
  on public.releases for select
  using (
    exists (
      select 1 from public.client_projets cp
      where cp.projet_id = releases.projet_id and cp.client_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 2. Échéance de ticket (pour le calendrier) — distinct de la logique de
--    release, purement "à quelle date ce ticket est-il prévu".
-- -----------------------------------------------------------------------------
alter table public.tickets add column date_prevue date;

-- -----------------------------------------------------------------------------
-- 3. Réouverture -> nouveau ticket lié (au lieu de réutiliser l'ancien)
-- -----------------------------------------------------------------------------
-- Un ticket rouvert devient un NOUVEAU ticket référençant l'original, pour
-- qu'un ticket n'appartienne jamais qu'à une seule release (celle de sa
-- vraie date de création). L'original reste résolu/fermé indéfiniment,
-- comme trace historique.
alter table public.tickets
  add column ticket_origine_id uuid references public.tickets(id) on delete set null;

comment on column public.tickets.ticket_origine_id is
  'Rempli uniquement quand ce ticket est né d''une réouverture acceptée sur un autre ticket (cf. traiterDemandeReouverture). Null sinon.';

-- Trace, sur la demande elle-même, quel nouveau ticket en a résulté une
-- fois acceptée (utile pour l'affichage : "réouverture acceptée -> voir ce ticket").
alter table public.demandes_reouverture
  add column nouveau_ticket_id uuid references public.tickets(id) on delete set null;
