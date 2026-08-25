-- Script de test : crée une notification non lue pour chaque client
-- qui a au moins un ticket en statut en_attente_client assigné.
-- À balancer dans le SQL Editor Supabase.

insert into public.notifications (user_id, ticket_id, type, lu)
select distinct
  t.assigne_a   as user_id,
  t.id          as ticket_id,
  'ticket_assigne' as type,
  false         as lu
from public.tickets t
where t.statut    = 'en_attente_client'
  and t.assigne_a is not null
  -- Évite les doublons si la notif existe déjà
  and not exists (
    select 1 from public.notifications n
    where n.ticket_id = t.id
      and n.user_id   = t.assigne_a
      and n.lu        = false
  );

-- Vérification : affiche ce qui vient d'être inséré
select
  n.id,
  n.user_id,
  p.email,
  t.titre,
  t.statut,
  n.created_at
from public.notifications n
join public.tickets t  on t.id = n.ticket_id
join public.profiles p on p.id = n.user_id
where n.lu = false
order by n.created_at desc;
