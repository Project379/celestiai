-- charts — capture of four hand-applied policies found alongside the
-- migration-declared charts_owner_all (schema_hardening.sql), found
-- during the 2026-08-03 audit. Not a security gap: these are redundant
-- permissive policies covering the exact same access as charts_owner_all
-- (Postgres ORs permissive policies together), so their presence changes
-- nothing about who can read/write what — but they exist in production
-- and had zero migration record, same class of problem as everything
-- else in this audit. Verified via direct pg_policies query before
-- writing this file. Idempotent — no-ops against production, correct on
-- a fresh database.
--
-- Left in place rather than dropped: removing a live policy is a
-- separate, deliberate cleanup decision (even a redundant one), not
-- something to fold into a "capture what exists" migration.

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
