# Gestion tickets — App interne

Application de gestion de tickets & communication client. Voir le cahier des
charges pour le détail fonctionnel.

Stack : Next.js 16 (App Router, Turbopack) · Supabase (DB/Auth) · shadcn/ui ·
Tailwind v4.

## Sprint 0 — ce qui est fait

- Projet Next.js scaffoldé (TypeScript, ESLint, Tailwind v4, `src/` dir)
- shadcn/ui câblé manuellement (style `new-york`, base `neutral`) — CLI
  interactive indisponible en sandbox, composants ajoutés à la main :
  `button`, `card`, `input`, `label`, `badge`
- Client Supabase (browser + server + proxy pour le refresh de session)
- Schéma DB initial + RLS de base : `supabase/migrations/0001_init.sql`
- Build + lint vérifiés OK

## Sprint 1 — ce qui est fait

- Connexion email/mot de passe (`/login`), déconnexion
- **Décision prise** (cahier des charges, point ouvert) : invitation client
  par email via `supabase.auth.admin.inviteUserByEmail` — l'admin crée le
  compte depuis `/admin/clients`, le client reçoit un lien pour définir son
  mot de passe. Pas de mot de passe temporaire à transmettre à la main.
- `src/proxy.ts` protège les routes par rôle : `/admin/*` → admin only,
  `/dashboard/*` → client only, `/` redirige vers le bon espace selon
  connexion + rôle
- Chaque layout (`admin/layout.tsx`, `dashboard/layout.tsx`) revérifie le
  rôle côté serveur en plus du proxy — défense en profondeur, pas de
  confiance aveugle en une seule couche
- `/admin/clients` : liste des clients + formulaire d'invitation

### À tester une fois Supabase configuré

L'email d'invitation Supabase par défaut pointe vers l'URL du projet
Supabase, pas vers ton app. À vérifier dans **Auth → URL Configuration** :
`Site URL` doit pointer vers ton URL de dev/prod, sinon le lien
d'invitation renvoie le client au mauvais endroit.

### Dette technique assumée (à traiter plus tard, pas maintenant)

- Pas de types Supabase générés (`supabase gen types typescript`) : les
  requêtes `.from("profiles")` ne sont pas typées contre le vrai schéma.
  À faire dès que le schéma se stabilise un peu, ça évite des fautes de
  frappe sur les noms de colonnes qui ne pètent qu'à l'exécution.
- Le rôle est relu en DB à chaque requête protégée (proxy + layout) : pas de
  cache, pas de claim JWT custom. Fonctionnel mais pas optimal si le trafic
  grossit.

## Sprint 2 — ce qui est fait

- CRUD tickets : création (admin + client), liste avec filtres (statut,
  priorité, projet, et client côté admin), vue détail
- **Décision prise** (répondu par toi) : seul l'admin change le statut d'un
  ticket. Aucune policy `UPDATE` sur `tickets` pour le rôle client — ce
  n'est pas juste une règle applicative, c'est imposé par la RLS.
- Demande de réouverture : un client sur un ticket `résolu`/`fermé` peut
  envoyer une demande (table à part `demandes_reouverture`, insert-only
  pour le client). L'admin accepte (→ ticket repasse `ouvert`) ou refuse,
  depuis `/admin/tickets/[id]`.
- **Hypothèse prise faute de réponse** : formulaire admin de création =
  projet d'abord, puis client filtré parmi ceux rattachés à ce projet
  (many-to-many oblige). Dis-moi si c'est pas ce que tu voulais, c'est un
  refactor rapide du composant `create-ticket-form.tsx`.

### ⚠️ Pour tester, il te faut au moins un projet + un rattachement client

Il n'y a **volontairement aucune UI de création de projet** à ce stade —
c'est prévu au Sprint 4/5 du découpage (idées de projets → projet formel).
En attendant, crée tes données de test via le **Table Editor** Supabase :

1. Table `projets` : insère une ligne (`nom` suffit)
2. Table `client_projets` : insère une ligne reliant un `client_id`
   (un id de la table `profiles` où `role = 'client'`) au `projet_id`
   créé juste avant

Sans ce rattachement, les selects "projet"/"client" des formulaires de
création de ticket seront vides — c'est le comportement RLS attendu, pas
un bug.

### Nouvelle migration à appliquer

`supabase/migrations/0002_reopen_requests.sql` — même procédure que pour
la 0001 (SQL Editor ou `supabase db push`).

### Dette technique supplémentaire

- Les jointures Supabase (`profiles!tickets_client_id_fkey`) reposent sur
  les noms de contraintes FK auto-générés par Postgres. Si un jour tu
  renommes une contrainte, ces requêtes cassent silencieusement côté
  build (erreur runtime, pas de type-check possible sans types générés —
  encore une raison de faire `supabase gen types typescript` bientôt).

## Sprint 3 — ce qui est fait

- Thread de messages par ticket, admin + client, sur `/admin/tickets/[id]`
  et `/dashboard/tickets/[id]`
- **Pas de nouvelle migration** : la RLS sur `messages` était déjà posée au
  Sprint 0 (cloisonnement par visibilité du ticket, cf. section 4.3 du
  cahier). Ce sprint n'a ajouté que l'UI et les Server Actions.
- Messages "libres" (non rattachés à un ticket, section 4.3 "à trancher")
  **non implémentés** — le champ `messages.ticket_id` reste nullable en
  base par anticipation, mais aucune UI ne permet d'en créer. Décision à
  prendre explicitement si tu veux ça.
- Bulle admin/client visuellement distinguée (couleur + label "Admin" vs
  nom du client) via le rôle du profil auteur.

### Point d'attention : pas de rafraîchissement automatique en temps réel

Si l'admin et le client ont chacun la page ouverte en même temps, aucun des
deux ne voit le message de l'autre apparaître tout seul — il faut recharger
la page. Pas de WebSocket/Supabase Realtime branché, ce n'était pas dans le
périmètre demandé pour ce sprint. À évaluer plus tard si l'usage réel en a
besoin (Supabase Realtime s'y prête bien, mais c'est un morceau de
complexité en plus — gestion des abonnements, cleanup, etc. — à ne pas
ajouter sans que le besoin soit confirmé).

## Sprint 4 — ce qui est fait

- CRUD idées de projets (`/admin/idees`) : titre, description, statut
  (idée / à explorer / validée / abandonnée). Backlog 100% privé — RLS
  n'accorde aucun accès au rôle client, il n'y a même pas de policy à
  désactiver, juste aucune (cf. migration 0001, section "idees_projets").
- **Décision prise** (répondu par toi) : idées et projets **pas liés
  obligatoirement**. Nouvelle colonne `idees_projets.projet_id`, nullable,
  purement traçabilité. Un projet peut exister sans idée d'origine, une
  idée peut ne jamais devenir un projet.
- Bouton "Transformer en projet" : crée une ligne dans `projets` (nom
  éditable, pré-rempli avec le titre de l'idée) et rattache l'idée via
  `projet_id`. Ne touche pas au statut de l'idée — rien ne l'y oblige.
- **Refactor** : `requireAdmin()`/`requireClient()` centralisés dans
  `src/lib/auth/guards.ts`. Étaient dupliqués dans
  `admin/tickets/actions.ts` et `dashboard/tickets/actions.ts` ; dès
  qu'un 3e fichier (`admin/idees/actions.ts`) en avait besoin, la
  duplication n'était plus défendable. Si tu ajoutes de nouvelles Server
  Actions, importe depuis ce fichier plutôt que de recopier le pattern.

### Nouvelle migration à appliquer

`supabase/migrations/0003_idee_projet_link.sql` — un simple `alter table`,
rien de destructeur.

## Layout — sidebar collapsible (avant Sprint 5)

Remplace la navbar horizontale par une sidebar façon Supabase, sur les deux
layouts (`admin/layout.tsx`, `dashboard/layout.tsx`).

- **Composant partagé** : `src/components/app-sidebar.tsx`, réutilisé par
  les deux côtés avec des `items` différents
- **État persisté en cookie** (`sidebar_collapsed`, 1 an, non httpOnly —
  c'est une préférence d'affichage, pas une donnée sensible), lu côté
  serveur dans chaque layout pour éviter un flash "ouvert puis réduit" au
  chargement de page
- **Mode réduit** : icônes seules + tooltips (nouveau composant shadcn
  `tooltip.tsx`, `@radix-ui/react-tooltip`)
- Fait maintenant plutôt qu'au Sprint 6 ("polish UI") comme prévu au
  découpage initial : le Sprint 5 (vue kanban/timeline des projets) a
  besoin de largeur horizontale, autant avoir la disposition finale avant
  de construire une vue dedans plutôt que de la re-caser après coup.

## Layout — dark mode (avant Sprint 5, dans la foulée de la sidebar)

- `next-themes`, thème **sombre par défaut**, pas de suivi des préférences
  système (choix explicite : `enableSystem={false}` dans
  `src/app/layout.tsx`)
- Toggle clair/sombre dans la sidebar, juste au-dessus du bouton de
  déconnexion, même traitement icône-seule + tooltip en mode réduit
- Persisté en `localStorage` par next-themes (comportement standard de la
  lib, différent du cookie de la sidebar — ce n'est pas une incohérence,
  juste deux mécanismes différents pour deux préférences différentes)
- Les tokens CSS `.dark` étaient déjà présents depuis l'application du
  preset shadcn (Sprint 2), simplement jamais activés — ce sprint active
  l'interrupteur, ne redessine rien

## Sprint 5 — ce qui est fait

- **CRUD projets complet** (`/admin/projets`) — ça n'existait pas avant,
  tu bricolais ça dans le Table Editor depuis le Sprint 2. Fini.
- **Kanban avec vrai drag & drop** (`@dnd-kit/core`), colonnes = statuts.
  Update optimiste : la carte bouge tout de suite, se remet en place toute
  seule si le serveur refuse (déconnexion, RLS, etc.)
- **Décision prise** (statuts jamais définis avant ce sprint) : 4 colonnes
  fixes — À démarrer / En cours / En pause / Terminé. L'ordre dans
  `PROJET_STATUTS` (`src/lib/types.ts`) définit l'ordre des colonnes, pas
  juste une liste.
- Fiche projet (`/admin/projets/[id]`) : édition nom/description, statut
  (redondant avec le kanban mais pratique sans y retourner), gestion des
  clients rattachés (ajout/retrait, many-to-many via `client_projets`)
- Suppression de projet : bloquée par la DB si des tickets y sont encore
  rattachés (`on delete restrict` posé dès la migration 0001) — le message
  de confirmation le rappelle avant que tu cliques et tombes sur une
  erreur Postgres opaque.

### Nouvelle migration à appliquer

`supabase/migrations/0004_projet_statut_constraint.sql` — verrouille les
valeurs de `projets.statut` aux 4 ci-dessus. Si tu as des projets de test
avec un statut hors de cette liste (peu probable vu que le défaut était
`'en_cours'`, qui reste valide), la migration échouera : vérifie avant.

### Point d'attention découvert en cours de route (Sprint 4 → Sprint 5)

Le bug de sérialisation React (icônes passées en props depuis un Server
Component) qu'on a corrigé après le Sprint "sidebar" — j'ai vérifié qu'il
ne se reproduit pas ici : tous les nouveaux composants client
(`kanban-board.tsx`, `projet-edit-form.tsx`, etc.) importent leurs Server
Actions directement plutôt que de les recevoir en props. Pattern à garder
pour la suite : une Server Action s'importe, elle ne se transmet pas.

## Sprint 6 — ce qui est fait

- **Dashboard admin** (`/admin`) : urgences (priorité urgente, pas encore
  résolues/fermées), tickets récents, projets en cours avec compteur de
  tickets
- **Dashboard client** (`/dashboard`) : messages non lus, tickets récents
- **Nouvelle infrastructure nécessaire** : rien dans le schéma ne traçait
  ce qu'un utilisateur avait "déjà vu" — `messages non lus` était
  irréalisable sans ça. Table `lectures_tickets` (Sprint 6, migration
  0005) : un horodatage par couple ticket/utilisateur, mis à jour à
  chaque visite de la fiche ticket (`src/components/mark-ticket-read.tsx`,
  effet client au montage — pas une mutation cachée dans le rendu d'un
  Server Component, cf. commentaire dans le fichier pour le pourquoi).
- Le "polish UI shadcn" du découpage initial était déjà largement couvert
  par la sidebar + le dark mode faits avant ce sprint. Rien d'autre ajouté
  ici à ce titre.

### Nouvelle migration à appliquer

`supabase/migrations/0005_lectures_tickets.sql`

### Limite connue, assumée

Le calcul des non-lus se fait en récupérant tous les messages concernés
et en comparant en mémoire côté serveur (pas de requête SQL agrégée
unique) — largement suffisant à l'échelle d'un MVP, mais si le volume de
messages devient important un jour, ça vaudra le coup de remplacer ça par
une vraie requête agrégée (voire une colonne dénormalisée mise à jour par
trigger). Pas un problème maintenant, juste un point à garder en tête.

## Ce qu'il te reste à faire (je n'ai pas les accès pour ça)

### 1. Créer le projet Supabase

1. https://supabase.com/dashboard → New project
2. Une fois créé : **Project Settings → API**, récupère `Project URL` et
   `anon public key`
3. Copie `.env.example` en `.env.local` et remplis les deux variables
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. `SUPABASE_SERVICE_ROLE_KEY` : dans **Project Settings → API**, section
   `service_role`. Ne JAMAIS commiter cette clé (déjà dans `.gitignore` via
   `.env*`, mais vérifie deux fois plutôt qu'une).

### 2. Appliquer le schéma initial

Le plus simple sans installer la CLI Supabase : ouvrir **SQL Editor** dans le
dashboard Supabase, coller le contenu de `supabase/migrations/0001_init.sql`,
exécuter.

Si tu préfères la CLI (recommandé pour la suite, pour versionner proprement
les migrations) :

```bash
npm install -g supabase
supabase login
supabase link --project-ref <ton-project-ref>
supabase db push
```

### 3. Créer le repo GitHub privé

```bash
cd ticket-app
git init
git add .
git commit -m "Sprint 0: setup Next.js + shadcn + Supabase, schéma DB initial"
gh repo create <nom-du-repo> --private --source=. --remote=origin
git push -u origin main
```

(Pas de `gh` CLI ? Crée le repo vide sur github.com d'abord, puis
`git remote add origin <url>` et `git push -u origin main`.)

Une fois le repo créé : génère le token fine-grained PAT en lecture seule
mentionné dans le cahier des charges (**Settings → Developer settings →
Fine-grained tokens**, scope `Contents: Read-only` sur ce repo uniquement) et
fournis-le en début de session la prochaine fois que tu veux que je lise le
repo directement.

### 4. Déploiement (Vercel, à priori — pas tranché explicitement dans le cahier)

```bash
npm install -g vercel
vercel
```

Ajoute les 3 variables d'env (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) dans
**Vercel → Project Settings → Environment Variables**, pas seulement en
local — sinon le build de prod plante sur l'auth Supabase.

## Lancer en local

```bash
npm install
npm run dev
```

## Notes techniques (pour ta maintenabilité, pas pour te faire plaisir)

- **Pas de `next/font/google`** dans `layout.tsx` : ça dépend d'un fetch
  réseau vers `fonts.googleapis.com` au build, ce qui a cassé le build en
  sandbox et cassera pareil sur n'importe quel CI sans accès sortant à ce
  domaine. Stack de polices système à la place. Si tu veux une police
  précise, utilise `next/font/local` avec un fichier de police committé.
- **`middleware.ts` → `proxy.ts`** : Next.js 16 a renommé la convention.
  Le fichier est `src/proxy.ts`, export nommé `proxy`. Ne pas recréer un
  `middleware.ts` par réflexe en copiant un vieux tuto.
- **RLS** : `supabase/migrations/0001_init.sql` couvre le cloisonnement de
  base (lecture). Les policies d'écriture sur `tickets`/`messages` sont
  volontairement minimales — seront complétées en Sprint 2/3 quand les flux
  de mise à jour de statut, assignation, etc. seront précisés.
- **`idees_projets`** n'a qu'une seule policy (admin). C'est voulu : sans
  policy pour `client`, RLS bloque tout accès par défaut. Ne pas "corriger"
  ça en ajoutant une policy client sans relire la section 3 du cahier des
  charges.
