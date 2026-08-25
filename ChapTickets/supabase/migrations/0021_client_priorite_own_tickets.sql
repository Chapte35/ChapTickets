-- =============================================================================
-- Migration 0021 : client peut modifier priorité sur ses propres tickets
--
-- Avant : priorité systématiquement bloquée pour tout client.
-- Après : un client peut modifier la priorité uniquement si created_by = auth.uid()
--         (il a créé le ticket lui-même). Logique Jira : le rapporteur garde
--         la main sur la priorité, pas l'assigné.
-- =============================================================================

create or replace function public.restreindre_update_ticket_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- L'admin peut tout modifier, le trigger ne le concerne pas.
  if public.is_admin() then
    return new;
  end if;

  -- Champs structurels : jamais modifiables par un client, quelle que soit
  -- la situation.
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

  -- Priorité : modifiable uniquement par le client qui a créé le ticket.
  if new.priorite is distinct from old.priorite then
    if old.created_by <> auth.uid() then
      raise exception
        'Un client ne peut modifier la priorité que sur les tickets qu''il a créés.';
    end if;
  end if;

  -- Statut : seule la transition en_attente_client → resolu est autorisée.
  if new.statut is distinct from old.statut then
    if old.statut <> 'en_attente_client' or new.statut <> 'resolu' then
      raise exception
        'Un client ne peut changer le statut que de en_attente_client vers resolu.';
    end if;
  end if;

  -- titre, description, ref_client, updated_at : autorisés sans restriction.
  return new;
end;
$$;

-- Recrée le trigger pour pointer sur la nouvelle version de la fonction
-- (le trigger existe déjà depuis 0017/0018, on le repose idempotent).
drop trigger if exists trg_restreindre_update_ticket_client on public.tickets;
create trigger trg_restreindre_update_ticket_client
  before update on public.tickets
  for each row
  execute function public.restreindre_update_ticket_client();
