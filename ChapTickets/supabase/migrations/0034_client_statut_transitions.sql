-- =============================================================================
-- Migration 0034 : élargir les transitions de statut autorisées pour les clients
--
-- Avant (0033) : seule la transition en_attente_client → resolu était autorisée.
-- Après : les transitions légitimes côté client sont toutes autorisées :
--   - en_attente_client → resolu   (validation : le client confirme que c'est bon)
--   - en_attente_client → ouvert   (bug persistant : le client signale que ça ne va pas)
--   - ouvert            → ouvert   (mise à jour sans changement de statut, ex: description)
-- Les transitions vers en_cours, ferme, etc. restent bloquées — c'est le
-- domaine de l'admin.
-- =============================================================================

create or replace function public.restreindre_update_ticket_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- L'admin peut tout modifier.
  if public.is_admin() then
    return new;
  end if;

  -- Champs structurels : jamais modifiables par un client.
  if new.id                   is distinct from old.id
     or new.projet_id         is distinct from old.projet_id
     or new.client_id         is distinct from old.client_id
     or new.created_by        is distinct from old.created_by
     or new.created_at        is distinct from old.created_at
     or new.date_prevue       is distinct from old.date_prevue
     or new.ticket_origine_id is distinct from old.ticket_origine_id
     or new.release_id        is distinct from old.release_id
     or new.sprint_id         is distinct from old.sprint_id
     or new.assigne_a         is distinct from old.assigne_a
  then
    raise exception 'Un client ne peut pas modifier ce champ.';
  end if;

  -- Statut : seules les transitions légitimes côté client sont autorisées.
  if new.statut is distinct from old.statut then
    if not (
      -- Validation : tout allait bien
      (old.statut = 'en_attente_client' and new.statut = 'resolu')
      -- Bug persistant : ça ne marche pas, on repasse en ouvert
      or (old.statut = 'en_attente_client' and new.statut = 'ouvert')
    ) then
      raise exception
        'Transition de statut non autorisée pour un client (% → %).',
        old.statut, new.statut;
    end if;
  end if;

  -- titre, description, ref_client, priorite, type_ticket, updated_at :
  -- modifiables librement par tout client ayant accès au ticket.
  return new;
end;
$$;

-- Trigger idempotent
drop trigger if exists trg_restreindre_update_ticket_client on public.tickets;
create trigger trg_restreindre_update_ticket_client
  before update on public.tickets
  for each row
  execute function public.restreindre_update_ticket_client();
