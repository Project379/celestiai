-- NOT applied to production by this session, per the sweep's own §1.5
-- "do not run supabase db push" warning — this file was written and
-- self-verified against a read-only production schema dump (every column,
-- type, nullability, default, constraint, and index cross-checked
-- programmatically against live information_schema/pg_catalog output;
-- zero missing, zero extra) but never executed. Safe reconciliation per
-- the sweep: run `supabase migration repair --status applied 20260826150000`
-- (it is a documentary capture, byte-verified against production, not a
-- schema change — repair marks it applied without re-running the DDL,
-- the same shape used for the other capture migrations already in this
-- directory). Do NOT `supabase db push` this file blind.
--
-- Capture of 16 production tables with ZERO migration history — found
-- during the 2026-08-26 technical sweep (§1.4), the same class of gap as
-- processed_webhook_events and the Stream K capture
-- (20260803101500_capture_stream_k_relationship_schema.sql), sixteen
-- times over: ai_readings, audit_logs, bulgarian_cities,
-- chart_calculations, charts, crystal_listings, crystal_recommendations,
-- crystal_vendors, crystals, daily_horoscopes, daily_transits,
-- processed_webhook_events, push_subscriptions, user_crystals,
-- user_daily_crystals, users. These are the Drizzle-era tables —
-- packages/db/drizzle was deleted, so their base schema had no SQL
-- record anywhere (an empty vestigial __drizzle_migrations table is still
-- sitting in production).
--
-- Extracted verbatim from production via direct information_schema /
-- pg_catalog queries (columns, pg_get_constraintdef, pg_indexdef,
-- pg_policies) 2026-08-26 — not reconstructed from memory or inference.
-- Written to be idempotent: CREATE TABLE IF NOT EXISTS so it no-ops
-- against production (where these tables already exist in this exact
-- shape) and builds correctly on a fresh database. Policies use DROP …
-- IF EXISTS + CREATE since Postgres has no CREATE POLICY IF NOT EXISTS.
--
-- RLS scope: 9 of these 16 already have their RLS/policies captured
-- elsewhere and are NOT repeated here — bulgarian_cities, crystals,
-- crystal_listings, crystal_vendors, user_crystals, user_daily_crystals,
-- daily_transits, processed_webhook_events
-- (20260803102000_b0d_rls_lockdown_capture.sql), and
-- crystal_recommendations (20260803100000_crystal_recommendations_rls.sql).
-- This file captures ONLY their CREATE TABLE + indexes. The remaining 7
-- (ai_readings, audit_logs, chart_calculations, charts, daily_horoscopes,
-- push_subscriptions, users) get their RLS captured here too, since
-- nothing else does.
--
-- Known gaps captured AS-IS, not silently fixed: user_crystals.user_id
-- and user_daily_crystals.user_id have no FK to users (sweep findings
-- #6/#13 — see supabase/migrations/20260826140000_user_crystals_fk.sql,
-- prepared but not applied pending a founder decision on real orphaned
-- production rows it found). crystal_recommendations.user_id likewise has
-- no FK to users (only chart_id cascades). users.stripe_customer_id is
-- captured with its real duplicate index (users_stripe_customer_id_idx
-- alongside the users_stripe_customer_id_unique constraint's own index) —
-- redundant, harmless, and this file mirrors reality rather than
-- correcting it.
--
-- Dependency order: users and other no-dependency tables first; charts
-- (needs users, bulgarian_cities) before anything FK'ing to it;
-- crystals/crystal_vendors before crystal_listings/crystal_recommendations
-- /user_crystals/user_daily_crystals.

-- ─── users (needed by almost everything below) ─────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_expires_at timestamptz,
  deleted_at timestamptz,
  deletion_scheduled_at timestamptz,
  subscription_status public.subscription_status NOT NULL DEFAULT 'inactive'::public.subscription_status,
  subscription_tier public.subscription_tier NOT NULL DEFAULT 'free'::public.subscription_tier
    CONSTRAINT users_subscription_tier_valid
      CHECK (subscription_tier = ANY (ARRAY['free'::public.subscription_tier, 'premium'::public.subscription_tier])),
  trial_claimed_at timestamptz,
  subscription_provider text NOT NULL DEFAULT 'stripe'
    CONSTRAINT users_subscription_provider_check
      CHECK (subscription_provider = ANY (ARRAY['stripe'::text, 'revenuecat'::text])),
  CONSTRAINT users_clerk_id_unique UNIQUE (clerk_id),
  CONSTRAINT users_stripe_customer_id_unique UNIQUE (stripe_customer_id)
);

CREATE INDEX IF NOT EXISTS users_stripe_customer_id_idx ON public.users USING btree (stripe_customer_id);
CREATE INDEX IF NOT EXISTS users_active_subscription_expires_at_idx
  ON public.users USING btree (subscription_expires_at)
  WHERE (subscription_status = 'active'::public.subscription_status);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Zero policies (INTERNAL per SECURITY-MODEL.md) — deny-all to anon/
-- authenticated, service-role client bypasses via BYPASSRLS. Matches the
-- sweep's §1.1 VERIFIED posture for this table.

-- ─── bulgarian_cities (CATALOG, public read — RLS captured elsewhere) ──

CREATE TABLE IF NOT EXISTS public.bulgarian_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ascii text NOT NULL,
  oblast text NOT NULL,
  ekatte text,
  type text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  population integer
);

CREATE INDEX IF NOT EXISTS cities_name_ascii_idx ON public.bulgarian_cities USING btree (name_ascii);
CREATE INDEX IF NOT EXISTS cities_type_idx ON public.bulgarian_cities USING btree (type);

-- ─── crystals (CATALOG, public read — RLS captured elsewhere) ──────────

CREATE TABLE IF NOT EXISTS public.crystals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name_en text NOT NULL,
  name_bg text,
  tagline_en text NOT NULL,
  tagline_bg text,
  description_en text NOT NULL,
  description_bg text,
  planet text,
  zodiac_signs jsonb NOT NULL DEFAULT '[]'::jsonb,
  moon_phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  element text,
  chakra text,
  hardness real,
  color_primary text NOT NULL,
  color_secondary text NOT NULL,
  color_accent text,
  svg_variant text NOT NULL DEFAULT 'tumbled',
  rarity text NOT NULL DEFAULT 'common',
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  properties jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crystals_slug_unique UNIQUE (slug)
);

-- ─── crystal_vendors (CATALOG, public read — RLS captured elsewhere) ───

CREATE TABLE IF NOT EXISTS public.crystal_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  country text NOT NULL DEFAULT 'BG',
  integration_type text NOT NULL DEFAULT 'affiliate',
  website text,
  api_config jsonb,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crystal_vendors_slug_unique UNIQUE (slug)
);

-- ─── charts (USER_DATA — RLS captured here, not elsewhere) ─────────────

CREATE TABLE IF NOT EXISTS public.charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL
    CONSTRAINT charts_user_id_users_clerk_id_fk REFERENCES public.users (clerk_id) ON DELETE CASCADE,
  name text NOT NULL,
  birth_time_known boolean NOT NULL DEFAULT true,
  city_id uuid
    CONSTRAINT charts_city_id_bulgarian_cities_id_fk REFERENCES public.bulgarian_cities (id),
  city_name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  birth_date date NOT NULL,
  birth_time time,
  approximate_time_range text
);

CREATE INDEX IF NOT EXISTS charts_user_id_idx ON public.charts USING btree (user_id);

ALTER TABLE public.charts ENABLE ROW LEVEL SECURITY;

-- Production carries both a blanket owner_all policy AND four granular
-- per-action ones on this table — redundant (owner_all alone would
-- suffice) but captured exactly as live, not simplified.
DROP POLICY IF EXISTS charts_owner_all ON public.charts;
CREATE POLICY charts_owner_all
  ON public.charts
  FOR ALL
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS charts_select_own ON public.charts;
CREATE POLICY charts_select_own
  ON public.charts
  FOR SELECT
  USING ((SELECT auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS charts_insert_own ON public.charts;
CREATE POLICY charts_insert_own
  ON public.charts
  FOR INSERT
  WITH CHECK ((SELECT auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS charts_update_own ON public.charts;
CREATE POLICY charts_update_own
  ON public.charts
  FOR UPDATE
  USING ((SELECT auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((SELECT auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS charts_delete_own ON public.charts;
CREATE POLICY charts_delete_own
  ON public.charts
  FOR DELETE
  USING ((SELECT auth.jwt() ->> 'sub') = user_id);

-- ─── chart_calculations (INTERNAL, zero policies — RLS captured here) ──

CREATE TABLE IF NOT EXISTS public.chart_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id uuid NOT NULL
    CONSTRAINT chart_calculations_chart_id_charts_id_fk REFERENCES public.charts (id) ON DELETE CASCADE,
  planet_positions jsonb NOT NULL,
  house_cusps jsonb NOT NULL,
  aspects jsonb NOT NULL,
  ascendant jsonb NOT NULL,
  mc jsonb NOT NULL,
  birth_time_known boolean NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chart_calculations_chart_id_unique UNIQUE (chart_id)
);

ALTER TABLE public.chart_calculations ENABLE ROW LEVEL SECURITY;
-- Zero policies (INTERNAL) — service-role only, matching sweep §1.1.

-- ─── ai_readings (USER_DATA — RLS captured here) ───────────────────────

CREATE TABLE IF NOT EXISTS public.ai_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id uuid NOT NULL
    CONSTRAINT ai_readings_chart_id_charts_id_fk REFERENCES public.charts (id) ON DELETE CASCADE,
  user_id text NOT NULL
    CONSTRAINT ai_readings_user_id_users_clerk_id_fk REFERENCES public.users (clerk_id) ON DELETE CASCADE,
  topic text NOT NULL,
  content text NOT NULL,
  teaser_content text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_regenerated_at timestamptz,
  model_version text NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_readings_chart_id_idx ON public.ai_readings USING btree (chart_id);
CREATE UNIQUE INDEX IF NOT EXISTS ai_readings_chart_id_topic_idx ON public.ai_readings USING btree (chart_id, topic);
CREATE INDEX IF NOT EXISTS ai_readings_chart_topic_expires_at_idx
  ON public.ai_readings USING btree (chart_id, topic, expires_at DESC);
CREATE INDEX IF NOT EXISTS ai_readings_expires_at_idx ON public.ai_readings USING btree (expires_at);

ALTER TABLE public.ai_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_readings_owner_all ON public.ai_readings;
CREATE POLICY ai_readings_owner_all
  ON public.ai_readings
  FOR ALL
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- ─── daily_horoscopes (USER_DATA — RLS captured here) ──────────────────

CREATE TABLE IF NOT EXISTS public.daily_horoscopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id uuid NOT NULL
    CONSTRAINT daily_horoscopes_chart_id_charts_id_fk REFERENCES public.charts (id) ON DELETE CASCADE,
  user_id text NOT NULL
    CONSTRAINT daily_horoscopes_user_id_users_clerk_id_fk REFERENCES public.users (clerk_id) ON DELETE CASCADE,
  content text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  model_version text NOT NULL,
  date date NOT NULL,
  CONSTRAINT daily_horoscopes_chart_date_unique UNIQUE (chart_id, date)
);

CREATE INDEX IF NOT EXISTS daily_horoscopes_chart_date_desc_idx
  ON public.daily_horoscopes USING btree (chart_id, date DESC);
CREATE INDEX IF NOT EXISTS daily_horoscopes_user_id_idx ON public.daily_horoscopes USING btree (user_id);

ALTER TABLE public.daily_horoscopes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_horoscopes_owner_all ON public.daily_horoscopes;
CREATE POLICY daily_horoscopes_owner_all
  ON public.daily_horoscopes
  FOR ALL
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- ─── daily_transits (INTERNAL — RLS captured elsewhere) ────────────────

CREATE TABLE IF NOT EXISTS public.daily_transits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planet_positions jsonb NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  date date NOT NULL,
  CONSTRAINT daily_transits_date_unique UNIQUE (date)
);

-- ─── audit_logs (INTERNAL, zero policies — RLS captured here) ──────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text
    CONSTRAINT audit_logs_user_id_users_clerk_id_fk REFERENCES public.users (clerk_id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_event_type_idx ON public.audit_logs USING btree (event_type);
CREATE INDEX IF NOT EXISTS audit_logs_user_created_at_idx ON public.audit_logs USING btree (user_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Zero policies (INTERNAL) — service-role only, matching sweep §1.1.
-- FK is ON DELETE SET NULL (not CASCADE) — audit rows deliberately
-- survive a user's deletion with user_id nulled, not removed.

-- ─── push_subscriptions (USER_DATA — RLS captured here) ────────────────

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL
    CONSTRAINT push_subscriptions_user_id_users_clerk_id_fk REFERENCES public.users (clerk_id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions USING btree (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_owner_all ON public.push_subscriptions;
CREATE POLICY push_subscriptions_owner_all
  ON public.push_subscriptions
  FOR ALL
  USING (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- ─── processed_webhook_events (INTERNAL — RLS captured elsewhere) ──────

CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT processed_webhook_events_stripe_event_id_unique UNIQUE (stripe_event_id)
);

-- ─── crystal_listings (CATALOG — RLS captured elsewhere) ───────────────

CREATE TABLE IF NOT EXISTS public.crystal_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crystal_id uuid NOT NULL
    CONSTRAINT crystal_listings_crystal_id_crystals_id_fk REFERENCES public.crystals (id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL
    CONSTRAINT crystal_listings_vendor_id_crystal_vendors_id_fk REFERENCES public.crystal_vendors (id) ON DELETE CASCADE,
  sku text,
  price_bgn real,
  price_original real,
  currency text NOT NULL DEFAULT 'BGN',
  affiliate_url text,
  product_url text,
  image_url text,
  in_stock boolean,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── crystal_recommendations (USER_DATA — RLS captured elsewhere) ──────
-- No FK from user_id to users (only chart_id cascades) — a known,
-- pre-existing gap, captured as-is rather than silently fixed here.

CREATE TABLE IF NOT EXISTS public.crystal_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  chart_id uuid
    CONSTRAINT crystal_recommendations_chart_id_charts_id_fk REFERENCES public.charts (id) ON DELETE CASCADE,
  crystal_id uuid NOT NULL
    CONSTRAINT crystal_recommendations_crystal_id_crystals_id_fk REFERENCES public.crystals (id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  reason_code text NOT NULL,
  reason_text_en text NOT NULL,
  reason_text_bg text,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  collected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crystal_recs_user_reason_valid_idx
  ON public.crystal_recommendations USING btree (user_id, reason_code, valid_from);

-- ─── user_crystals (USER_DATA — RLS captured elsewhere) ────────────────
-- No FK from user_id to users (only crystal_id cascades) — sweep findings
-- #6/#13, FK migration prepared separately (see this file's header).

CREATE TABLE IF NOT EXISTS public.user_crystals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  crystal_id uuid NOT NULL
    CONSTRAINT user_crystals_crystal_id_crystals_id_fk REFERENCES public.crystals (id) ON DELETE CASCADE,
  source text NOT NULL,
  reason_text text,
  discovered_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_crystals_user_crystal_idx
  ON public.user_crystals USING btree (user_id, crystal_id);

-- ─── user_daily_crystals (USER_DATA — RLS captured elsewhere) ──────────
-- Same FK gap as user_crystals. `date` is text, not the `date` type — as
-- deployed, captured as-is.

CREATE TABLE IF NOT EXISTS public.user_daily_crystals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  crystal_id uuid NOT NULL
    CONSTRAINT user_daily_crystals_crystal_id_crystals_id_fk REFERENCES public.crystals (id) ON DELETE CASCADE,
  date text NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_daily_crystals_user_date_idx
  ON public.user_daily_crystals USING btree (user_id, date);
CREATE INDEX IF NOT EXISTS user_daily_crystals_user_idx ON public.user_daily_crystals USING btree (user_id);
