-- =============================================================================
-- Sprint 12 — Réf interne (auto) + réf client (libre, éditable par les deux)
-- =============================================================================

alter table public.tickets add column numero integer generated always as identity;
alter table public.tickets add column ref_client text;

comment on column public.tickets.numero is
  'Référence interne, auto-générée (identity, jamais réutilisée), affichée "#<numero>". Non modifiable, y compris par l''admin — sert de repère stable dans les échanges (support, mails...).';
comment on column public.tickets.ref_client is
  'Référence libre côté client (son propre système de suivi/PO). Modifiable par l''admin ET par le client sur ses propres tickets.';

-- -----------------------------------------------------------------------------
-- Autoriser un client à modifier UNIQUEMENT ref_client sur ses propres
-- tickets.
--
-- Contrairement au cas profiles (migration 0011), on ne peut pas se
-- contenter d'un revoke/grant Postgres par colonne : l'admin modifie aussi
-- les tickets via le rôle `authenticated` (RLS-scopé, pas de service_role
-- ici — cf. requireAdmin dans admin/tickets/actions.ts), et a besoin
-- d'écrire sur TOUTES les colonnes. Un grant restreint à `ref_client` pour
-- `authenticated` casserait donc aussi les updates admin (statut, priorité,
-- date_prevue...).
--
-- La restriction se fait donc via un trigger : pour toute update faite par
-- un non-admin, seule ref_client (et updated_at) peut différer de l'ancienne
-- ligne. Sans ça, la policy RLS ci-dessous (using/with check sur
-- client_id = auth.uid()) autoriserait un client à modifier n'importe quelle
-- colonne de son propre ticket — statut, priorite, client_id... — via un
-- appel direct à l'API REST Supabase, en contournant le Server Action qui ne
-- touche en apparence qu'à ref_client.
-- -----------------------------------------------------------------------------
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
  then
    raise exception 'Un client ne peut modifier que la référence client de son propre ticket.';
  end if;

  return new;
end;
$$;

create trigger trg_restreindre_update_ticket_client
  before update on public.tickets
  for each row
  execute function public.restreindre_update_ticket_client();

create policy "client_update_own_ticket_ref"
  on public.tickets for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());
