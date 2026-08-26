-- =============================================================================
-- Migration 0026 : autoriser la transition en_attente_client → ouvert
-- côté client (quand il signale que le bug persiste).
-- Avant : seule la transition en_attente_client → resolu était autorisée.
-- Après : en_attente_client → resolu (valider) OU en_attente_client → ouvert
--         (bug persiste).
-- =============================================================================

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

  -- Champs structurels : jamais modifiables par un client
  if new.id                   is distinct from old.id
     or new.projet_id         is distinct from old.projet_id
     or new.client_id         is distinct from old.client_id
     or new.created_by        is distinct from old.created_by
     or new.created_at        is distinct from old.created_at
     or new.date_prevue       is distinct from old.date_prevue
     or new.ticket_origine_id is distinct from old.ticket_origine_id
     or new.release_id        is distinct from old.release_id
     or new.numero            is distinct from old.numero
     or new.assigne_a         is distinct from old.assigne_a
  then
    raise exception 'Un client ne peut pas modifier ce champ.';
  end if;

  -- Priorité : modifiable uniquement par le créateur du ticket
  if new.priorite is distinct from old.priorite then
    if old.created_by <> auth.uid() then
      raise exception
        'Un client ne peut modifier la priorité que sur les tickets qu''il a créés.';
    end if;
  end if;

  -- Statut : deux transitions autorisées depuis en_attente_client :
  --   → resolu  (valider : tout est bon)
  --   → ouvert  (bug persiste : le problème n'est pas résolu)
  if new.statut is distinct from old.statut then
    if old.statut <> 'en_attente_client'
       or new.statut not in ('resolu', 'ouvert')
    then
      raise exception
        'Un client ne peut changer le statut que de en_attente_client vers resolu ou ouvert.';
    end if;
  end if;

  -- titre, description, ref_client, type_ticket, updated_at : autorisés
  return new;
end;
$$;

drop trigger if exists trg_restreindre_update_ticket_client on public.tickets;
create trigger trg_restreindre_update_ticket_client
  before update on public.tickets
  for each row
  execute function public.restreindre_update_ticket_client();
