-- Chart reveal flow, server side (founder rulings 2026-10-01).
--
-- 1. users.big_three_revealed_at — the once-ever "big three" reveal for NEW
--    accounts. NULL = not yet seen; set when the reveal is completed or skipped.
--    BACKFILLED to now() for every EXISTING user, so only accounts created after
--    this migration (NULL by default) ever see the reveal. No DEFAULT on
--    purpose: a default of now() would mark brand-new users as having seen it.
--
-- 2. daily_horoscopes.stale_regens — how many times today's horoscope for this
--    (chart, date) has been regenerated because a birth-data edit made it stale.
--    The horoscope route caps it at 3 per chart per day (a stale row is deleted
--    and re-created, so the counter is carried across the replacement: the new
--    claim row is inserted with the previous count + 1). Existing rows: 0.
--
-- Additive and idempotent. Apply by hand (direct SQL + `supabase migration
-- repair --status applied`), never `db push`, and only AFTER this file is pushed
-- to main (MIGRATION-PROCESS-GAP).

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS big_three_revealed_at timestamptz;
UPDATE public.users SET big_three_revealed_at = now() WHERE big_three_revealed_at IS NULL;

ALTER TABLE public.daily_horoscopes ADD COLUMN IF NOT EXISTS stale_regens integer NOT NULL DEFAULT 0;
