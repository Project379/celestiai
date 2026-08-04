-- Schema hardening — CA-0002 (origin: packages/db/drizzle/0008_schema_hardening.sql).
--
-- Originally authored on the CA-0002-improve-backend branch and applied to
-- production via the Supabase dashboard during PR #5 review (commit
-- d7dc548, 2026-04-13). This file is migration-history hygiene under
-- Strategy C (B.0a — supabase/migrations canonical, Drizzle removed):
-- the SQL body is verbatim from the Drizzle file, the filename timestamp
-- is the actual commit date in UTC (2026-04-13 14:15:04), and the
-- migration is expected to be marked already-applied via:
--
--   supabase migration repair --status applied 20260413141504
--
-- so that `supabase db push` against the existing production database
-- skips re-running it. A fresh dev DB replaying history will execute the
-- statements in chronological order alongside the other migrations.
--
-- Touches:
--   * subscription_tier / subscription_status enums
--   * users table column extensions + tier rebuild via _new column swap
--   * type realignments on bulgarian_cities (lat/lon/population) and
--     charts (lat/lon, birth_date, birth_time, approximate_time_range)
--   * users back-population from referencing tables (FK readiness)
--   * audit_logs back-patch — system.* prefix on rows with NULL user_id
--   * FK additions across charts / ai_readings / daily_horoscopes /
--     push_subscriptions / audit_logs (CASCADE / SET NULL as appropriate)
--   * daily_horoscopes / daily_transits date column type fix + UNIQUE
--     constraints
--   * indexes for hot lookup paths (charts.user_id, ai_readings cache,
--     daily_horoscopes chart×date, audit_logs trail, users.stripe_*)
--   * subscription_quotas table — USER_DATA SELECT-only per
--     .planning/SECURITY-MODEL.md classification. Wiring into
--     /api/oracle/generate cap-gate fires in B.0f (separate sub-round
--     after B.0c close — see .planning/phases/phase-b-mobile-parity
--     handoff for B.0f spec).
--   * RLS enable + owner_all policies on charts / ai_readings /
--     daily_horoscopes / push_subscriptions; owner_select on
--     subscription_quotas. Note: B.0d's lockdown migration (applied via
--     SQL Editor 2026-05-09, INTERNAL/CATALOG tables) is independent —
--     it covers the tables 0008 left untouched.

CREATE TYPE public.subscription_tier AS ENUM ('free', 'premium');
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'past_due', 'trialing');

ALTER TABLE public.users
  ADD COLUMN subscription_status public.subscription_status NOT NULL DEFAULT 'inactive';

ALTER TABLE public.users
  ADD COLUMN subscription_tier_new public.subscription_tier NOT NULL DEFAULT 'free';

UPDATE public.users
SET subscription_tier_new =
  CASE
    WHEN subscription_tier::text = 'premium' THEN 'premium'::public.subscription_tier
    ELSE 'free'::public.subscription_tier
  END;

ALTER TABLE public.users DROP COLUMN subscription_tier;
ALTER TABLE public.users RENAME COLUMN subscription_tier_new TO subscription_tier;
ALTER TABLE public.users ALTER COLUMN subscription_tier SET DEFAULT 'free'::public.subscription_tier;
ALTER TABLE public.users ALTER COLUMN subscription_tier SET NOT NULL;

UPDATE public.users
SET subscription_status = 'active'
WHERE stripe_subscription_id IS NOT NULL
  AND (subscription_expires_at IS NULL OR subscription_expires_at > now());

ALTER TABLE public.users
  ADD CONSTRAINT users_subscription_tier_valid
  CHECK (subscription_tier IN ('free'::public.subscription_tier, 'premium'::public.subscription_tier));

ALTER TABLE public.bulgarian_cities
  ALTER COLUMN latitude TYPE double precision USING latitude::double precision,
  ALTER COLUMN longitude TYPE double precision USING longitude::double precision,
  ALTER COLUMN population TYPE integer USING round(population)::integer;

ALTER TABLE public.charts
  ALTER COLUMN latitude TYPE double precision USING latitude::double precision,
  ALTER COLUMN longitude TYPE double precision USING longitude::double precision;

ALTER TABLE public.charts ADD COLUMN birth_date_new date;

UPDATE public.charts
SET birth_date_new = (birth_date AT TIME ZONE 'UTC')::date;

ALTER TABLE public.charts ALTER COLUMN birth_date_new SET NOT NULL;
ALTER TABLE public.charts DROP COLUMN birth_date;
ALTER TABLE public.charts RENAME COLUMN birth_date_new TO birth_date;

ALTER TABLE public.charts ADD COLUMN birth_time_parsed time without time zone;

UPDATE public.charts
SET birth_time_parsed = birth_time::time
WHERE birth_time_known = true
  AND birth_time IS NOT NULL
  AND birth_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$';

ALTER TABLE public.charts DROP COLUMN birth_time;
ALTER TABLE public.charts RENAME COLUMN birth_time_parsed TO birth_time;

ALTER TABLE public.charts ADD COLUMN approximate_time_range_new tstzrange;
ALTER TABLE public.charts DROP COLUMN approximate_time_range;
ALTER TABLE public.charts RENAME COLUMN approximate_time_range_new TO approximate_time_range;

INSERT INTO public.users (clerk_id, subscription_tier)
SELECT DISTINCT source.user_id, 'free'::public.subscription_tier
FROM (
  SELECT user_id FROM public.charts WHERE user_id IS NOT NULL
  UNION
  SELECT user_id FROM public.ai_readings WHERE user_id IS NOT NULL
  UNION
  SELECT user_id FROM public.daily_horoscopes WHERE user_id IS NOT NULL
  UNION
  SELECT user_id FROM public.push_subscriptions WHERE user_id IS NOT NULL
  UNION
  SELECT user_id FROM public.audit_logs WHERE user_id IS NOT NULL
) AS source
ON CONFLICT (clerk_id) DO NOTHING;

UPDATE public.audit_logs
SET event_type = 'system.' || event_type
WHERE user_id IS NULL
  AND event_type NOT LIKE 'system.%';

ALTER TABLE public.charts
  ADD CONSTRAINT charts_user_id_users_clerk_id_fk
  FOREIGN KEY (user_id) REFERENCES public.users(clerk_id) ON DELETE CASCADE;

ALTER TABLE public.ai_readings
  ADD CONSTRAINT ai_readings_user_id_users_clerk_id_fk
  FOREIGN KEY (user_id) REFERENCES public.users(clerk_id) ON DELETE CASCADE;

ALTER TABLE public.daily_horoscopes
  ADD CONSTRAINT daily_horoscopes_user_id_users_clerk_id_fk
  FOREIGN KEY (user_id) REFERENCES public.users(clerk_id) ON DELETE CASCADE;

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_users_clerk_id_fk
  FOREIGN KEY (user_id) REFERENCES public.users(clerk_id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_users_clerk_id_fk
  FOREIGN KEY (user_id) REFERENCES public.users(clerk_id) ON DELETE SET NULL;

ALTER TABLE public.daily_horoscopes ADD COLUMN date_new date;

UPDATE public.daily_horoscopes
SET date_new = date::date;

ALTER TABLE public.daily_horoscopes ALTER COLUMN date_new SET NOT NULL;
ALTER TABLE public.daily_horoscopes DROP COLUMN date;
ALTER TABLE public.daily_horoscopes RENAME COLUMN date_new TO date;

ALTER TABLE public.daily_transits ADD COLUMN date_new date;

UPDATE public.daily_transits
SET date_new = date::date;

ALTER TABLE public.daily_transits ALTER COLUMN date_new SET NOT NULL;
ALTER TABLE public.daily_transits DROP COLUMN date;
ALTER TABLE public.daily_transits RENAME COLUMN date_new TO date;

ALTER TABLE public.daily_horoscopes
  ADD CONSTRAINT daily_horoscopes_chart_date_unique UNIQUE (chart_id, date);

ALTER TABLE public.daily_transits
  ADD CONSTRAINT daily_transits_date_unique UNIQUE (date);

CREATE TABLE public.subscription_quotas (
  user_id text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  ai_readings_used integer NOT NULL DEFAULT 0,
  ai_readings_limit integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start),
  FOREIGN KEY (user_id) REFERENCES public.users(clerk_id) ON DELETE CASCADE
);

CREATE INDEX subscription_quotas_user_period_start_idx
  ON public.subscription_quotas (user_id, period_start DESC);

CREATE INDEX charts_user_id_idx
  ON public.charts (user_id);

CREATE INDEX ai_readings_chart_id_idx
  ON public.ai_readings (chart_id);

CREATE INDEX ai_readings_expires_at_idx
  ON public.ai_readings (expires_at);

CREATE INDEX ai_readings_chart_topic_expires_at_idx
  ON public.ai_readings (chart_id, topic, expires_at DESC);

CREATE INDEX daily_horoscopes_chart_date_desc_idx
  ON public.daily_horoscopes (chart_id, date DESC);

CREATE INDEX daily_horoscopes_user_id_idx
  ON public.daily_horoscopes (user_id);

CREATE INDEX audit_logs_user_created_at_idx
  ON public.audit_logs (user_id, created_at DESC);

CREATE INDEX audit_logs_event_type_idx
  ON public.audit_logs (event_type);

CREATE INDEX users_stripe_customer_id_idx
  ON public.users (stripe_customer_id);

CREATE INDEX users_active_subscription_expires_at_idx
  ON public.users (subscription_expires_at)
  WHERE subscription_status = 'active';

ALTER TABLE public.charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_horoscopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY charts_owner_all
  ON public.charts
  FOR ALL
  USING (user_id = auth.jwt() ->> 'sub')
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY ai_readings_owner_all
  ON public.ai_readings
  FOR ALL
  USING (user_id = auth.jwt() ->> 'sub')
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY daily_horoscopes_owner_all
  ON public.daily_horoscopes
  FOR ALL
  USING (user_id = auth.jwt() ->> 'sub')
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY push_subscriptions_owner_all
  ON public.push_subscriptions
  FOR ALL
  USING (user_id = auth.jwt() ->> 'sub')
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY subscription_quotas_owner_select
  ON public.subscription_quotas
  FOR SELECT
  USING (user_id = auth.jwt() ->> 'sub');
