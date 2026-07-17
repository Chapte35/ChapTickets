-- =============================================================================
-- Sprint 7 (lot A) — Tags, checklist, pièces jointes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tags globaux (gérés par l'admin, réutilisables sur n'importe quel ticket)
-- -----------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  couleur text not null default 'gray'
    check (couleur in ('red','orange','amber','green','teal','blue','indigo','purple','pink','gray')),
  created_at timestamptz not null default now()
);

alter table public.tags enable row level security;

create policy "admin_full_access_tags"
  on public.tags for all
  using (public.is_admin())
  with check (public.is_admin());

-- Un client doit pouvoir voir le nom/couleur des tags posés sur SES tickets,
-- et les choisir à la création. Rien de sensible dans un nom de tag : lecture
-- ouverte à tout utilisateur authentifié plutôt que de complexifier avec une
-- jointure via les tickets (qui n'aurait de sens que pour les tags déjà posés,
-- pas pour ceux qu'on propose à la sélection).
create policy "authenticated_read_tags"
  on public.tags for select
  using (auth.uid() is not null);

-- -----------------------------------------------------------------------------
-- 2. Jointure ticket <-> tag
-- -----------------------------------------------------------------------------
create table public.ticket_tags (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (ticket_id, tag_id)
);

alter table public.ticket_tags enable row level security;

create policy "admin_full_access_ticket_tags"
  on public.ticket_tags for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "client_read_own_ticket_tags"
  on public.ticket_tags for select
  using (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_tags.ticket_id and cp.client_id = auth.uid()
    )
  );

create policy "client_insert_own_ticket_tags"
  on public.ticket_tags for insert
  with check (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_tags.ticket_id and cp.client_id = auth.uid()
    )
  );

create policy "client_delete_own_ticket_tags"
  on public.ticket_tags for delete
  using (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_tags.ticket_id and cp.client_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 3. Checklist par ticket (collaboratif : admin ET client peuvent cocher/ajouter)
-- -----------------------------------------------------------------------------
create table public.ticket_checklist_items (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  contenu text not null,
  complete boolean not null default false,
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ticket_checklist_items enable row level security;

create policy "admin_full_access_checklist"
  on public.ticket_checklist_items for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "client_read_own_checklist"
  on public.ticket_checklist_items for select
  using (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_checklist_items.ticket_id and cp.client_id = auth.uid()
    )
  );

create policy "client_insert_own_checklist"
  on public.ticket_checklist_items for insert
  with check (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_checklist_items.ticket_id and cp.client_id = auth.uid()
    )
  );

create policy "client_update_own_checklist"
  on public.ticket_checklist_items for update
  using (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_checklist_items.ticket_id and cp.client_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_checklist_items.ticket_id and cp.client_id = auth.uid()
    )
  );

create policy "client_delete_own_checklist"
  on public.ticket_checklist_items for delete
  using (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_checklist_items.ticket_id and cp.client_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Pièces jointes — métadonnées (le binaire vit dans Supabase Storage)
-- -----------------------------------------------------------------------------
create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  storage_path text not null,
  nom_fichier text not null,
  taille_octets bigint,
  type_mime text,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.ticket_attachments enable row level security;

create policy "admin_full_access_attachments"
  on public.ticket_attachments for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "client_read_own_attachments"
  on public.ticket_attachments for select
  using (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_attachments.ticket_id and cp.client_id = auth.uid()
    )
  );

create policy "client_insert_own_attachments"
  on public.ticket_attachments for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = ticket_attachments.ticket_id and cp.client_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 5. Bucket Storage + policies sur storage.objects
-- -----------------------------------------------------------------------------
-- Bucket privé (pas d'accès public direct par URL), 10 Mo max par fichier.
-- Convention de chemin : "{ticket_id}/{uuid}-{nom_original}" — le premier
-- segment du chemin sert de clé pour la RLS (storage.foldername).
insert into storage.buckets (id, name, public, file_size_limit)
values ('ticket-attachments', 'ticket-attachments', false, 10485760)
on conflict (id) do nothing;

create policy "admin_full_access_attachment_files"
  on storage.objects for all
  using (bucket_id = 'ticket-attachments' and public.is_admin())
  with check (bucket_id = 'ticket-attachments' and public.is_admin());

create policy "client_read_own_attachment_files"
  on storage.objects for select
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id::text = (storage.foldername(name))[1]
        and cp.client_id = auth.uid()
    )
  );

create policy "client_upload_own_attachment_files"
  on storage.objects for insert
  with check (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id::text = (storage.foldername(name))[1]
        and cp.client_id = auth.uid()
    )
  );
