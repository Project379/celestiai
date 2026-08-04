-- Rate limiting for cities/search, horoscope/generate, oracle/generate.
--
-- Replaces the CA-0002 in-memory limiter (apps/web/lib/rate-limit.ts on
-- main, never ported to this branch): a module-scope Map gives zero real
-- protection on serverless, since each invocation can land on a cold
-- instance with its own memory — an attacker rotating across instances is
-- unlimited, and the code looks protected when it isn't. This table + RPC
-- makes the limit durable across instances, at the cost of one query per
-- rate-limited request.
--
-- check_and_increment_rate_limit(p_key, p_limit, p_window_ms) RETURNS integer
--   Single atomic INSERT ... ON CONFLICT DO UPDATE — no separate check-then-
--   write, so concurrent requests for the same key serialize on the row's
--   unique-constraint lock instead of racing past each other. The CASE
--   branches both live inside the one statement: if the existing bucket's
--   window has expired (reset_at <= now()), the count resets to 1 and a
--   fresh window starts; otherwise the count increments in place. Returns
--   the post-write count — caller compares against p_limit to decide
--   whether to reject. Mirrors the increment_quota_if_available pattern in
--   20260510130557_quota_functions.sql (atomic at the row level via
--   Postgres MVCC, RPC over a CAS loop for a single round trip).
--
-- Keys are `route:userId` or `route:userId:ip` — all three routes require
-- auth, so cardinality is bounded by active users, not IP space. Stale rows
-- are pruned by apps/web/app/api/cron/cleanup-deleted-accounts/route.ts
-- (already runs daily) rather than a probabilistic in-RPC delete on the hot
-- path, since bounded cardinality means the table never grows large enough
-- to need hot-path cleanup.
--
-- Read by:
--   * apps/web/lib/rate-limit.ts — assertRateLimit

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 1,
  reset_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms bigint
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO public.rate_limit_buckets (key, count, reset_at, updated_at)
  VALUES (p_key, 1, now() + (p_window_ms * interval '1 millisecond'), now())
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN public.rate_limit_buckets.reset_at <= now() THEN 1
      ELSE public.rate_limit_buckets.count + 1
    END,
    reset_at = CASE
      WHEN public.rate_limit_buckets.reset_at <= now()
        THEN now() + (p_window_ms * interval '1 millisecond')
      ELSE public.rate_limit_buckets.reset_at
    END,
    updated_at = now()
  RETURNING count INTO new_count;

  RETURN new_count;
END $$;
