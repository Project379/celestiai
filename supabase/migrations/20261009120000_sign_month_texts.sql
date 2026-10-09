-- sign_month_texts — the monthly text shown on Днес swipe page 3 («Везни · октомври»).
-- One row per zodiac sign per month. The cron writes it AHEAD of the month (24th-26th, as
-- 'pending'), emails the founder the 12 texts, and publishes whatever was not rejected on the
-- 1st. Every user of a sign reads the same row; nothing is generated per user. Not personal:
-- generated from the sign and the month's real sky, never from a user's chart.
--
-- status:  pending   written, in the founder's veto window; NEVER shown to users
--          published visible to users (set by the cron on the 1st, only if the founder was emailed)
--          rejected  vetoed by the founder (or a failed edit): never shown; the app serves the
--                    sign's approved evergreen text instead (apps/web/lib/sign-month/evergreen.ts)
-- emailed_at: when this text went out in the founder's review email. A pending text that was
--          never emailed is NOT published: the veto window did not happen, so the evergreen text
--          is served instead (fail closed).
--
-- REVIEW ONLY. Not applied. NEVER `supabase db push` (see CC-SESSION-HANDOFF §3).
--
-- To apply, once this file is on `main` (session port 5432, not the 6543 pooler):
--   1. psql "<DATABASE_URL with :6543 swapped for :5432>" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261009120000_sign_month_texts.sql
--      (-1 runs the whole file in one transaction)
--   2. supabase migration repair --status applied 20261009120000
--   3. verify:  select count(*) from public.sign_month_texts;   -- 0, table exists, RLS on
-- Until then the post-deploy smoke probe for /api/cron/sign-month SKIPS with a warning, and
-- GET /api/sign-month serves the evergreen text for every sign.
--
-- Classified INTERNAL like bg_generation_flags / daily_transits: RLS enabled, no policy.
-- The service role (server routes) bypasses RLS; anon and authenticated are denied
-- entirely. The app reads it through GET /api/sign-month, never straight from the browser.

CREATE TABLE IF NOT EXISTS public.sign_month_texts (
  sign text NOT NULL
    CONSTRAINT sign_month_texts_sign_check CHECK (sign IN (
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    )),
  year_month text NOT NULL
    CONSTRAINT sign_month_texts_year_month_check CHECK (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  content text NOT NULL
    CONSTRAINT sign_month_texts_content_not_blank CHECK (length(btrim(content)) > 0),
  model_version text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CONSTRAINT sign_month_texts_status_check CHECK (status IN ('pending', 'published', 'rejected')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  emailed_at timestamptz,
  published_at timestamptz,
  rejected_at timestamptz,
  PRIMARY KEY (sign, year_month)
);

ALTER TABLE public.sign_month_texts ENABLE ROW LEVEL SECURITY;
