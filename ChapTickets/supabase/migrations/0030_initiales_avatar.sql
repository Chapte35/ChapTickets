-- =============================================================================
-- Migration 0030 : initiales personnalisables + nouvelle palette avatar
-- On ajoute `initiales` (2 caractères max) et on retire avatar_emoji.
-- avatar_couleur reste mais change de palette (côté app uniquement,
-- la contrainte DB n'étant pas sur les valeurs de couleur).
-- =============================================================================

alter table public.profiles
  add column if not exists initiales text
  check (char_length(initiales) <= 3);

-- Grant : les utilisateurs peuvent écrire leur propre colonne initiales
-- (même policy RLS que pseudo et avatar_couleur — id = auth.uid()).
-- La colonne avatar_emoji est gardée en base pour ne pas casser l'existant,
-- on la neutralise côté app uniquement.
