-- =============================================================================
-- Migration 0031 : release_notifications
-- Trace qui a reçu quel email de release, et quand.
-- Upsert sur (release_id, client_id) : on écrase envoyee_le à chaque renvoi,
-- ce qui permet de savoir "dernière fois notifié" tout en acceptant les renvois
-- manuels depuis /admin/mailing.
-- =============================================================================

create table public.release_notifications (
  id           uuid primary key default gen_random_uuid(),
  release_id   uuid not null references public.releases(id) on delete cascade,
  client_id    uuid not null references auth.users(id) on delete cascade,
  envoyee_le   timestamptz not null default now(),
  -- Qui a déclenché l'envoi : 'auto' (création release) ou 'admin' (renvoi manuel)
  declencheur  text not null default 'auto' check (declencheur in ('auto', 'admin')),
  -- Contrainte unique pour l'upsert côté Edge Function
  unique (release_id, client_id)
);

-- Index pour la page mailing (lecture par release)
create index release_notifications_release_id_idx
  on public.release_notifications(release_id);

alter table public.release_notifications enable row level security;

-- L'admin voit et gère tout
create policy "admin_full_release_notifications"
  on public.release_notifications for all
  using (public.is_admin())
  with check (public.is_admin());

-- Les clients ne voient pas cette table
