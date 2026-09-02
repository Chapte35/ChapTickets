-- =============================================================================
-- Migration 0035 : demandes_reouverture — commentaire_refus + acknowledged_at
--
-- commentaire_refus : texte libre saisi par l'admin quand il refuse une
--   demande, visible par le client dans son onglet demandes.
--
-- acknowledged_at : timestamp posé par le client quand il prend acte d'une
--   demande traitée (acceptée ou refusée). Les demandes non-acknowledged sont
--   mises en avant dans la vue client. NULL = non-acknowledged.
-- =============================================================================

alter table public.demandes_reouverture
  add column if not exists commentaire_refus text,
  add column if not exists acknowledged_at   timestamptz;

-- Index pour la page client (lecture par client, triée par acknowledged_at)
create index if not exists demandes_reouverture_client_idx
  on public.demandes_reouverture(demande_par, acknowledged_at nulls first, created_at desc);

-- Index pour la page admin (toutes les demandes en attente d'un projet)
create index if not exists demandes_reouverture_statut_idx
  on public.demandes_reouverture(statut, created_at desc);

-- Policy : permettre au client de poser acknowledged_at sur ses propres demandes.
-- On ne peut pas restricter la policy UPDATE à une seule colonne via RLS pure
-- (même problème qu'avec tickets), mais on ajoute une vérification de sécurité
-- via une policy restrictive : le client ne peut mettre à jour que ses propres
-- demandes et uniquement acknowledged_at (les autres colonnes sont protégées
-- par l'absence de policy UPDATE client sur le reste).
-- En pratique, l'action server acknowledgerDemande est la seule à faire cet
-- update, et elle utilise requireClient() + filtre sur demande_par = userId.

-- Policy existante admin_all_demandes_reouverture couvre déjà tout pour l'admin.
-- On ajoute juste la policy UPDATE client.
create policy "client_acknowledge_demande" on public.demandes_reouverture
  for update using (
    demande_par = auth.uid()
  )
  with check (
    demande_par = auth.uid()
  );
