-- =============================================================================
-- Vue tickets_avec_rang
-- Ajoute une colonne rang_projet (ROW_NUMBER par projet, trié par numero ASC)
-- pour afficher des références type "CHAP#1", "CHAP#2"... cohérentes par projet
-- sans trous, sans toucher à la vraie colonne `numero` en base.
--
-- security_invoker = true : la vue respecte la RLS de l'appelant (même
-- comportement que si on requêtait `tickets` directement). Sans cette option,
-- la vue s'exécuterait avec les droits du owner et bypasserait la RLS.
-- =============================================================================

create or replace view public.tickets_avec_rang
  with (security_invoker = true)
as
select
  *,
  row_number() over (
    partition by projet_id
    order by numero asc
  )::integer as rang_projet
from public.tickets;
