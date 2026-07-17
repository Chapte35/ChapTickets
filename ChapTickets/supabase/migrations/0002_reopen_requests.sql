-- =============================================================================
-- Sprint 2 — Demandes de réouverture
-- =============================================================================
-- Décision : seul l'admin peut changer le statut d'un ticket (aucune policy
-- UPDATE sur `tickets` pour le rôle client, et ça ne changera pas ici).
-- Un client qui veut la réouverture d'un ticket résolu/fermé passe par cette
-- table à part : il peut seulement INSERT une demande, jamais toucher au
-- ticket lui-même. L'admin voit les demandes en attente et agit (change le
-- statut du ticket + marque la demande traitée).
-- =============================================================================

create table public.demandes_reouverture (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  demande_par uuid not null references public.profiles(id) on delete restrict,
  message text,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'acceptee', 'refusee')),
  created_at timestamptz not null default now(),
  traitee_at timestamptz,
  traitee_par uuid references public.profiles(id)
);

comment on table public.demandes_reouverture is
  'Demande de réouverture par un client sur un ticket résolu/fermé. Ne modifie jamais tickets.statut directement — seul l''admin le fait, manuellement, en réaction à une demande acceptée.';

alter table public.demandes_reouverture enable row level security;

create policy "admin_full_access_demandes_reouverture"
  on public.demandes_reouverture for all
  using (public.is_admin())
  with check (public.is_admin());

-- Le client voit ses propres demandes (pour afficher "en attente" dans l'UI).
create policy "client_read_own_demandes_reouverture"
  on public.demandes_reouverture for select
  using (demande_par = auth.uid());

-- Le client ne peut créer une demande que sur un ticket qu'il peut voir,
-- en son propre nom, et seulement si le ticket est actuellement résolu ou
-- fermé (pas de sens à "rouvrir" un ticket déjà ouvert).
create policy "client_create_demande_reouverture"
  on public.demandes_reouverture for insert
  with check (
    demande_par = auth.uid()
    and exists (
      select 1
      from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = demandes_reouverture.ticket_id
        and cp.client_id = auth.uid()
        and t.statut in ('resolu', 'ferme')
    )
  );
