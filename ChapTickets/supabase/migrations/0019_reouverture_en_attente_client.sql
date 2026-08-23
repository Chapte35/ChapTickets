-- Migration 0019 : autoriser les demandes de réouverture sur les tickets
-- en statut en_attente_client (en plus de resolu et ferme).
--
-- Contexte : ValidationClientPanel propose "Bug persistant" sur un ticket
-- en_attente_client, ce qui crée une demande de réouverture. La policy
-- précédente n'autorisait l'insert que sur resolu/ferme → erreur RLS.

drop policy if exists "client_create_demande_reouverture" on public.demandes_reouverture;

create policy "client_create_demande_reouverture"
  on public.demandes_reouverture for insert
  with check (
    demande_par = auth.uid()
    and exists (
      select 1
      from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = demandes_reouverture.ticket_id
        and cp.client_id = auth.uid()
        and t.statut in ('resolu', 'ferme', 'en_attente_client')
    )
  );

-- Synchroniser la constante applicative (pour référence — la vraie valeur
-- est dans src/lib/types.ts : STATUTS_ELIGIBLES_REOUVERTURE).
-- À mettre à jour manuellement dans le code :
-- export const STATUTS_ELIGIBLES_REOUVERTURE = ["resolu", "ferme", "en_attente_client"]
