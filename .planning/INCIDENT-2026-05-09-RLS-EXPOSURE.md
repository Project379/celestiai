# Incident — RLS Exposure on Production Supabase (2026-05-09)

| Field | Value |
|---|---|
| **Date discovered** | 2026-05-09 |
| **Date fixed** | 2026-05-09 |
| **Detection** | B.0c pre-flight RLS verification — founder dashboard screenshots during JWT template verification surfaced "RLS DISABLED" badges on critical tables |
| **Severity (actual)** | Low — only 5 test users in the database (founder + friend), all using Stripe test-mode `4242` cards. No real PII or payment data exposed. Pre-launch state, no public users yet. |
| **Severity (pattern)** | **Critical** — would have shipped to soft launch undetected. Soft launch invites would have exposed 50–100 real Bulgarian users' birth data, audit logs, payment IDs, and behavioral patterns to anyone with the publishable key (i.e., any visitor who opened DevTools). |

## Summary

Production Supabase had Row Level Security DISABLED on 12 of 17 tables in the `public` schema. The publishable API key (`sb_publishable_*`, present in the client JS bundle, trivially extractable by any site visitor) had full SELECT, INSERT, UPDATE, and DELETE access to:

- `users` — clerk_ids, Stripe IDs, subscription state
- `audit_logs` — per-user activity
- `chart_calculations` — full natal-chart payloads
- `processed_webhook_events` — Stripe event metadata
- `user_crystals`, `user_daily_crystals` — per-user behavioral data
- `daily_transits` — shared planetary-position cache
- `bulgarian_cities`, `crystals` (these last two are catalog-class, intended public-read but had no explicit policy)

Migration 0008 (CA-0002 schema hardening) had selectively ENABLE'd RLS on 5 tables (`charts`, `ai_readings`, `daily_horoscopes`, `push_subscriptions`, `subscription_quotas`) but left the other 12 unprotected.

The `users` table specifically allowed an attacker with the publishable key to **insert arbitrary rows with arbitrary `subscription_tier` values** — including potentially flipping their own `clerk_id` row to `subscription_tier='premium'` to bypass the paywall.

## Timeline

| Time (UTC, 2026-05-09) | Event |
|---|---|
| ~14:30 | B.0c CA-0002 re-implementation investigation underway. Founder reviews Supabase dashboard during related JWT template verification. Notices "RLS DISABLED" badges on tables that should be locked. |
| ~14:55 | B.0d audit opened. Six curl tests against the publishable key endpoint. All 6 return rows (Category A — active exposure). |
| ~14:58 | Anon-write test: `POST /rest/v1/users` with publishable key → HTTP 201 Created. Confirms write surface is also open. Test row `test_anon_write_check` enters production users table. |
| ~15:00 | Eleven additional read tests against remaining tables. 7 confirmed exposed (user-data + daily_transits), 2 confirmed exposed but intentional (catalog), 8 returned `[]` (already RLS-protected from migration 0008 + diary work). |
| ~15:00 | Security model + remediation plan surfaced. Founder ratifies. |
| ~15:01 | First remediation attempt: founder runs the lockdown SQL wrapped in `BEGIN; … COMMIT;` via Supabase SQL Editor. Editor reports "Success. No rows returned." |
| ~15:01 | Verification audit re-run. **All tests still fail.** 7 tables still readable, INSERT still returns 201 Created. Database state unchanged. Founder also created a second pollution row (`test_post_lockdown_check`) during verification. |
| ~15:02 | Diagnostic queries against `pg_tables.rowsecurity` and `pg_policies` confirm the migration did not actually apply, despite the success message. |
| ~15:05 | Second remediation attempt: founder removes the `BEGIN; … COMMIT;` wrapper, runs the same statements individually via SQL Editor. |
| ~15:07 | Verification round 2 — partial: `users` SELECT returns `[]`. RLS now enforcing. |
| ~15:10 | Verification round 2 — full: 10/10 tests pass. 7 INTERNAL/USER_DATA tables return `[]` to anon, 2 CATALOG tables return rows, INSERT returns PostgREST error 42501 "new row violates row-level security policy." |
| ~15:12 | Pollution rows (`test_anon_write_check`, `test_post_lockdown_check`) deleted via service-role SQL Editor. Verified zero `test_*` rows remain in `users`. |
| ~15:15 | Founder smoke-tests the app post-lockdown. Authed flows working end-to-end. B.0d closes. |

## Root cause

Two-part:

**1. Supabase default behavior of granting anon CRUD on `public` schema tables.** When a new table is created in `public` without RLS enabled, the `anon` role (which the publishable key authorizes as) inherits SELECT, INSERT, UPDATE, DELETE grants by default. The publishable key therefore has full read/write access to any non-RLS-protected `public` table, accessible to anyone who can extract the key from the client bundle.

**2. Migration 0008 selective RLS scope.** The schema-hardening migration that shipped in CA-0002 enabled RLS on 5 user-data tables but did not include the others. The author appears to have assumed `users`, `audit_logs`, `chart_calculations`, etc. were "internal-only" and therefore not at risk — true at the application-code level (server-side service role) but not true at the API level (PostgREST exposes the entire `public` schema to anon by default unless RLS denies). No defense-in-depth.

The combination meant 12 tables shipped to production with anon-CRUD access, undetected because the application code never accidentally hit those tables via the publishable-key client (it uses service role for all server-side reads of those tables).

## Tables affected

7 tables with real production data exposed to anon:

- `users` — 5 rows (test users, no real PII)
- `audit_logs` — multiple rows (per-user activity logs)
- `chart_calculations` — multiple rows (full natal-chart payloads)
- `processed_webhook_events` — multiple rows (Stripe event IDs)
- `user_crystals` — multiple rows (per-user crystal collections)
- `user_daily_crystals` — multiple rows (per-user engagement timestamps)
- `daily_transits` — multiple rows (shared date-keyed cache)

2 catalog tables with intentional anon-read but no explicit policy:

- `bulgarian_cities` — ~5,500 rows (Bulgarian settlement reference data)
- `crystals` — multiple rows (crystal catalog)

2 catalog tables empty (no rows, but anon-CRUD still possible until lockdown):

- `crystal_listings`
- `crystal_vendors`

## Detection mechanism

Founder dashboard screenshot during JWT template verification on 2026-05-09 surfaced "RLS DISABLED" badges on tables that the founder expected would be locked down per migration 0008. Founder asked Claude to run anon-key curl tests to confirm exposure scope.

This was a fortunate detection. **Without the founder's incidental dashboard inspection, the gap would have shipped to soft launch undetected.** No automated check or test would have caught it: server-side code uses service role and works regardless of RLS state; browser-side code uses Clerk-authed JWT and is constrained by RLS where present (so the protected tables work fine); only direct anon-key access exposes the gap, and nothing in the codebase or test suite makes such a request.

## Remediation

Eleven `ALTER TABLE … ENABLE ROW LEVEL SECURITY` statements + six `CREATE POLICY` statements, applied as individual statements via Supabase SQL Editor.

Posture per table per `.planning/SECURITY-MODEL.md`:

- **INTERNAL** (no policy, anon denied entirely): `users`, `audit_logs`, `chart_calculations`, `processed_webhook_events`, `daily_transits`
- **USER_DATA** (owner-match policy via Clerk JWT): `user_crystals`, `user_daily_crystals`
- **CATALOG** (public-read policy): `bulgarian_cities`, `crystals`, `crystal_listings`, `crystal_vendors`

Verification: 10/10 curl tests pass — 7 INTERNAL/USER_DATA tables return `[]` to anon, 2 CATALOG tables return rows, INSERT against `users` returns PostgREST error 42501.

Full migration content + the verification curl pattern are documented in `.planning/SECURITY-MODEL.md`.

## The transaction-wrapper failure mode

The first remediation attempt wrapped the lockdown SQL in `BEGIN; … COMMIT;` for atomic rollback safety. Supabase SQL Editor returned "Success. No rows returned." Verification audit minutes later showed the database state was unchanged — no RLS enabled, no policies created, INSERT still working.

The second attempt removed the transaction wrapper and ran the same statements individually. Worked immediately.

Diagnosis: Supabase SQL Editor appears to silently roll back or fail to apply DDL transactions wrapped in `BEGIN; … COMMIT;` under some condition. Whether it's a known quirk, a recent regression, a copy-paste interaction, or specific to certain DDL types is unclear. The empirical signal is unambiguous: **don't wrap DDL in transactions in Supabase SQL Editor.** Run individually with explicit verification queries between statements, or use `supabase migration up` / direct `psql` for transaction-required atomicity.

## Pollution

Two test rows created during the audit:

- `test_anon_write_check` — created 2026-05-09 14:58:41 UTC during initial INSERT-exposure test (before any remediation)
- `test_post_lockdown_check` — created 2026-05-09 15:01:58 UTC during verification round 1 (when first remediation attempt had silently failed and INSERT was still open)

Both deleted via service-role SQL Editor at ~15:12 UTC after the second remediation succeeded:

```sql
DELETE FROM public.users WHERE clerk_id IN ('test_anon_write_check', 'test_post_lockdown_check');
```

Founder verified zero `test_*` rows remain in `users`.

## Prevention

**1. `.planning/SECURITY-MODEL.md`** is now the canonical reference for per-table RLS posture. New tables must be classified (INTERNAL / USER_DATA / CATALOG) and listed there before the creating migration commits. Posture-appropriate RLS policies must be in the same migration that creates the table — no follow-up migrations.

**2. PR review checklist** for any migration creating a `public` table:
   - ENABLE RLS in the same migration?
   - CREATE POLICY for USER_DATA / CATALOG (or no policy for INTERNAL)?
   - Table added to SECURITY-MODEL.md classification?
   - Post-deploy curl audit run?

**3. Periodic audit cadence:** before each major release (soft launch, GA), run the full curl-pattern audit against every `public` table. The pattern is documented in SECURITY-MODEL.md.

**4. Don't rely on application-code review alone.** This incident was invisible from the application-code perspective because the codebase never directly hits the affected tables via the publishable-key client. Detection requires direct REST API probing.

## What did NOT happen

- No real user data was exposed. All 5 production users were test accounts (founder + friend, Stripe test mode).
- No GDPR incident. No EU-resident user data was exposed.
- No production app downtime. RLS toggles are metadata changes; no rows were touched.
- No financial impact. Stripe test-mode payments only.

## Pattern severity rationale

While the actual exposure was contained, the pattern severity is rated **critical** because:

- The same misconfiguration would have shipped to soft launch (50–100 real Bulgarian users) without any further trigger to detect it.
- Soft launch users would have submitted real birth-data PII (date, time, location), real subscription decisions, real payment IDs.
- Anon-key INSERT access to `users` allowed potential paywall bypass via `subscription_tier='premium'` self-grant.
- Detection was incidental (founder dashboard inspection during unrelated work), not systematic.

The fortunate timing — pre-launch, test-data-only — does not generalize. The remediation + prevention work documented above is necessary regardless.

---

*Document closed 2026-05-09 at B.0d remediation verified.*
