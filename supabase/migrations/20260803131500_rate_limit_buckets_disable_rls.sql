-- 20260803130000_rate_limit_buckets.sql was run through the Supabase SQL
-- Editor's "enable RLS on new table" prompt by mistake, turning RLS on for
-- rate_limit_buckets with zero policies defined.
--
-- That's not a hardening gap here: the only reader/writer is
-- apps/web/lib/rate-limit.ts, which always goes through
-- createServiceSupabaseClient() (service-role key) — a client that bypasses
-- RLS entirely. No anon/authenticated-role Supabase client ever touches this
-- table. RLS-with-no-policies on it doesn't protect anything; it's dead
-- configuration that doesn't match how the table is actually used, and
-- doesn't fit any of the INTERNAL/USER_DATA/CATALOG classifications in
-- .planning/SECURITY-MODEL.md. Disabling explicitly rather than leaving it
-- live-but-unintentional.

ALTER TABLE public.rate_limit_buckets DISABLE ROW LEVEL SECURITY;
