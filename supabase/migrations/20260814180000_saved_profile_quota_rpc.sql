-- Atomic free-tier quota claim for saved_people_profiles — Batch 5.5
-- finding #3/B (founder-ruled MEDIUM, migration authorised 2026-08-14).
--
-- POST /api/circle/profiles previously read the caller's tier + existing
-- profile count, then inserted — a plain check-then-act with no DB
-- constraint behind it. Two concurrent POSTs from the same free-tier user
-- could both pass the "0 existing profiles" check and both insert,
-- letting a free user end up with 2+ saved profiles — a paid-boundary
-- bypass, not a minor bug (founder's own framing).
--
-- Unlike the connection_reports/saved_people_reports version races Batch 4
-- fixed, there is no existing UNIQUE constraint to lean on here — the
-- invariant ("a free-tier user has at most 1 saved_people_profiles row")
-- is cross-table (profile count vs. users.subscription_tier), which a
-- plain unique index can't express, and denormalising tier onto the
-- profile row would create a second source of truth for subscription
-- tier (founder's explicit reasoning for rejecting that approach).
--
-- Fix: same RPC pattern already proven for oracle quota
-- (increment_quota_if_available, 20260510130557_quota_functions.sql) —
-- wrap the tier check, count check, and insert in a single Postgres
-- function so the whole operation is one atomic unit from the client's
-- perspective. A brand-new user has ZERO existing saved_people_profiles
-- rows for their very first profile — the exact race window — so there
-- is no existing row to lock via SELECT ... FOR UPDATE the way the report
-- races could. pg_advisory_xact_lock(hashtext(p_user_id)) serializes
-- concurrent calls to this function for the SAME user for the duration of
-- the calling transaction, without blocking calls for different users.
--
-- Returns the inserted row on success, or NULL if the caller is
-- non-premium and already has >=1 saved profile (quota exhausted).
-- apps/web/app/api/circle/profiles/route.ts POST calls this via
-- supabase.rpc(...) instead of a plain .insert() and returns 403 with
-- the existing Bulgarian message when the result is null.
--
-- Read by:
--   * apps/web/app/api/circle/profiles/route.ts — POST

CREATE OR REPLACE FUNCTION public.create_saved_profile_if_allowed(
  p_user_id text,
  p_kind text,
  p_name text,
  p_birth_date timestamptz,
  p_birth_time_known boolean,
  p_birth_time text,
  p_approximate_time_range text,
  p_city_name text,
  p_latitude double precision,
  p_longitude double precision
) RETURNS public.saved_people_profiles
LANGUAGE plpgsql
AS $$
DECLARE
  v_tier text;
  v_existing_count integer;
  v_row public.saved_people_profiles;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id));

  SELECT subscription_tier INTO v_tier
    FROM public.users
   WHERE clerk_id = p_user_id;

  SELECT count(*) INTO v_existing_count
    FROM public.saved_people_profiles
   WHERE user_id = p_user_id;

  IF v_tier IS DISTINCT FROM 'premium' AND v_existing_count >= 1 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.saved_people_profiles (
    user_id, kind, name, birth_date, birth_time_known, birth_time,
    approximate_time_range, city_name, latitude, longitude
  ) VALUES (
    p_user_id, p_kind, p_name, p_birth_date, p_birth_time_known, p_birth_time,
    p_approximate_time_range, p_city_name, p_latitude, p_longitude
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;
