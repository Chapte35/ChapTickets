-- =============================================================================
-- Sprint 10 — Onglet profil : pseudo + avatar personnalisable
-- =============================================================================
-- Décision (cf. clarification sprint 10) : pas d'upload d'image réelle,
-- juste un choix parmi une couleur fixe (même palette que TAG_COLORS, pour
-- rester cohérent avec la contrainte Tailwind JIT — cf. commentaire dans
-- src/lib/types.ts) et un emoji parmi une liste restreinte. Le composant
-- Avatar (initiales générées par hash) reste le fallback si rien n'est
-- personnalisé.
-- =============================================================================

alter table public.profiles
  add column pseudo text,
  add column avatar_couleur text
    check (
      avatar_couleur is null
      or avatar_couleur in ('red','orange','amber','green','teal','blue','indigo','purple','pink','gray')
    ),
  add column avatar_emoji text
    check (avatar_emoji is null or char_length(avatar_emoji) <= 4);

comment on column public.profiles.pseudo is
  'Pseudo affiché à la place de full_name/email dans l''UI si renseigné. Optionnel.';
comment on column public.profiles.avatar_couleur is
  'Couleur choisie parmi la palette TAG_COLORS (src/lib/types.ts) — remplace la couleur générée par hash dans le composant Avatar si renseignée.';
comment on column public.profiles.avatar_emoji is
  'Emoji choisi parmi une liste restreinte (AVATAR_EMOJIS, src/lib/types.ts) — remplace les initiales dans le composant Avatar si renseigné. Validation de la liste faite côté Server Action, la contrainte ici n''est qu''un garde-fou de longueur.';

-- Une policy RLS ne peut pas restreindre par colonne : une simple
-- "update using (id = auth.uid())" autoriserait aussi un client à modifier
-- son propre `role` en 'admin' via un appel direct à l'API Supabase REST,
-- hors Server Action, hors toute vérification applicative. On restreint
-- donc au niveau du GRANT Postgres les colonnes réellement modifiables par
-- un utilisateur sur sa propre ligne — le reste (role, email...) reste
-- uniquement modifiable via le client service_role (createAdminClient),
-- qui contourne de toute façon RLS et les grants.
revoke update on public.profiles from authenticated;
grant update (pseudo, avatar_couleur, avatar_emoji) on public.profiles to authenticated;

create policy "user_update_own_profil_perso"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
