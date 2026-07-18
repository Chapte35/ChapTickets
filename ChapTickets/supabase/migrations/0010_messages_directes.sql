-- =============================================================================
-- Sprint 8 — Conversation directe par client (sans projet ni ticket)
-- =============================================================================
-- `messages.ticket_id` était nullable depuis l'origine (0001_init), en
-- anticipation de messages "libres" jamais implémentés. On tranche ici :
-- un message "libre" est une conversation directe client <-> admin,
-- indépendante de tout projet/ticket. On ajoute `client_id` pour savoir
-- à quel client appartient ce fil quand `ticket_id` est null (utile
-- notamment pour les réponses de l'admin, où auteur_id = admin).
-- =============================================================================

alter table public.messages
  add column client_id uuid references public.profiles(id) on delete cascade;

comment on column public.messages.client_id is
  'Rempli uniquement quand ticket_id est null : conversation directe avec ce client, indépendante de tout projet/ticket.';

-- Un message est SOIT lié à un ticket, SOIT une conversation directe avec
-- un client — jamais les deux, jamais ni l'un ni l'autre (sinon on ne
-- pourrait plus reconstituer à quel fil il appartient).
alter table public.messages
  add constraint messages_ticket_xor_client check (
    (ticket_id is not null and client_id is null)
    or (ticket_id is null and client_id is not null)
  );

-- Aucune ligne existante ne peut violer cette contrainte : le chemin
-- ticket_id null n'a jamais été exposé côté UI avant ce sprint, donc
-- toutes les lignes actuelles ont ticket_id renseigné.

create index messages_client_id_idx on public.messages (client_id) where client_id is not null;

-- La policy insert d'origine autorisait déjà `ticket_id is null` sans
-- aucune restriction (anticipation jamais complétée) — un client aurait
-- pu, en théorie, écrire un message libre non rattaché à lui. On la
-- resserre : un message libre doit maintenant pointer vers le client
-- auteur lui-même.
drop policy "client_create_message_own_visible_ticket" on public.messages;

create policy "client_create_message_own_visible_ticket"
  on public.messages for insert
  with check (
    auteur_id = auth.uid()
    and (
      (
        ticket_id is not null
        and exists (
          select 1 from public.tickets t
          join public.client_projets cp on cp.projet_id = t.projet_id
          where t.id = messages.ticket_id and cp.client_id = auth.uid()
        )
      )
      or (ticket_id is null and client_id = auth.uid())
    )
  );

-- La policy read d'origine ne couvrait pas le cas "l'admin m'a répondu
-- dans ma conversation directe" (auteur_id = admin, donc pas mon uid, et
-- pas de ticket à vérifier) : sans ça le client ne verrait jamais les
-- réponses de l'admin sur son propre fil direct.
drop policy "client_read_visible_messages" on public.messages;

create policy "client_read_visible_messages"
  on public.messages for select
  using (
    auteur_id = auth.uid()
    or client_id = auth.uid()
    or exists (
      select 1 from public.tickets t
      join public.client_projets cp on cp.projet_id = t.projet_id
      where t.id = messages.ticket_id and cp.client_id = auth.uid()
    )
  );
