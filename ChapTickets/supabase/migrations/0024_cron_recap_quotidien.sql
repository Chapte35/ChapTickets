-- =============================================================================
-- Migration 0024 : cron job récap quotidien tickets en attente
-- Déclenche la Edge Function recap-quotidien-tickets chaque jour à 20h Paris.
-- Paris = UTC+1 en hiver, UTC+2 en été.
-- On programme à 19h UTC pour couvrir l'heure d'été (CEST = UTC+2).
-- En hiver (CET = UTC+1) ça partira à 20h UTC soit 21h Paris —
-- pour une précision exacte il faudrait un cron aware du fuseau (pg_cron
-- ne gère pas les timezones nativement). Alternative simple : utiliser
-- 18h UTC pour couvrir les deux cas au prix d'1h d'écart max.
-- Choix retenu : 18h UTC = 20h CEST (été) / 19h CET (hiver, 1h tôt).
-- À ajuster manuellement si la précision est critique.
-- =============================================================================

select cron.schedule(
  'recap-quotidien-tickets',          -- nom du job (unique)
  '0 18 * * *',                       -- chaque jour à 18h UTC
  $$
  select net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/recap-quotidien-tickets',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
