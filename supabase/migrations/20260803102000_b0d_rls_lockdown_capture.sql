-- Capture of the B.0d RLS lockdown — hand-applied via the Supabase SQL
-- Editor 2026-05-09, never captured in migration history (found during
-- the 2026-08-03 RLS audit). Eight tables: bulgarian_cities, crystals,
-- crystal_listings, crystal_vendors, user_crystals, user_daily_crystals
-- (USER_DATA/CATALOG per .planning/SECURITY-MODEL.md), plus
-- daily_transits and processed_webhook_events (INTERNAL — RLS enabled,
-- deliberately no policy, same posture as bg_generation_flags).
--
-- Verified against production via direct pg_catalog query before writing
-- this file (not reconstructed from memory): all eight already have RLS
-- enabled and, where applicable, exactly the policies below. This
-- migration is a capture, not a state change — idempotent, safe to run
-- against production (no-ops there) and correct on a fresh database.
--
-- SCOPE NOTE — what this migration does NOT fix: these eight tables'
-- CREATE TABLE statements are not in migration history either. This
-- project used Drizzle before the B.0a "supabase/migrations canonical"
-- switch (see 20260413141504_schema_hardening.sql's header); the
-- Drizzle migration folder no longer exists in this repo
-- (packages/db/drizzle is gone), so the base schema for these
-- Drizzle-era tables has no SQL record anywhere, not just their RLS.
-- That is a separate, larger, pre-existing gap — a fresh database built
-- from supabase/migrations/ alone would still be missing these tables
-- entirely, RLS aside. Flagging per the 2026-08-03 audit request; not
-- fixing here, since fixing it means reverse-engineering full base
-- schema for tables whose original source is gone, a materially bigger
-- job than closing the RLS gap this migration targets.

-- ─── bulgarian_cities (CATALOG) ──────────────────────────────────────

ALTER TABLE public.bulgarian_cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cities_select_anon ON public.bulgarian_cities;
CREATE POLICY cities_select_anon
  ON public.bulgarian_cities
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS cities_select_authenticated ON public.bulgarian_cities;
CREATE POLICY cities_select_authenticated
  ON public.bulgarian_cities
  FOR SELECT
  TO authenticated
  USING (true);

-- ─── crystals (CATALOG) ──────────────────────────────────────────────

ALTER TABLE public.crystals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crystals_public_read ON public.crystals;
CREATE POLICY crystals_public_read
  ON public.crystals
  FOR SELECT
  USING (true);

-- ─── crystal_listings (CATALOG) ──────────────────────────────────────

ALTER TABLE public.crystal_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crystal_listings_public_read ON public.crystal_listings;
CREATE POLICY crystal_listings_public_read
  ON public.crystal_listings
  FOR SELECT
  USING (true);

-- ─── crystal_vendors (CATALOG) ───────────────────────────────────────

ALTER TABLE public.crystal_vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crystal_vendors_public_read ON public.crystal_vendors;
CREATE POLICY crystal_vendors_public_read
  ON public.crystal_vendors
  FOR SELECT
  USING (true);

-- ─── user_crystals (USER_DATA) ───────────────────────────────────────

ALTER TABLE public.user_crystals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_crystals_owner_all ON public.user_crystals;
CREATE POLICY user_crystals_owner_all
  ON public.user_crystals
  FOR ALL
  USING (user_id = auth.jwt() ->> 'sub')
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- ─── user_daily_crystals (USER_DATA) ─────────────────────────────────

ALTER TABLE public.user_daily_crystals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_daily_crystals_owner_all ON public.user_daily_crystals;
CREATE POLICY user_daily_crystals_owner_all
  ON public.user_daily_crystals
  FOR ALL
  USING (user_id = auth.jwt() ->> 'sub')
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- ─── daily_transits (INTERNAL — RLS enabled, no policy) ──────────────
-- Deny-all-including-authenticated by design; service role bypasses.
-- Matches bg_generation_flags' posture exactly.

ALTER TABLE public.daily_transits ENABLE ROW LEVEL SECURITY;

-- ─── processed_webhook_events (INTERNAL — RLS enabled, no policy) ────

ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
