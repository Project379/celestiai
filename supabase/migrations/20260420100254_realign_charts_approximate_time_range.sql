-- Realign charts.approximate_time_range from tstzrange to text.
--
-- Root cause: the column was silently typed as tstzrange in production
-- (origin: pre-Drizzle dashboard edit or a since-deleted migration),
-- while all 10 committed Drizzle migrations + the schema.ts file
-- declared it as `text`. Every birth-data form submission with
-- `birthTimeKnown: false` therefore hit Postgres error 22P02
-- ("malformed range literal: morning") because "morning" / "afternoon"
-- / "evening" / "night" don't parse as tstzrange values.
--
-- Audit: `.planning/research/SCHEMA_DRIFT_AUDIT.md` flagged 13 drifts
-- across 5 tables. This migration only addresses the one that's causing
-- actual user-facing breakage; the other 12 drifts are handled by the
-- Drizzle deletion (which removes the fictional declarations that were
-- the drift's other side).
--
-- Data preservation: verified via service-role query on 2026-04-20
-- that the column has zero non-null rows — no user has ever
-- successfully persisted through the "don't know exact birth time"
-- onboarding branch. USING NULL is safe.
--
-- After this migration the Zod enum in
-- apps/web/lib/validators/birth-data.ts (which already constrained
-- input to 'morning' | 'afternoon' | 'evening' | 'night') will
-- finally match the DB accepting those strings.

ALTER TABLE public.charts
  ALTER COLUMN approximate_time_range TYPE text USING NULL;

COMMENT ON COLUMN public.charts.approximate_time_range IS
  'Time-of-day bucket when exact birth time is unknown: '
  '''morning'' | ''afternoon'' | ''evening'' | ''night''. '
  'Validated at the API layer via Zod.';
