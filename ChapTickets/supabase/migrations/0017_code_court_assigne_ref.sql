-- =============================================================================
-- Sprint feedback client — code_court (projets), assigne_a (tickets),
-- fix idempotent de la policy/trigger ref_client (FEAT0.2)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FEAT1.1 — Code court projet (ex : "CHAP"), saisi manuellement par l'admin.
-- Nullable : les projets existants n'en ont pas encore.
-- Unique : deux projets ne peuvent pas partager le même code (sinon les
-- références CHAP#32 seraient ambiguës).
-- Majuscules : contrainte souple (juste un check), la validation métier est
-- faite côté Server Action (trim + upper).
-- -----------------------------------------------------------------------------
alter table public.projets
  add column if not exists code_court text;

alter table public.projets
  drop constraint if exists projets_code_court_unique;

alter table public.projets
  add constraint projets_code_court_unique unique (code_court);

comment on column public.projets.code_court is
  'Code court saisi manuellement par l''admin (ex : "CHAP"). Utilisé comme préfixe des références ticket : CHAP#32. Unique, nullable (les projets sans code court affichent simplement #<numero>).';

-- -----------------------------------------------------------------------------
-- FEAT1.6 — Assigné à : colonne nullable sur tickets, référence profiles.
-- N'importe quel profil peut être assigné (admin OU client — ex : "En attente
-- client" = le client est l'acteur attendu). Pas de contrainte role côté DB,
-- la liste proposée dans l'UI est filtrée côté application.
-- -----------------------------------------------------------------------------
alter table public.tickets
  add column if not exists assigne_a uuid references public.profiles(id) on delete set null;

comment on column public.tickets.assigne_a is
  'Personne assignée au ticket. Peut être un admin ou un client (ex : "En attente client"). Nullable.';

-- Policy RLS : un client peut lire assigne_a (il voit déjà la ligne ticket
-- via client_read_own_tickets), mais ne peut pas le modifier — le trigger
-- restreindre_update_ticket_client bloque déjà tout update non-ref_client
-- côté client, pas besoin de policy dédiée.

-- -----------------------------------------------------------------------------
-- FEAT0.2 — Fix idempotent : recrée la policy + trigger ref_client au cas où
-- la migration 0014 ne serait pas passée en prod (même pattern que le bug
-- ticket_statut_historique). On drop+create pour garantir l'état attendu.
-- -----------------------------------------------------------------------------

-- Trigger : interdit à un client de modifier autre chose que ref_client.
-- Recréé de façon idempotente (or replace).
create or replace function public.restreindre_update_ticket_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.titre is distinct from old.titre
     or new.description is distinct from old.description
     or new.statut is distinct from old.statut
     or new.priorite is distinct from old.priorite
     or new.projet_id is distinct from old.projet_id
     or new.client_id is distinct from old.client_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
     or new.date_prevue is distinct from old.date_prevue
     or new.ticket_origine_id is distinct from old.ticket_origine_id
     or new.release_id is distinct from old.release_id
     or new.numero is distinct from old.numero
     or new.assigne_a is distinct from old.assigne_a
  then
    raise exception 'Un client ne peut modifier que la référence client de son propre ticket.';
  end if;

  return new;
end;
$$;

-- Trigger recréé idempotent.
drop trigger if exists trg_restreindre_update_ticket_client on public.tickets;
create trigger trg_restreindre_update_ticket_client
  before update on public.tickets
  for each row
  execute function public.restreindre_update_ticket_client();

-- Policy recréée idempotent.
drop policy if exists "client_update_own_ticket_ref" on public.tickets;
create policy "client_update_own_ticket_ref"
  on public.tickets for update
  using (
    exists (
      select 1 from public.client_projets cp
      where cp.projet_id = tickets.projet_id and cp.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.client_projets cp
      where cp.projet_id = tickets.projet_id and cp.client_id = auth.uid()
    )
  );
