-- =============================================================================
-- Sprint 12 — Fix bug préexistant : ticket_statut_historique n'existait pas
-- =============================================================================
-- Le code (updateTicketStatutInterne dans admin/tickets/actions.ts, les deux
-- pages calendrier) suppose cette table depuis le sprint 7/8, et
-- PROJECT_CONTEXT.md la documente comme existante. En réalité aucune
-- migration ne l'a jamais créée : l'INSERT échouait silencieusement
-- (l'erreur est volontairement non-bloquante, juste loggée en console — cf.
-- commentaire dans updateTicketStatutInterne), et la lecture côté calendrier
-- retournait toujours un tableau vide sans erreur visible. Résultat : aucun
-- événement "statut" n'est jamais apparu sur le calendrier, pour personne.
-- =============================================================================

create table public.ticket_statut_historique (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  ancien_statut text,
  nouveau_statut text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index ticket_statut_historique_ticket_id_idx on public.ticket_statut_historique (ticket_id);
create index ticket_statut_historique_changed_at_idx on public.ticket_statut_historique (changed_at);

alter table public.ticket_statut_historique enable row level security;

create policy "admin_full_access_ticket_statut_historique"
  on public.ticket_statut_historique for all
  using (public.is_admin())
  with check (public.is_admin());

-- Même pattern que client_read_own_checklist (migration 0006) : lecture
-- seule, scopée aux tickets des projets auxquels le client est rattaché.
create policy "client_read_own_ticket_statut_historique"
  on public.ticket_statut_historique for select
  using (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_statut_historique.ticket_id and cp.client_id = auth.uid()
    )
  );
