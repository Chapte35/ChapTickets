-- =============================================================================
-- Sprint 10 — Sprints
-- =============================================================================
-- Un sprint est un conteneur de tickets rattaché à un projet, avec une date
-- de début obligatoire et une date de fin remplie manuellement lors de la
-- clôture (pas automatique : la clôture crée une release et demande la
-- version). Un ticket peut exister sans sprint (nullable).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table sprints
-- -----------------------------------------------------------------------------
create table public.sprints (
  id          uuid primary key default gen_random_uuid(),
  projet_id   uuid not null references public.projets(id) on delete cascade,
  nom         text not null,
  date_debut  date not null,
  date_fin    date,             -- null tant que non clôturé
  statut      text not null default 'ouvert'
                check (statut in ('ouvert', 'cloture')),
  -- ID de la release créée à la clôture (null avant clôture)
  release_id  uuid references public.releases(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.sprints enable row level security;

create policy "admin_full_access_sprints"
  on public.sprints for all
  using (public.is_admin())
  with check (public.is_admin());

-- Les clients voient les sprints de leurs projets (lecture seule,
-- pour l'affichage dans le calendrier client).
create policy "client_read_own_sprints"
  on public.sprints for select
  using (
    exists (
      select 1 from public.client_projets cp
      where cp.projet_id = sprints.projet_id
        and cp.client_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 2. Lien ticket <-> sprint (nullable, un ticket peut n'appartenir
--    à aucun sprint)
-- -----------------------------------------------------------------------------
alter table public.tickets
  add column sprint_id uuid references public.sprints(id) on delete set null;

comment on column public.tickets.sprint_id is
  'Appartenance optionnelle à un sprint. Null = ticket hors sprint.';

create index tickets_sprint_id_idx on public.tickets (sprint_id);
