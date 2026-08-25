-- =============================================================================
-- Migration 0025 : relations entre tickets
-- Relation symétrique : si A est lié à B, B est lié à A automatiquement
-- via un trigger AFTER INSERT/DELETE.
-- Pour l'instant un seul type : 'en_relation_avec'.
-- =============================================================================

create table if not exists public.ticket_relations (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.tickets(id) on delete cascade,
  ticket_cible_id uuid not null references public.tickets(id) on delete cascade,
  type          text not null default 'en_relation_avec'
                check (type in ('en_relation_avec')),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  -- Empêche les doublons et les auto-relations
  unique (ticket_id, ticket_cible_id),
  check (ticket_id <> ticket_cible_id)
);

create index if not exists ticket_relations_ticket_id_idx
  on public.ticket_relations(ticket_id);
create index if not exists ticket_relations_cible_id_idx
  on public.ticket_relations(ticket_cible_id);

-- RLS
alter table public.ticket_relations enable row level security;

create policy "admin_all_relations" on public.ticket_relations
  for all using (public.is_admin());

create policy "client_read_relations" on public.ticket_relations
  for select using (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_relations.ticket_id
        and cp.client_id = auth.uid()
    )
  );

create policy "client_write_relations" on public.ticket_relations
  for insert with check (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_relations.ticket_id
        and cp.client_id = auth.uid()
    )
  );

create policy "client_delete_relations" on public.ticket_relations
  for delete using (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_relations.ticket_id
        and cp.client_id = auth.uid()
    )
  );

-- ── Trigger symétrie ─────────────────────────────────────────────────────────
-- Insère automatiquement la relation inverse à la création,
-- et la supprime à la suppression.
-- La variable session `app.skip_symmetry` évite la récursion infinie.

create or replace function public.sync_relation_symetrique()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.skip_symmetry', true) = 'true' then
    return new;
  end if;

  perform set_config('app.skip_symmetry', 'true', true);

  if tg_op = 'INSERT' then
    insert into public.ticket_relations (ticket_id, ticket_cible_id, type, created_by)
    values (new.ticket_cible_id, new.ticket_id, new.type, new.created_by)
    on conflict (ticket_id, ticket_cible_id) do nothing;

  elsif tg_op = 'DELETE' then
    delete from public.ticket_relations
    where ticket_id = old.ticket_cible_id
      and ticket_cible_id = old.ticket_id;
  end if;

  perform set_config('app.skip_symmetry', 'false', true);
  return new;
end;
$$;

create trigger trg_sync_relation_symetrique
  after insert or delete on public.ticket_relations
  for each row execute function public.sync_relation_symetrique();
