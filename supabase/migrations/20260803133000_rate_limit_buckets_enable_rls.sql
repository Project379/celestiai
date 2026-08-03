-- Corrects 20260803131500_rate_limit_buckets_disable_rls.sql, which turned
-- RLS fully off in response to the Supabase SQL Editor's "enable RLS on new
-- table" prompt being accepted by accident. Fully off doesn't match this
-- codebase's own convention for a service-role-only table (see
-- processed_revenuecat_events, processed_webhook_events, bg_generation_flags
-- in .planning/SECURITY-MODEL.md): RLS ON with no policies. PostgreSQL then
-- denies every non-BYPASSRLS role by default; the service-role client in
-- apps/web/lib/rate-limit.ts keeps working because it carries BYPASSRLS.
-- Net behavior for this app is identical either way — nothing but the
-- service-role client ever touches this table — but RLS-on-no-policy is the
-- explicit backstop this repo's other internal tables all carry, and the
-- disable migration left the table as a one-off exception with no
-- SECURITY-MODEL.md entry documenting why.

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
