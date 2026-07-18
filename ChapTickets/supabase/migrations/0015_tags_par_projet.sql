-- =============================================================================
-- Sprint 13 — Tags génériques + tags exclusifs à un projet
-- =============================================================================
-- Décision (clarification sprint 13) : un tag exclusif appartient à UN SEUL
-- projet max (pas de many-to-many comme client_projets). projet_id null =
-- générique, visible/utilisable sur tous les projets.
-- =============================================================================

alter table public.tags add column projet_id uuid references public.projets(id) on delete cascade;

comment on column public.tags.projet_id is
  'Null = tag générique, utilisable sur n''importe quel projet. Renseigné = tag exclusif à ce seul projet — invisible ailleurs (cf. tagsVisiblesPourProjet, lib/types.ts).';

-- L'ancienne contrainte unique(nom) globale empêcherait deux projets
-- différents de créer chacun un tag exclusif portant le même nom (ex:
-- "urgent-client" côté projet A et côté projet B). On la remplace par deux
-- contraintes partielles : unicité parmi les génériques, unicité par projet
-- parmi les exclusifs — le nom reste libre de se répéter d'un projet à
-- l'autre.
alter table public.tags drop constraint tags_nom_key;

create unique index tags_nom_generique_unique on public.tags (nom) where projet_id is null;
create unique index tags_nom_projet_unique on public.tags (projet_id, nom) where projet_id is not null;

-- L'ancienne policy ouvrait la lecture à TOUT authenticated sans distinction
-- (pas de scoping avant ce sprint). Un client ne doit désormais voir que les
-- tags génériques + les tags exclusifs des projets auxquels il est rattaché.
drop policy "authenticated_read_tags" on public.tags;

create policy "client_read_generic_or_own_projet_tags"
  on public.tags for select
  using (
    projet_id is null
    or exists (
      select 1 from public.client_projets cp
      where cp.projet_id = tags.projet_id and cp.client_id = auth.uid()
    )
  );

-- Défense en profondeur : l'ancienne policy d'insert ne vérifiait que la
-- propriété du TICKET, pas la compatibilité du TAG avec son projet — un
-- client aurait pu poser un tag exclusif à un autre projet via un appel
-- direct à l'API REST. On vérifie maintenant aussi que le tag est générique
-- ou exclusif au même projet que le ticket.
drop policy "client_insert_own_ticket_tags" on public.ticket_tags;

create policy "client_insert_own_ticket_tags"
  on public.ticket_tags for insert
  with check (
    exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      join public.tags tg on tg.id = ticket_tags.tag_id
      where t.id = ticket_tags.ticket_id
        and cp.client_id = auth.uid()
        and (tg.projet_id is null or tg.projet_id = t.projet_id)
    )
  );
