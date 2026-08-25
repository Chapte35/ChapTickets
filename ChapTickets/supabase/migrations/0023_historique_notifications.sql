-- =============================================================================
-- Migration 0023 : historique des modifications de tickets + notifications
-- =============================================================================

-- ── Table ticket_historique ───────────────────────────────────────────────────
-- Trace tous les changements de champs sur un ticket.
-- On garde ticket_statut_historique intacte (utilisée par le calendrier).

create table if not exists public.ticket_historique (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  champ       text not null,           -- ex: 'statut', 'priorite', 'type_ticket', 'titre', 'assigne_a'
  ancienne_valeur text,                -- null si création ou si valeur précédente inconnue
  nouvelle_valeur text,                -- null si suppression de valeur
  changed_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Index pour charger l'historique d'un ticket rapidement
create index if not exists ticket_historique_ticket_id_idx
  on public.ticket_historique(ticket_id, created_at desc);

-- RLS : l'admin voit tout, le client voit l'historique des tickets de ses projets
alter table public.ticket_historique enable row level security;

create policy "admin_all_historique" on public.ticket_historique
  for all using (public.is_admin());

create policy "client_read_historique" on public.ticket_historique
  for select using (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_historique.ticket_id
        and cp.client_id = auth.uid()
    )
  );

-- ── Table notifications ───────────────────────────────────────────────────────
-- Notifications in-app pour les clients.
-- Déclenchées quand un ticket est assigné au client (assigne_a = client_id)
-- avec statut en_attente_client.

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  type        text not null default 'ticket_assigne',
  lu          boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_id_lu_idx
  on public.notifications(user_id, lu, created_at desc);

alter table public.notifications enable row level security;

-- Un client ne voit que ses propres notifications
create policy "client_own_notifications" on public.notifications
  for all using (auth.uid() = user_id);

-- L'admin peut insérer des notifications pour n'importe quel utilisateur
create policy "admin_insert_notifications" on public.notifications
  for insert with check (public.is_admin());
