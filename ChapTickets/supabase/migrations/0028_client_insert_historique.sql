-- =============================================================================
-- Migration 0028 : autoriser le client à insérer dans ticket_historique
-- pour les tickets de ses projets.
-- Manquait depuis la migration 0023 qui n'avait que la policy SELECT.
-- =============================================================================

create policy "client_insert_historique" on public.ticket_historique
  for insert with check (
    changed_by = auth.uid()
    and exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_historique.ticket_id
        and cp.client_id = auth.uid()
    )
  );
