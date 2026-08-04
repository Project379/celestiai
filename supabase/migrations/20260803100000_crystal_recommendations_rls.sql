-- crystal_recommendations — RLS gap closure (found during P.16's
-- migration-history audit, 2026-08-03).
--
-- This table is ACTIVE (packages/core/src/crystals/overview.ts,
-- queries.ts; served through GET /api/crystals) but has never had RLS
-- enabled in production — confirmed via direct query against
-- pg_class.relrowsecurity. It carries a `user_id` column (per-user
-- recommendation reasons tied to a chart), the same shape as
-- user_crystals / user_daily_crystals, both of which DO have RLS.
--
-- Currently not exploitable: every read/write goes through
-- createCoreSupabaseClient() (service role, bypasses RLS by design) with
-- an explicit user_id filter in application code — no anon or
-- Clerk-JWT-bound browser client ever touches this table directly
-- (grepped apps/web for useSupabaseClient() call sites; none reference
-- crystal_recommendations or its query module). This migration closes
-- the defense-in-depth gap so that remains true structurally, not just
-- by convention — if a future browser-side read is ever added, RLS is
-- already the backstop instead of something to remember to add.
--
-- Classified USER_DATA per .planning/SECURITY-MODEL.md, mirroring
-- user_crystals_owner_all exactly.
--
-- MUST run against production — this is the one real state divergence
-- this audit found (RLS actually off, not just undocumented).

ALTER TABLE public.crystal_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crystal_recommendations_owner_all ON public.crystal_recommendations;

CREATE POLICY crystal_recommendations_owner_all
  ON public.crystal_recommendations
  FOR ALL
  USING (user_id = auth.jwt() ->> 'sub')
  WITH CHECK (user_id = auth.jwt() ->> 'sub');
