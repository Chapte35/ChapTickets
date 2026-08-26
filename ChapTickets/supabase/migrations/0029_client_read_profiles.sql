-- =============================================================================
-- Migration 0029 : autoriser les clients à lire full_name et email
-- des profils des autres utilisateurs avec qui ils partagent un projet.
-- Nécessaire pour afficher les auteurs de messages dans les conversations.
-- =============================================================================

-- Politique existante à vérifier — on ajoute une policy SELECT permissive
-- qui couvre les profils des membres de projets communs.
create policy "client_read_projet_members_profiles" on public.profiles
  for select using (
    -- L'utilisateur peut lire son propre profil
    auth.uid() = id
    or
    -- L'admin peut tout lire
    public.is_admin()
    or
    -- Le client peut lire les profils des membres de ses projets
    exists (
      select 1
      from public.client_projets cp1
      join public.client_projets cp2 on cp2.projet_id = cp1.projet_id
      where cp1.client_id = auth.uid()
        and cp2.client_id = profiles.id
    )
    or
    -- Le client peut lire les profils des admins qui ont traité ses tickets
    exists (
      select 1
      from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where cp.client_id = auth.uid()
        and t.assigne_a = profiles.id
    )
  );
