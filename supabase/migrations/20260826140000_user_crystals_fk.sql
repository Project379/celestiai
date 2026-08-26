-- 2026-08-26 sweep findings #6/#13: user_crystals and user_daily_crystals
-- both carry a user_id column but had no FK to users.clerk_id — their only
-- FK is to crystals(id). That's the reason a user's crystal collection and
-- daily-crystal history could survive a GDPR account deletion permanently:
-- nothing at the database level tied their lifetime to the users row.
--
-- Orphan investigation (2026-08-26), ruled on by the founder same day:
-- 3 rows in user_crystals and 10 in user_daily_crystals, ALL belonging to
-- one clerk_id, user_3CJ6TxYOTVGpGhsznsp3Sevygng (dated 2026-04-15), which
-- has no matching row in `users`. Checked three things before ruling:
--   1. Clerk API for that user ID directly (not inferred from the missing
--      join) — 404 resource_not_found. The account does not exist; this
--      is not a live partially-deleted user.
--   2. audit_logs for that clerk_id — zero rows. audit_logs' FK to users
--      is ON DELETE SET NULL, not CASCADE, so a real GDPR deletion run
--      through this app would have left a null-user_id
--      account.deletion_requested (or similar) row behind, not erased it.
--      Its total absence rules out "GDPR flow ran and partially failed"
--      as the cause — most likely this is manual test-data cleanup that
--      predates the cleanup cron and audit logging entirely (April, early
--      in the project), not a broken deletion.
--   3. The actual row content — both tables hold only derived/generated
--      data (algorithmically-triggered crystal collections with templated
--      reason text, and a bare crystal_id+date+timestamp visit log), no
--      user-authored content in either table.
-- Ruling: delete the 13 rows (dead account, no live-user risk, nothing a
-- person wrote), then add the FK so this can't happen silently again.
--
-- This is the same FK shape already used for every other user-scoped
-- table (e.g. charts, push_tokens — 20260413141504_schema_hardening.sql,
-- 20260803070000_push_tokens.sql):
-- FOREIGN KEY (user_id) REFERENCES public.users(clerk_id) ON DELETE CASCADE.

-- Verify before running (expect exactly 3 and 10):
--   SELECT count(*) FROM user_crystals WHERE user_id = 'user_3CJ6TxYOTVGpGhsznsp3Sevygng';
--   SELECT count(*) FROM user_daily_crystals WHERE user_id = 'user_3CJ6TxYOTVGpGhsznsp3Sevygng';

DELETE FROM public.user_crystals WHERE user_id = 'user_3CJ6TxYOTVGpGhsznsp3Sevygng';
DELETE FROM public.user_daily_crystals WHERE user_id = 'user_3CJ6TxYOTVGpGhsznsp3Sevygng';

-- Verify after the deletes (expect 0 orphans in both, confirming no OTHER
-- orphaned clerk_id slipped in since the 2026-08-26 read-only check):
--   SELECT count(*) FROM user_crystals uc WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.clerk_id = uc.user_id);
--   SELECT count(*) FROM user_daily_crystals udc WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.clerk_id = udc.user_id);
-- If either is not 0, STOP — do not run the ALTER TABLE statements below
-- until you've identified what the new orphan is (same three checks as
-- above: Clerk API, audit_logs, row content).

ALTER TABLE public.user_crystals
  ADD CONSTRAINT user_crystals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(clerk_id) ON DELETE CASCADE;

ALTER TABLE public.user_daily_crystals
  ADD CONSTRAINT user_daily_crystals_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(clerk_id) ON DELETE CASCADE;

-- Verify after the ALTER TABLEs (expect both constraint names to show up):
--   SELECT conname FROM pg_constraint WHERE conname IN ('user_crystals_user_id_fkey', 'user_daily_crystals_user_id_fkey');
