-- =============================================================================
-- Sprint 0 — Schéma initial + RLS de base
-- =============================================================================
-- Structure du fichier, volontairement en deux phases séparées :
--   PHASE 1 : création de toutes les tables (aucune policy ici)
--   PHASE 2 : RLS + policies (peuvent référencer n'importe quelle table
--             ci-dessus sans souci d'ordre, puisqu'elles existent toutes déjà)
--
-- Pourquoi séparé : `create policy ... using (select ... from autre_table)`
-- est validé à la création, pas à l'exécution — contrairement à une fonction,
-- Postgres a besoin que `autre_table` existe déjà au moment du `create policy`.
-- Mélanger création de table et policies dans l'ordre "logique" (une entité
-- après l'autre) casse dès qu'une policy référence une table pas encore
-- créée. D'où cette séparation stricte.
--
-- Les policies d'écriture (insert/update sur tickets/messages) restent
-- volontairement minimales : affinées en Sprint 2/3 quand les flux de
-- création seront précisés (ex: qui peut changer un statut).
-- =============================================================================

-- =============================================================================
-- PHASE 1 — Tables
-- =============================================================================

-- profiles — miroir de auth.users avec le rôle applicatif
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'client')),
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Un profil par utilisateur Supabase Auth. Le rôle détermine le cloisonnement RLS.';

-- projets — entité formelle (section 4.5 du cahier des charges)
create table public.projets (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  description text,
  statut text not null default 'en_cours',
  created_at timestamptz not null default now()
);

-- client_projets — jointure many-to-many Client <-> Projet
create table public.client_projets (
  client_id uuid not null references public.profiles(id) on delete cascade,
  projet_id uuid not null references public.projets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, projet_id)
);

-- idees_projets — backlog privé admin (section 4.4)
create table public.idees_projets (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text,
  statut text not null default 'idee'
    check (statut in ('idee', 'a_explorer', 'valide', 'abandonne')),
  created_at timestamptz not null default now()
);

-- tickets (section 4.2)
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text,
  statut text not null default 'ouvert'
    check (statut in ('ouvert', 'en_cours', 'en_attente_client', 'resolu', 'ferme')),
  priorite text not null default 'normale'
    check (priorite in ('basse', 'normale', 'haute', 'urgente')),
  projet_id uuid not null references public.projets(id) on delete restrict,
  client_id uuid not null references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.tickets.client_id is
  'Client "propriétaire" du ticket. Doit être rattaché à projet_id via client_projets (contrôlé côté application + policy insert).';

-- messages (section 4.3)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete cascade,
  auteur_id uuid not null references public.profiles(id) on delete restrict,
  contenu text not null,
  created_at timestamptz not null default now()
);

comment on column public.messages.ticket_id is
  'Nullable : message "libre" non rattaché à un ticket (section 4.3, à trancher — présent en base par anticipation, non exposé en UI avant décision).';

-- =============================================================================
-- PHASE 2 — Fonctions, RLS, policies
-- =============================================================================

-- Fonction utilitaire : l'utilisateur courant est-il admin ?
-- security definer + search_path fixe pour éviter le hijacking de recherche de schéma.
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- --- profiles ---
alter table public.profiles enable row level security;

create policy "admin_full_access_profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "client_read_own_profile"
  on public.profiles for select
  using (id = auth.uid());

-- --- projets ---
alter table public.projets enable row level security;

create policy "admin_full_access_projets"
  on public.projets for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "client_read_own_projets"
  on public.projets for select
  using (
    exists (
      select 1 from public.client_projets cp
      where cp.projet_id = id and cp.client_id = auth.uid()
    )
  );

-- --- client_projets ---
alter table public.client_projets enable row level security;

create policy "admin_full_access_client_projets"
  on public.client_projets for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "client_read_own_client_projets"
  on public.client_projets for select
  using (client_id = auth.uid());

-- --- idees_projets ---
alter table public.idees_projets enable row level security;

-- Volontairement : UNE SEULE policy, admin uniquement. Sans policy client,
-- RLS refuse tout accès par défaut : c'est le comportement voulu
-- (section 3 : "aucune visibilité" côté client). Ne pas "corriger" ça en
-- ajoutant une policy client sans relire la section 3 du cahier des charges.
create policy "admin_full_access_idees_projets"
  on public.idees_projets for all
  using (public.is_admin())
  with check (public.is_admin());

-- --- tickets ---
alter table public.tickets enable row level security;

create policy "admin_full_access_tickets"
  on public.tickets for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "client_read_own_tickets"
  on public.tickets for select
  using (
    exists (
      select 1 from public.client_projets cp
      where cp.projet_id = tickets.projet_id and cp.client_id = auth.uid()
    )
  );

-- Un client ne peut créer un ticket que sur un projet auquel il est rattaché,
-- et seulement en son propre nom (section 4.2).
create policy "client_create_ticket_own_projet"
  on public.tickets for insert
  with check (
    client_id = auth.uid()
    and created_by = auth.uid()
    and exists (
      select 1 from public.client_projets cp
      where cp.projet_id = tickets.projet_id and cp.client_id = auth.uid()
    )
  );

-- --- messages ---
alter table public.messages enable row level security;

create policy "admin_full_access_messages"
  on public.messages for all
  using (public.is_admin())
  with check (public.is_admin());

-- Un client voit un message si : soit c'est le sien, soit il porte sur un
-- ticket auquel il a accès (cloisonnement décrit en 4.3).
create policy "client_read_visible_messages"
  on public.messages for select
  using (
    auteur_id = auth.uid()
    or exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = messages.ticket_id and cp.client_id = auth.uid()
    )
  );

-- Un client ne peut poster qu'en son nom, et uniquement sur un ticket
-- auquel il a accès (ou en message libre, ticket_id null).
create policy "client_create_message_own_visible_ticket"
  on public.messages for insert
  with check (
    auteur_id = auth.uid()
    and (
      ticket_id is null
      or exists (
        select 1 from public.tickets t
        join public.client_projets cp on cp.projet_id = t.projet_id
        where t.id = messages.ticket_id and cp.client_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- Trigger : créer automatiquement le profil à la création d'un auth.users
-- =============================================================================
-- Utile pour l'invitation admin (Sprint 1) : quand l'admin invite un client
-- via Supabase Auth, un profil 'client' est créé par défaut. Le rôle peut
-- être élevé à 'admin' manuellement en base (jamais via l'app).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, email)
  values (new.id, 'client', new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();