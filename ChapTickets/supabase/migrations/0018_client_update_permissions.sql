-- Migration 0018 : élargissement des droits UPDATE client sur les tickets
--
-- Avant : un client ne pouvait modifier que ref_client.
-- Après :
--   - titre, description, ref_client : modifiables librement sur tout ticket
--     d'un projet auquel le client est rattaché.
--   - statut : une seule transition autorisée, en_attente_client → resolu
--     (validation client). Toute autre modification de statut est bloquée.
--   - Tous les autres champs restent protégés (projet_id, priorite, client_id,
--     date_prevue, assigne_a, etc.).

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

  -- Champs structurels : jamais modifiables par un client.
  if new.id                 is distinct from old.id
     or new.projet_id       is distinct from old.projet_id
     or new.client_id       is distinct from old.client_id
     or new.created_by      is distinct from old.created_by
     or new.created_at      is distinct from old.created_at
     or new.date_prevue     is distinct from old.date_prevue
     or new.ticket_origine_id is distinct from old.ticket_origine_id
     or new.release_id      is distinct from old.release_id
     or new.numero          is distinct from old.numero
     or new.assigne_a       is distinct from old.assigne_a
     or new.priorite        is distinct from old.priorite
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

  -- titre, description, ref_client, updated_at : autorisés.
  return new;
end;
$$;

-- Le trigger est déjà en place depuis 0017 — on le recrée idempotent
-- pour s'assurer qu'il pointe bien sur la nouvelle version de la fonction.
drop trigger if exists trg_restreindre_update_ticket_client on public.tickets;
create trigger trg_restreindre_update_ticket_client
  before update on public.tickets
  for each row
  execute function public.restreindre_update_ticket_client();
