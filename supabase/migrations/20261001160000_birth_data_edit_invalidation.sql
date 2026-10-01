-- Birth-data edit invalidation (Batch 8 "b", founder-approved design 2026-10-01).
--
-- 1. charts.birth_data_edited_at — a derived row (ai_readings, daily_horoscopes,
--    Кръг reports) is STALE when its generated_at / created_at is earlier than
--    its chart's marker. Only a change to a birth-affecting field bumps it
--    (never a name edit, never a no-op save). Nothing is deleted to
--    invalidate; a stale row simply is not served and is overwritten by the
--    next generation.
--
--    BACKFILL = created_at, NOT now(). `ADD COLUMN ... NOT NULL DEFAULT now()`
--    would stamp every EXISTING chart with the deploy time, so every existing
--    reading and horoscope would be stale on deploy and regenerate quota-free.
--    Order below is load-bearing: add nullable, backfill, THEN set the default
--    (new rows only) and NOT NULL. charts has no updated_at trigger (checked),
--    so the backfill UPDATE does not touch updated_at.
--
-- 2. users.free_oracle_edit_regrant_used_at — the free tier's once-ever
--    regrant of the lifetime Oracle reading after an edit.
--
-- 3. birth_data_edits — one row per invalidating edit. `quota_exempt` records
--    whether THAT edit's regenerations skip the premium quota claim. The
--    "triggering edit" of a stale row is the edit whose edited_at equals the
--    chart's current marker, i.e. the chart's LATEST edit.
--    RLS on, ZERO policies: service-role only (same posture as
--    chart_calculations). Without RLS it would be readable with the
--    publishable key (the 2026-08-03 crystal_recommendations finding).
--
-- 4. apply_birth_data_edit() — the whole edit in ONE transaction (supabase-js
--    has none): serialise per user, diff in SQL with IS DISTINCT FROM against
--    the stored values (not what the client claims changed), bump the marker,
--    decide quota exemption (edited chart is the user's ACTIVE = latest chart,
--    AND fewer than 2 exempt edits in the rolling 30 days), record the edit,
--    drop the chart_calculations cache and the UNCOLLECTED crystal
--    recommendations (collected ones are the user's collection), and grant
--    the free regrant at most once ever. Edits are never blocked.
--
--    Applied via `supabase db push` ONLY if the ledger is clean; this repo's
--    practice is direct SQL + `supabase migration repair --status applied`.

ALTER TABLE public.charts ADD COLUMN IF NOT EXISTS birth_data_edited_at timestamptz;
UPDATE public.charts SET birth_data_edited_at = created_at WHERE birth_data_edited_at IS NULL;
ALTER TABLE public.charts ALTER COLUMN birth_data_edited_at SET DEFAULT now();
ALTER TABLE public.charts ALTER COLUMN birth_data_edited_at SET NOT NULL;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS free_oracle_edit_regrant_used_at timestamptz;

CREATE TABLE IF NOT EXISTS public.birth_data_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL
    CONSTRAINT birth_data_edits_user_id_users_clerk_id_fk REFERENCES public.users (clerk_id) ON DELETE CASCADE,
  chart_id uuid NOT NULL
    CONSTRAINT birth_data_edits_chart_id_charts_id_fk REFERENCES public.charts (id) ON DELETE CASCADE,
  edited_at timestamptz NOT NULL,
  quota_exempt boolean NOT NULL,
  was_active_chart boolean NOT NULL,
  CONSTRAINT birth_data_edits_chart_edited_unique UNIQUE (chart_id, edited_at)
);

CREATE INDEX IF NOT EXISTS birth_data_edits_user_exempt_idx
  ON public.birth_data_edits (user_id, edited_at DESC) WHERE quota_exempt;

ALTER TABLE public.birth_data_edits ENABLE ROW LEVEL SECURITY;
-- Zero policies (INTERNAL) — service-role only.

CREATE OR REPLACE FUNCTION public.apply_birth_data_edit(
  p_user_id text,
  p_chart_id uuid,
  p_changes jsonb,
  p_is_free boolean
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old public.charts%ROWTYPE;
  v_new public.charts%ROWTYPE;
  v_birth_changed boolean;
  v_active boolean;
  v_exempt boolean := false;
  v_regrant boolean := false;
  v_marker timestamptz;
  v_rows integer;
BEGIN
  -- Serialise this user's edits so two concurrent PATCHes cannot both read
  -- "1 exempt edit in the last 30 days" and both mark themselves exempt.
  PERFORM 1 FROM public.users WHERE clerk_id = p_user_id FOR UPDATE;

  SELECT * INTO v_old FROM public.charts
    WHERE id = p_chart_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Apply only the keys present in p_changes (a key present with JSON null
  -- clears a nullable column).
  UPDATE public.charts SET
    name = CASE WHEN p_changes ? 'name' THEN p_changes->>'name' ELSE name END,
    birth_date = CASE WHEN p_changes ? 'birth_date' THEN (p_changes->>'birth_date')::date ELSE birth_date END,
    birth_time_known = CASE WHEN p_changes ? 'birth_time_known' THEN (p_changes->>'birth_time_known')::boolean ELSE birth_time_known END,
    birth_time = CASE WHEN p_changes ? 'birth_time' THEN (p_changes->>'birth_time')::time ELSE birth_time END,
    approximate_time_range = CASE WHEN p_changes ? 'approximate_time_range' THEN p_changes->>'approximate_time_range' ELSE approximate_time_range END,
    city_id = CASE WHEN p_changes ? 'city_id' THEN (p_changes->>'city_id')::uuid ELSE city_id END,
    city_name = CASE WHEN p_changes ? 'city_name' THEN p_changes->>'city_name' ELSE city_name END,
    latitude = CASE WHEN p_changes ? 'latitude' THEN (p_changes->>'latitude')::double precision ELSE latitude END,
    longitude = CASE WHEN p_changes ? 'longitude' THEN (p_changes->>'longitude')::double precision ELSE longitude END,
    updated_at = now()
  WHERE id = p_chart_id
  RETURNING * INTO v_new;

  -- Birth-affecting = any of these differ from what was STORED before.
  v_birth_changed :=
       v_new.birth_date              IS DISTINCT FROM v_old.birth_date
    OR v_new.birth_time              IS DISTINCT FROM v_old.birth_time
    OR v_new.birth_time_known        IS DISTINCT FROM v_old.birth_time_known
    OR v_new.approximate_time_range  IS DISTINCT FROM v_old.approximate_time_range
    OR v_new.city_id                 IS DISTINCT FROM v_old.city_id
    OR v_new.city_name               IS DISTINCT FROM v_old.city_name
    OR v_new.latitude                IS DISTINCT FROM v_old.latitude
    OR v_new.longitude               IS DISTINCT FROM v_old.longitude;

  IF v_birth_changed THEN
    -- clock_timestamp(), not now(): now() is the transaction START, which
    -- could precede a reading committed while this transaction waited on a lock.
    v_marker := clock_timestamp();

    -- "Active" chart = the user's latest chart (getLatestChartForUser order).
    SELECT c.id = p_chart_id INTO v_active
      FROM public.charts c
      WHERE c.user_id = p_user_id
      ORDER BY c.created_at DESC
      LIMIT 1;
    v_active := COALESCE(v_active, false);

    IF v_active THEN
      v_exempt := (
        SELECT count(*) FROM public.birth_data_edits
        WHERE user_id = p_user_id
          AND quota_exempt
          AND edited_at > v_marker - interval '30 days'
      ) < 2;
    END IF;

    UPDATE public.charts SET birth_data_edited_at = v_marker WHERE id = p_chart_id;

    INSERT INTO public.birth_data_edits (user_id, chart_id, edited_at, quota_exempt, was_active_chart)
    VALUES (p_user_id, p_chart_id, v_marker, v_exempt, v_active);

    -- Derived caches. Collected recommendations stay (user's collection);
    -- uncollected ones recompute on next view.
    DELETE FROM public.chart_calculations WHERE chart_id = p_chart_id;
    DELETE FROM public.crystal_recommendations
      WHERE chart_id = p_chart_id AND collected_at IS NULL;

    -- Free regrant: once ever, active chart only.
    IF p_is_free AND v_active THEN
      UPDATE public.users
        SET free_oracle_used_at = NULL,
            free_oracle_edit_regrant_used_at = v_marker
        WHERE clerk_id = p_user_id
          AND free_oracle_used_at IS NOT NULL
          AND free_oracle_edit_regrant_used_at IS NULL;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_regrant := v_rows > 0;
    END IF;
  END IF;

  SELECT * INTO v_new FROM public.charts WHERE id = p_chart_id;

  RETURN jsonb_build_object(
    'chart', to_jsonb(v_new),
    'birth_data_changed', v_birth_changed,
    'quota_exempt', v_exempt,
    'regrant_granted', v_regrant
  );
END;
$$;

-- Service-role only. (The older quota RPCs are executable by PUBLIC/anon —
-- do not copy that: this one mutates users, charts and the edits ledger.)
REVOKE ALL ON FUNCTION public.apply_birth_data_edit(text, uuid, jsonb, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_birth_data_edit(text, uuid, jsonb, boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_birth_data_edit(text, uuid, jsonb, boolean) TO service_role;
