-- =============================================================================
-- Sprint 7 (lot B) — Messagerie par projet
-- =============================================================================
-- Table séparée de `messages` (qui reste liée aux tickets) : ici, une
-- conversation par projet, sans rapport avec un ticket précis. RLS
-- identique dans l'esprit à `messages`, mais basée sur client_projets
-- directement (pas de jointure via tickets).
-- =============================================================================

create table public.messages_projet (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid not null references public.projets(id) on delete cascade,
  auteur_id uuid not null references public.profiles(id) on delete restrict,
  contenu text not null,
  created_at timestamptz not null default now()
);

alter table public.messages_projet enable row level security;

create policy "admin_full_access_messages_projet"
  on public.messages_projet for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "client_read_messages_projet"
  on public.messages_projet for select
  using (
    exists (
      select 1 from public.client_projets cp
      where cp.projet_id = messages_projet.projet_id and cp.client_id = auth.uid()
    )
  );

create policy "client_create_messages_projet"
  on public.messages_projet for insert
  with check (
    auteur_id = auth.uid()
    and exists (
      select 1 from public.client_projets cp
      where cp.projet_id = messages_projet.projet_id and cp.client_id = auth.uid()
    )
  );
