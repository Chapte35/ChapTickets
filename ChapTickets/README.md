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
