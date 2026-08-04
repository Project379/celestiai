-- bg_generation_flags — runtime observation table for the Bulgarian
-- generation-quality safety net (horoscope + Oracle). Records one row per
-- LLM generation so flagged/total gives a real per-day failure rate, not a
-- sample. Observational only: nothing reads this table to correct, retry,
-- or rewrite output. See .planning/i18n/MODEL_CAPABILITY_LOG.md.
--
-- Storage discipline: generated_text is NULL when flagged_count = 0. Clean
-- generations are already cached in ai_readings/daily_horoscopes; this table
-- exists to measure failure rate and give a before/after signal on model
-- swap, not to duplicate clean output.
--
-- Privacy discipline: input_conditions carries astrological conditions only
-- (transiting planet, aspect, natal point, moon phase, topic) — never
-- chartId, userId, or anything that ties a row to a person. This is a debug
-- table, not a user-data table.
--
-- Classified INTERNAL per .planning/SECURITY-MODEL.md — RLS enabled, no
-- policy (service role bypass only, anon denied entirely), same posture as
-- audit_logs / chart_calculations / daily_transits.

CREATE TABLE public.bg_generation_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('horoscope', 'oracle')),
  model text NOT NULL,
  flagged_words text[] NOT NULL DEFAULT '{}',
  flagged_count int NOT NULL DEFAULT 0,
  generated_text text,
  input_conditions jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX bg_generation_flags_created_at_idx ON public.bg_generation_flags (created_at);
CREATE INDEX bg_generation_flags_source_created_at_idx ON public.bg_generation_flags (source, created_at);

-- INTERNAL: ENABLE RLS, no policy. Anon denied by default; service role
-- bypasses via BYPASSRLS. No browser code ever queries this table.
ALTER TABLE public.bg_generation_flags ENABLE ROW LEVEL SECURITY;

-- Enforces the storage-discipline comment above at the DB level: a future
-- code path cannot write generated_text for a clean (flagged_count = 0)
-- generation. Applied directly to production via `supabase db query --linked`
-- 2026-07-29, then added here so a fresh environment matches.
ALTER TABLE public.bg_generation_flags
  ADD CONSTRAINT bg_generation_flags_text_only_when_flagged
  CHECK (flagged_count > 0 OR generated_text IS NULL);
