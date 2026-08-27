-- =============================================================================
-- Migration 0032 : Auth Hook — injecter le rôle dans le JWT
--
-- Supabase appelle cette fonction à chaque émission / refresh de token.
-- Elle ajoute profiles.role dans app_metadata du JWT, ce qui permet au
-- middleware (proxy.ts) de lire le rôle SANS faire de requête DB
-- supplémentaire — corrige le 504 MIDDLEWARE_INVOCATION_TIMEOUT sur Vercel.
--
-- Après avoir appliqué cette migration, activer le hook dans le dashboard :
--   Authentication → Hooks → "Customize Access Token (JWT) Claim"
--   → choisir "PostgreSQL function" → public.custom_access_token_hook
-- =============================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims       jsonb;
  user_role    text;
begin
  -- Lire le rôle depuis profiles
  select role into user_role
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  -- Injecter dans app_metadata (accessible via user.app_metadata côté client
  -- ET depuis auth.jwt()->'app_metadata' côté RLS si besoin)
  if user_role is not null then
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      coalesce(claims->'app_metadata', '{}'::jsonb) || jsonb_build_object('role', user_role)
    );
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Permissions requises par Supabase pour appeler ce hook
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
