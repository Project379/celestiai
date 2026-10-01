-- Drop the three legacy Stream K relationship tables (STREAM-K-ORPHAN-DATA,
-- .planning/PLACEHOLDERS.md). Pre-rebuild Кръг schema: zero app-code
-- references, no FK to users (raw text user-id columns), so no account-
-- deletion path could ever reach them. 12 rows (3/3/6) existed, owned by the
-- two founder-confirmed team accounts; backed up locally before the drop.
--
-- APPLIED BY HAND on production 2026-10-01 (direct SQL, one transaction) and
-- recorded with `supabase migration repair --status applied`. NEVER `db push`.
-- IF EXISTS keeps a replay into a fresh database (where the capture migration
-- 20260803101500 has just created them) safe and idempotent. Order matters:
-- compatibility_reports has an FK to relationship_profiles. The original
-- capture migration is intentionally left untouched.

DROP TABLE IF EXISTS public.compatibility_reports;
DROP TABLE IF EXISTS public.relationship_invites;
DROP TABLE IF EXISTS public.relationship_profiles;
