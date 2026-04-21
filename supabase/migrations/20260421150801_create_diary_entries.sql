-- Create public.diary_entries (§8 diary-persistence workstream).
--
-- Sealed schema:   .planning/phases/08-diary-persistence/08-02-SCHEMA.md
-- Product decisions: .planning/research/DIARY_PRODUCT_DECISIONS.md
--
-- Summary of sealed choices this migration realises:
--   §A A2 — entry_date is client-submitted (no DEFAULT); endpoint Zod
--           bounds dates to [users.created_at, now + 1 day].
--   §B — intentions TEXT[] with fixed length 3 and per-slot char_length
--        BETWEEN 1 AND 500. Zod is the user-facing voice; these CHECKs
--        are the silent guardrail (ERR-DI-003 on the endpoint if they
--        fire; not a second Bulgarian message).
--   §C C1 — RLS-only user isolation. No FK to public.users; matches
--           charts / chart_calculations / oracle_readings / user_crystals
--           / user_daily_crystals / push_subscriptions.
--   §D — phase_id stays TEXT plus a COMMENT ON COLUMN enumerating the
--        valid LunarPhaseId set. Enum tightening happens at the Zod
--        layer (§8.4), not in Postgres.
--   §E — empty-string guard folded into §B's char_length >= 1.
--   §F — updated_at maintained by a GENERIC reusable trigger function
--        public.set_updated_at(). Introduced here; reusable across any
--        future table with an updated_at TIMESTAMPTZ column.
--   §G — RLS pattern uses inline (select auth.jwt()->>'sub') = user_id
--        per every existing user-scoped table; no clerk_id() helper
--        exists in the codebase.
--
-- Migration-history discipline: if supabase db push surfaces history
-- drift (similar to the risk flagged in the §7 Bug-1 sequence), repair
-- history before proceeding — do not bypass.

-- ─── Generic trigger function (reusable primitive per §F) ────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Generic BEFORE UPDATE trigger function. Sets NEW.updated_at = now(). '
  'Introduced by the §8.2 diary_entries migration. Reusable across any '
  'table with an updated_at TIMESTAMPTZ column.';

-- ─── diary_entries table ─────────────────────────────────────────────

CREATE TABLE public.diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT (select auth.jwt()->>'sub'),
  entry_date DATE NOT NULL,
  phase_id TEXT NOT NULL,
  phase_name TEXT NOT NULL,
  intentions TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT diary_entries_intentions_count
    CHECK (array_length(intentions, 1) = 3),
  CONSTRAINT diary_entries_intention_1_len
    CHECK (char_length(intentions[1]) BETWEEN 1 AND 500),
  CONSTRAINT diary_entries_intention_2_len
    CHECK (char_length(intentions[2]) BETWEEN 1 AND 500),
  CONSTRAINT diary_entries_intention_3_len
    CHECK (char_length(intentions[3]) BETWEEN 1 AND 500),
  CONSTRAINT diary_entries_unique_user_date
    UNIQUE (user_id, entry_date)
);

COMMENT ON COLUMN public.diary_entries.phase_id IS
  'LunarPhaseId snapshot at write time. Valid values: '
  '''new'' | ''waxing_crescent'' | ''first_quarter'' | ''waxing_gibbous'' | '
  '''full'' | ''waning_gibbous'' | ''last_quarter'' | ''waning_crescent''. '
  'Snapshot is deliberate (DIARY_PRODUCT_DECISIONS.md Decision C): '
  'if phase logic changes, prior entries keep their original phase label.';

COMMENT ON COLUMN public.diary_entries.entry_date IS
  'Client-submitted in the user''s local timezone (§8.2 sealed A2). '
  'Endpoint Zod validator rejects dates > 1 day future and dates earlier '
  'than users.created_at. See §A of 08-02-SCHEMA.md for rationale.';

-- ─── Indexes ─────────────────────────────────────────────────────────

-- No explicit (user_id, entry_date DESC) index — UNIQUE
-- (user_id, entry_date) implicit ASC index reverse-scans efficiently
-- on PG 13+ for list-newest-first. Revisit only if production
-- EXPLAIN ANALYZE shows a planner regression. (§8.2 sealing note.)

CREATE INDEX diary_entries_user_phase_idx
  ON public.diary_entries (user_id, phase_id);

-- ─── updated_at trigger ──────────────────────────────────────────────

CREATE TRIGGER diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─── Row-level security ──────────────────────────────────────────────

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY diary_entries_select_own ON public.diary_entries
  FOR SELECT
  USING ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY diary_entries_insert_own ON public.diary_entries
  FOR INSERT
  WITH CHECK ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY diary_entries_update_own ON public.diary_entries
  FOR UPDATE
  USING ((select auth.jwt()->>'sub') = user_id)
  WITH CHECK ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY diary_entries_delete_own ON public.diary_entries
  FOR DELETE
  USING ((select auth.jwt()->>'sub') = user_id);

-- Service-role bypass: the `service_role` Supabase key bypasses RLS
-- by default; no explicit policy needed. Used for server-side GDPR
-- deletion (§8.7) and any scheduled cleanup.
