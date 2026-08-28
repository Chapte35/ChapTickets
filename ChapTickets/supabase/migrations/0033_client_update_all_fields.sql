-- =============================================================================
-- Migration 0033 : client peut modifier tous les champs non structurels
--
-- Avant : priorité uniquement si created_by = auth.uid(), type/ref bloqués.
-- Après : titre, description, ref_client, priorite, type_ticket modifiables
--         par tout client ayant accès au ticket (via client_projets).
--         Les champs structurels et assigne_a restent protégés.
--         L'historique est géré côté application (logHistorique).
--
-- La restriction created_by = auth.uid() sur la priorité est levée :
-- l'historique remplace ce garde-fou, et la DX prime.
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

  -- Statut : seule la transition en_attente_client → resolu est autorisée.
  if new.statut is distinct from old.statut then
    if old.statut <> 'en_attente_client' or new.statut <> 'resolu' then
      raise exception
        'Un client ne peut changer le statut que de en_attente_client vers resolu.';
    end if;
  end if;

  -- titre, description, ref_client, priorite, type_ticket, updated_at :
  -- modifiables librement par tout client ayant accès au ticket.
  return new;
end;
$$;

-- Recrée le trigger (idempotent)
drop trigger if exists trg_restreindre_update_ticket_client on public.tickets;
create trigger trg_restreindre_update_ticket_client
  before update on public.tickets
  for each row
  execute function public.restreindre_update_ticket_client();
