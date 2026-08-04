-- Quota functions — Pattern B atomic helpers for subscription_quotas.
--
-- Defines two Postgres functions consumed by apps/web/lib/subscriptions/quota.ts:
--
--   * increment_quota_if_available(p_user_id, p_period_start) RETURNS integer
--     Atomic conditional UPDATE that increments ai_readings_used by 1 only when
--     ai_readings_used < ai_readings_limit. Returns the new used count, or NULL
--     when the row matches no capacity (race-loss or cap-reached). Pattern B
--     per B.0f-1 ratification — cap-claim happens BEFORE generation, refund
--     runs in finally block on generation failure.
--
--   * decrement_quota_usage(p_user_id, p_period_start) RETURNS integer
--     Refund path. Atomic UPDATE with GREATEST(0, ai_readings_used - 1) floor
--     to guard against negative counts from any double-refund bug. Returns
--     the new used count, or NULL when no row matched (row deleted between
--     increment and refund — caller logs system.payment.quota_refund_failed
--     and accepts silent under-grant per B.0f-1 ratification).
--
-- Both functions atomic at the row level via Postgres MVCC; concurrent writers
-- serialize on the row lock during UPDATE. RPC pattern preferred over CAS
-- loops in JS — single round-trip, atomic at SQL level, visible in Supabase
-- function logs for debugging.
--
-- Operational step (after migration file lands in repo):
--
--   supabase migration repair --status applied 20260510130557
--
-- Read by:
--   * apps/web/lib/subscriptions/quota.ts — incrementQuotaUsage, decrementQuotaUsage

CREATE OR REPLACE FUNCTION public.increment_quota_if_available(
  p_user_id text,
  p_period_start date
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_used integer;
BEGIN
  UPDATE public.subscription_quotas
     SET ai_readings_used = ai_readings_used + 1,
         updated_at = now()
   WHERE user_id = p_user_id
     AND period_start = p_period_start
     AND ai_readings_used < ai_readings_limit
   RETURNING ai_readings_used INTO new_used;

  RETURN new_used;
END $$;

CREATE OR REPLACE FUNCTION public.decrement_quota_usage(
  p_user_id text,
  p_period_start date
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_used integer;
BEGIN
  UPDATE public.subscription_quotas
     SET ai_readings_used = GREATEST(0, ai_readings_used - 1),
         updated_at = now()
   WHERE user_id = p_user_id
     AND period_start = p_period_start
   RETURNING ai_readings_used INTO new_used;

  RETURN new_used;
END $$;
