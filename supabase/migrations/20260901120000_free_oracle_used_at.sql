-- free_oracle_used_at — lifetime "one free Oracle reading" marker.
--
-- Context: the frozen tier definition (2026-09-01) makes the free Oracle
-- allowance ONE `general` reading per user for the lifetime of the account,
-- replacing the previous monthly `subscription_quotas` counter (which is now
-- premium-only, and is also no longer shared with the daily horoscope — see
-- apps/web/app/api/horoscope/generate/route.ts).
--
-- `subscription_quotas` cannot express "once, ever" — its primary key is
-- (user_id, period_start), one row per calendar month. This column is the
-- lifetime flag: NULL = the free reading is still available; a timestamp =
-- it has been spent (value is the moment it was claimed).
--
-- Additive, nullable, no default. Every existing row gets NULL, so no
-- existing user is retroactively locked out of their first free reading.
--
-- Enforcement: apps/web/lib/subscriptions/free-oracle.ts claims the flag
-- with a conditional UPDATE (... WHERE clerk_id = $1 AND free_oracle_used_at
-- IS NULL) before generation, and clears it back to NULL if generation
-- fails. That helper tolerates this column being absent (undefined_column /
-- SQLSTATE 42703) by treating the reading as available and logging once —
-- so the application code can ship ahead of this migration (dark-launch),
-- and the lifetime cap simply starts being enforced once the column exists.
--
-- APPLY PATH (the migration ledger is unreconciled — do NOT `supabase db
-- push`): run this statement directly against production (Supabase SQL
-- editor or a direct psql connection), then record it with
--   supabase migration repair --status applied 20260901120000
-- `migration repair` alone will NOT create the column — it only writes the
-- ledger row. The two steps are separate.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS free_oracle_used_at timestamptz;

COMMENT ON COLUMN public.users.free_oracle_used_at IS
  'Lifetime free-Oracle marker. NULL = the one free general reading is still available; timestamp = spent at that moment. Claimed/released by apps/web/lib/subscriptions/free-oracle.ts.';
