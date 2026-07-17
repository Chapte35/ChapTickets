-- =============================================================================
-- Sprint 6 — Suivi de lecture des tickets (pour "messages non lus")
-- =============================================================================
-- Une ligne = "cet utilisateur a vu ce ticket jusqu'à cet instant". Mise à
-- jour à chaque visite de la fiche ticket (cf. src/components/mark-ticket-read.tsx).
-- Un message est "non lu" pour un utilisateur si : il ne l'a pas écrit
-- lui-même, ET il est postérieur à `vu_jusqu_a` (ou aucune ligne n'existe
-- encore pour ce couple ticket/utilisateur => tout est non lu).
-- =============================================================================

create table public.lectures_tickets (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vu_jusqu_a timestamptz not null default now(),
  primary key (ticket_id, user_id)
);

comment on table public.lectures_tickets is
  'Horodatage de dernière lecture par utilisateur/ticket, pour calculer les messages non lus. Pas de policy admin séparée : tout le monde (admin inclus) ne gère que sa propre ligne, la notion de "lu" est individuelle.';

alter table public.lectures_tickets enable row level security;

create policy "user_manages_own_lecture"
  on public.lectures_tickets for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
