-- Corrective migration — headline_score column precision.
--
-- NO-OP against production: production already stores these three columns
-- as numeric(5,2) (verified 2026-09-08 via direct information_schema read —
-- numeric_precision=5, numeric_scale=2 on all three). This migration exists
-- so a fresh database replayed from supabase/migrations/ lands on the same
-- type production actually has.
--
-- What it corrects: 20260803101500_capture_stream_k_relationship_schema.sql
-- declares `headline_score numeric NOT NULL` (bare numeric, typmod -1) for
-- compatibility_reports, saved_people_reports and connection_reports. That
-- file's header claims byte-verbatim extraction from production ("this exact
-- shape"); for these three columns the claim is wrong — the real applied
-- history (orphan ledger rows 20260509163000 / 20260510093000 / 20260511103000)
-- declared NUMERIC(5,2), and production matches the orphans, not the capture.
--
-- Found during the Session C orphan-ledger reconciliation, 2026-09-08. The
-- capture migration's body is already recorded in the ledger and is not edited
-- (only a header note is added, pointing here); this forward migration is the
-- fix. See .planning/PLACEHOLDERS.md MIGRATIONS / CAPTURE-VERIFICATION-CLAIMS.

ALTER TABLE public.compatibility_reports
  ALTER COLUMN headline_score TYPE numeric(5,2);

ALTER TABLE public.saved_people_reports
  ALTER COLUMN headline_score TYPE numeric(5,2);

ALTER TABLE public.connection_reports
  ALTER COLUMN headline_score TYPE numeric(5,2);
