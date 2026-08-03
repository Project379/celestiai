# Security Model — Supabase RLS posture

**Created:** 2026-05-09 at B.0d close (post RLS lockdown).
**Status:** Living document. Update when new tables are created.

This document is the canonical reference for Row Level Security posture across all tables in the `public` schema of the production Supabase project (`zsypmpswqrhkfvlnowcp`). Every table must have a documented classification before it ships.

## Why this exists

The B.0d security audit (2026-05-09) found that 7 tables — `users`, `audit_logs`, `chart_calculations`, `processed_webhook_events`, `user_crystals`, `user_daily_crystals`, `daily_transits` — were fully readable AND writable by anyone with the publishable API key (which ships in the client JS bundle). The CA-0002 schema-hardening migration (0008) had ENABLE RLS on a selective subset of tables but left these unprotected. Without this document, the same gap could recur whenever a new table is added.

Full incident write-up: `.planning/INCIDENT-2026-05-09-RLS-EXPOSURE.md`.

## Posture taxonomy

Three classifications. Every table maps to exactly one.

### INTERNAL

Server-side only. Browser never queries directly. Service role bypasses RLS for legitimate writes; anon must be denied entirely.

- **RLS posture:** `ENABLE ROW LEVEL SECURITY` with **no policies**. PostgreSQL denies all non-bypass-RLS roles by default; service role keeps working because it has `BYPASSRLS`.
- **Read pattern:** Server-side via `createServiceSupabaseClient()` with manual `.eq('user_id', userId)` filtering, OR via dedicated API routes that handle authorization.
- **Write pattern:** Server-side via service role.

### USER_DATA

Per-user data the browser reads/writes via the user's Clerk session. RLS scopes access to the row owner via the Clerk JWT subject claim.

- **RLS posture:** `ENABLE ROW LEVEL SECURITY` + an owner-match policy.
- **Standard policy shape (FOR ALL):**
  ```sql
  CREATE POLICY <table>_owner_all ON public.<table>
    FOR ALL
    USING      (user_id = auth.jwt() ->> 'sub')
    WITH CHECK (user_id = auth.jwt() ->> 'sub');
  ```
- **Variant (FOR SELECT only)** when writes are server-side via service role and browser only reads:
  ```sql
  CREATE POLICY <table>_owner_select ON public.<table>
    FOR SELECT
    USING (user_id = auth.jwt() ->> 'sub');
  ```
- **Read pattern:** Browser via `useSupabaseClient()` (Clerk session token forwarded via `accessToken()` callback) — RLS applies. Server-side reads can also use service role with manual filter.

### CATALOG

Public reference data. Anyone can read; nobody writes via the API (only seed scripts via service role).

- **RLS posture:** `ENABLE ROW LEVEL SECURITY` + a public-read policy. No INSERT/UPDATE/DELETE policy → only service role can write.
  ```sql
  CREATE POLICY <table>_public_read ON public.<table>
    FOR SELECT USING (true);
  ```
- **Read pattern:** Browser or anon directly via publishable key. Server-side via service role for seeding.

## Per-table classification (28 tables in public schema, as of 2026-08-03)

**Migration-history note (2026-08-03):** the eight B.0d-remediated rows below (`bulgarian_cities`, `crystals`, `crystal_listings`, `crystal_vendors`, `user_crystals`, `user_daily_crystals`, `daily_transits`, `processed_webhook_events`) were hand-applied via the Supabase SQL Editor on 2026-05-09 and had **zero migration-file record** until an audit found the gap — a fresh environment built from `supabase/migrations/` alone would have shipped these eight with RLS **off**. Closed via `20260803102000_b0d_rls_lockdown_capture.sql` (verified against live production state via direct `pg_catalog` query before writing, then dry-run-verified in a rolled-back transaction — not assumed). `charts` had four additional hand-applied policies with the same gap, closed via `20260803102500_charts_split_policies_capture.sql`. See `apps/web/scripts/diagnostics/audit-hand-applied-schema.mjs` (`pnpm --filter @stellaeum/web run diag:hand-applied-schema`) — a live heuristic check, not a substitute for replaying migrations into a genuinely empty database (that requires the Supabase CLI + Docker, not set up on this machine as of this writing).

**Known gap still open:** `crystal_recommendations` (USER_DATA, has `user_id`) had RLS **disabled** in production as of this audit — not merely undocumented, actually off. Not currently exploitable (every access goes through `createCoreSupabaseClient()`, service role, with explicit `user_id` filtering in application code — no anon/browser-direct path touches it), but the RLS backstop was missing. Fix migration `20260803100000_crystal_recommendations_rls.sql` is written and dry-run-verified but **has not yet been applied to production** — run it before treating this table as closed.

| Table | Posture | Reasoning |
|---|---|---|
| `users` | INTERNAL | Server reads tier via service role (`getCachedUserTier`); browser never queries directly. AppUser data is hydrated via the new `/api/user` endpoint (CA-0002 work, B.0c). `subscription_provider` column (2026-08-03, REVISIT-62) records which payment provider — `stripe` or `revenuecat` — is authoritative for a given row; see the column comment in `20260803122000_revenuecat_provider_column.sql` for the NULL-semantics rationale. |
| `audit_logs` | INTERNAL | `logAuditEvent` writes via service role; browser never reads. |
| `chart_calculations` | INTERNAL | Chart-calc API writes via service role; chart-id-keyed (no user_id column on this table). Browser receives chart data via `/api/chart/calculate` API JSON, not directly. |
| `processed_webhook_events` | INTERNAL | Stripe webhook handler (idempotency check); only the webhook route touches this. RLS from `20260803102000_b0d_rls_lockdown_capture.sql` (hand-applied 2026-05-09, migration-captured 2026-08-03). |
| `daily_transits` | INTERNAL | Date-keyed shared cache; horoscope generation API reads/writes via service role. Browser reads `daily_horoscopes` (per-user-computed result), not transits directly. RLS from `20260803102000_b0d_rls_lockdown_capture.sql` (hand-applied 2026-05-09, migration-captured 2026-08-03). |
| `charts` | USER_DATA | Birth-data PII per user; browser reads/writes via Clerk session. RLS from `20260413141504_schema_hardening.sql`; four additional hand-applied split policies (`charts_select_own`/`_insert_own`/`_update_own`/`_delete_own`, redundant with `charts_owner_all`, not a security issue) captured in `20260803102500_charts_split_policies_capture.sql`. |
| `ai_readings` | USER_DATA | Cached Oracle readings per user/chart/topic; browser reads via Clerk session. RLS from `20260413141504_schema_hardening.sql`. |
| `daily_horoscopes` | USER_DATA | Cached daily horoscope per user/chart/date; browser reads via Clerk session. RLS from `20260413141504_schema_hardening.sql`. |
| `push_subscriptions` | USER_DATA | Per-user push endpoints; browser writes (subscribe/unsubscribe) via Clerk session. RLS from `20260413141504_schema_hardening.sql`. |
| `subscription_quotas` | USER_DATA | Cap-gate accounting per user. RLS from `20260413141504_schema_hardening.sql` (SELECT-only owner policy; writes via service role). See B.0f footnote below — wiring deferred to its own sub-round. |
| `diary_entries` | USER_DATA | Лунен дневник per user. RLS from `20260421150801_create_diary_entries.sql`. |
| `user_crystals` | USER_DATA | Per-user crystal collection; browser reads via Clerk session. RLS from `20260803102000_b0d_rls_lockdown_capture.sql` (hand-applied 2026-05-09, migration-captured 2026-08-03). |
| `user_daily_crystals` | USER_DATA | Per-user daily crystal visits. RLS from `20260803102000_b0d_rls_lockdown_capture.sql` (hand-applied 2026-05-09, migration-captured 2026-08-03). |
| `bulgarian_cities` | CATALOG | Wizard autocomplete (~5,500 rows of public reference data). RLS from `20260803102000_b0d_rls_lockdown_capture.sql` (hand-applied 2026-05-09, migration-captured 2026-08-03). |
| `crystals` | CATALOG | Crystal display data. RLS from `20260803102000_b0d_rls_lockdown_capture.sql` (hand-applied 2026-05-09, migration-captured 2026-08-03). |
| `crystal_listings` | CATALOG | Phase B+ vendor display (currently empty). RLS from `20260803102000_b0d_rls_lockdown_capture.sql` (hand-applied 2026-05-09, migration-captured 2026-08-03). |
| `crystal_vendors` | CATALOG | Phase B+ vendor display (currently empty). RLS from `20260803102000_b0d_rls_lockdown_capture.sql` (hand-applied 2026-05-09, migration-captured 2026-08-03). |
| `crystal_recommendations` | USER_DATA | Per-user crystal-recommendation reasons (`packages/core/src/crystals/overview.ts`/`queries.ts`, served via `GET /api/crystals`). **RLS currently disabled in production** — found 2026-08-03, not previously classified in this doc at all. Not currently exploitable (service-role-only access path with explicit `user_id` filtering, no anon/browser-direct reads). Fix migration `20260803100000_crystal_recommendations_rls.sql` written, dry-run-verified, **not yet applied to production**. |
| `bg_generation_flags` | INTERNAL | Runtime observation table for Bulgarian generation-quality safety net (2026-07-29). One row per horoscope/Oracle LLM generation; `generated_text` NULL unless flagged. `input_conditions` deliberately carries no chartId/userId — astrological conditions only. Written fire-and-forget from `apps/web/lib/ai/check-bg-output.ts`; read only via the offline `scripts/i18n/report-generation-flags.mjs` report script (service role). Migration `20260729120000_bg_generation_flags.sql`. |
| `push_tokens` | USER_DATA | Per-user Expo push token registry (mobile native transport; sibling to `push_subscriptions`, not a replacement — different shape/transport). Mobile writes via Clerk session (`/api/push/register`); daily-horoscope delivery cron and cleanup-deleted-accounts cascade read/write via service role. RLS from `20260803070000_push_tokens.sql`. |
| `connection_spaces` | USER_DATA | Stream K (Кръг) — dormant, zero references in current app code (confirmed by repo-wide grep). Pre-provisioned schema for future synastry/friends-group features; RLS + owner-scoped policies already correct in production, found hand-applied with zero migration record 2026-08-03, captured in `20260803101500_capture_stream_k_relationship_schema.sql`. Do not build against without re-verifying the schema still matches product intent — it predates any current spec. |
| `connection_members` | USER_DATA | Stream K, dormant. Same provenance/status as `connection_spaces`. RLS from `20260803101500_capture_stream_k_relationship_schema.sql`. |
| `connection_invites` | USER_DATA | Stream K, dormant. Same provenance/status as `connection_spaces`. RLS from `20260803101500_capture_stream_k_relationship_schema.sql`. |
| `connection_reports` | USER_DATA | Stream K, dormant. Same provenance/status as `connection_spaces`. RLS from `20260803101500_capture_stream_k_relationship_schema.sql`. |
| `relationship_profiles` | USER_DATA | Stream K, dormant. Same provenance/status as `connection_spaces`. RLS from `20260803101500_capture_stream_k_relationship_schema.sql`. |
| `relationship_invites` | USER_DATA | Stream K, dormant. Same provenance/status as `connection_spaces`. RLS from `20260803101500_capture_stream_k_relationship_schema.sql`. |
| `compatibility_reports` | USER_DATA | Stream K, dormant. Same provenance/status as `connection_spaces`. RLS from `20260803101500_capture_stream_k_relationship_schema.sql`. |
| `saved_people_profiles` | USER_DATA | Stream K, dormant. Same provenance/status as `connection_spaces`. RLS from `20260803101500_capture_stream_k_relationship_schema.sql`. |
| `saved_people_reports` | USER_DATA | Stream K, dormant. Same provenance/status as `connection_spaces`. RLS from `20260803101500_capture_stream_k_relationship_schema.sql`. |
| `processed_revenuecat_events` | INTERNAL | Idempotency table for the RevenueCat webhook (REVISIT-62, sub-commit A). Mirrors `processed_webhook_events`' shape but kept as its own table rather than reusing Stripe's `stripe_event_id`-named column. Written only by the RevenueCat webhook route (service role). RLS from `20260803122000_revenuecat_provider_column.sql`. |

### Footnote — `subscription_quotas` wiring (B.0f — CLOSED 2026-05-10)

The table exists in production from migration `20260413141504_schema_hardening.sql`. Wiring landed in B.0f across four sub-commits (`01fef4d` → `aee772b`, closed 2026-05-10). All RLS reads via the per-user SELECT policy (`subscription_quotas_owner_select`); all writes (insert, update via RPC) via service role bypass. No direct browser writes — quota mutations are exclusively through `/api/oracle/generate`.

**Application surface (post-B.0f close):**
- **Helper library** `apps/web/lib/subscriptions/quota.ts` — four exports: `getCurrentPeriodQuota` (idempotent find-or-create), `checkQuotaAvailable` (premium short-circuit + free-tier read), `incrementQuotaUsage` (atomic conditional cap-claim via RPC), `decrementQuotaUsage` (refund path via RPC).
- **Postgres RPC functions** added in migration `20260510130557_quota_functions.sql`:
  - `increment_quota_if_available(p_user_id, p_period_start) RETURNS integer` — atomic conditional UPDATE; returns new used count or NULL on race-loss / cap-reached.
  - `decrement_quota_usage(p_user_id, p_period_start) RETURNS integer` — atomic UPDATE with `GREATEST(0, ai_readings_used - 1)` floor; returns new used count or NULL when row doesn't exist.
  - Both functions atomic at row level via Postgres MVCC; concurrent writers serialize on the row lock during UPDATE.
- **Consumer:** only `/api/oracle/generate` reads/writes the quota. `/api/horoscope/generate` is exempt per D6=β (daily horoscope doesn't count against the unified Oracle bucket). `/api/oracle/teaser` is exempt (free→premium conversion teaser, counting it would penalize the conversion mechanism).

**Final spec landed:**
- Free tier: 3 readings/month (schema default `ai_readings_limit=3`; `ORACLE_FREE_MESSAGES_PER_DAY` env var deleted as part of canonical-source-of-truth cleanup).
- Premium tier: uncapped (D1 — no quota row created; `checkQuotaAvailable` short-circuits with `available: true`).
- Period: monthly calendar anchor (Europe/Sofia month start = `period_start`, last day of month = `period_end`).
- Fresh start: no backfill of existing `ai_readings` counts; first AI request of new period creates row from zero.
- Regenerations exempt from quota (B.0f-2-fix-1 ratification — separate 24-hour-per-chart-topic cooldown still applies via existing rate-limit at step 6 of the route).
- Cache hits never increment quota (Pattern B: cap-check + cap-claim run only after step-5 cache miss, on the path that calls the LLM).
- Pattern B atomic cap-claim BEFORE LLM call; refund-on-failure via `decrementQuotaUsage` in the four refund paths (chart-not-found pre-Llama, jsonOnly inner catch, streamText `onError`, streamText `onFinish` persist failure, outer catch).
- Approach C `result.consumeStream()` ensures the LLM stream completes server-side regardless of client connection state — onFinish fires reliably and the reading persists, so a quota slot consumed mid-abort still results in a fully cached reading available on retry. The jsonOnly path (mobile) inherits Approach C semantics automatically via `await generateText` without `abortSignal`.

**REVISIT-34** filed for cap magnitude re-evaluation post Кръг soft-launch close (Path Z framing — 3/month is experimental, not permanent).

## The B.0d remediation migration

**Correction 2026-08-03:** this section records the SQL as originally drafted/intended, not what ended up live — direct production query found `bulgarian_cities` actually carries two role-specific policies (`cities_select_anon` for `anon`, `cities_select_authenticated` for `authenticated`), not the single `bulgarian_cities_public_read` shown below. The now-current, production-matching migration is `supabase/migrations/20260803102000_b0d_rls_lockdown_capture.sql` — treat that file as the accurate record for all eight tables; the prose block below is historical intent, kept for context, not verified against what actually shipped.

Statement-by-statement form that worked. Apply via Supabase SQL Editor as **individual statements**, not wrapped in `BEGIN; … COMMIT;` (see SQL Editor quirk note below).

```sql
-- INTERNAL: ENABLE RLS, no policies. Anon denied; service role bypass.
ALTER TABLE public.users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_calculations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhook_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_transits            ENABLE ROW LEVEL SECURITY;

-- USER_DATA: ENABLE RLS + owner-only policy via Clerk JWT.
ALTER TABLE public.user_crystals             ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_crystals_owner_all        ON public.user_crystals
  FOR ALL
  USING      (user_id = auth.jwt() ->> 'sub')
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

ALTER TABLE public.user_daily_crystals       ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_daily_crystals_owner_all  ON public.user_daily_crystals
  FOR ALL
  USING      (user_id = auth.jwt() ->> 'sub')
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- CATALOG: ENABLE RLS + public-read. Writes via service role only (no INSERT/UPDATE/DELETE policy).
ALTER TABLE public.bulgarian_cities          ENABLE ROW LEVEL SECURITY;
CREATE POLICY bulgarian_cities_public_read   ON public.bulgarian_cities
  FOR SELECT USING (true);

ALTER TABLE public.crystals                  ENABLE ROW LEVEL SECURITY;
CREATE POLICY crystals_public_read           ON public.crystals
  FOR SELECT USING (true);

ALTER TABLE public.crystal_listings          ENABLE ROW LEVEL SECURITY;
CREATE POLICY crystal_listings_public_read   ON public.crystal_listings
  FOR SELECT USING (true);

ALTER TABLE public.crystal_vendors           ENABLE ROW LEVEL SECURITY;
CREATE POLICY crystal_vendors_public_read    ON public.crystal_vendors
  FOR SELECT USING (true);
```

This is what's currently active in production. Verified by curl audit pattern post-execution: 7 INTERNAL tables return `[]` to anon, 2 CATALOG tables return rows, INSERT against `users` returns PostgREST error 42501 "new row violates row-level security policy."

## Discipline going forward

**Every new table created from this point forward MUST:**

1. Have RLS enabled in the same migration that creates it. No exceptions, no follow-up migrations.
2. Be classified in this document (INTERNAL / USER_DATA / CATALOG) before the migration is committed.
3. Have the appropriate policy created in the same migration:
   - INTERNAL → no policy (RLS-enabled-no-policy denies all non-bypass roles)
   - USER_DATA → owner-match policy on the user-id column
   - CATALOG → public-read policy

**PR review checklist for any migration that creates a table:**

- [ ] Does the migration include `ALTER TABLE … ENABLE ROW LEVEL SECURITY` for the new table?
- [ ] If USER_DATA or CATALOG: does the migration include a `CREATE POLICY` statement?
- [ ] Has the table been added to the per-table classification table in this doc?
- [ ] Post-deploy: has the curl audit pattern been run against the new endpoint to verify (return `[]` for INTERNAL/USER_DATA-without-auth, rows for CATALOG)?

## Server-side access pattern (B.0e clarification, 2026-05-09)

The actual server-side Supabase access pattern in `apps/web` is uniformly:

```ts
const supabase = createServiceSupabaseClient()  // service role, bypasses RLS
const { data } = await supabase
  .from('<table>')
  .select('*')
  .eq('user_id', userId)                          // manual ownership filter
```

This is the pattern documented under INTERNAL and used for USER_DATA tables above. **There is no second server-side data-access path.** The B.0d Task 2 audit confirmed every API route, every `(protected)/page.tsx` server-side fetch, every cron handler, every Stripe webhook, and every GDPR / oracle / horoscope / diary / push route uses `createServiceSupabaseClient()` + `.eq('user_id', …)`. RLS is the second line of defense — service role bypasses it; ownership is enforced by the manual `user_id` filter.

### Two valid auth-entry patterns (REVISIT-44 clarification, 2026-07-21)

Every API route starts by getting the Clerk `userId` before it does the service-role query above, and there are **two correct ways to do that** — not one "standard" with a violation, despite older docs implying a single canonical guard:

```ts
// Pattern 1 — requireAppUser() from apps/web/lib/auth/guards.ts
const { userId, user } = await requireAppUser()
// calls auth() + ensureUserRecord(userId): upserts the `users` row if
// missing, returns the full AppUser row alongside the id.
```

```ts
// Pattern 2 — raw auth() + service-role + manual filter
const { userId } = await auth()
if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
// no ensureUserRecord call — the route doesn't assume a `users` row exists.
```

**When to use which:**
- **`requireAppUser()`** — the route needs the `users` row itself (subscription tier, GDPR deletion-pending flag, etc.) via `requirePremium()`/`requireAccountActive()`, or writes a row that has a `users` foreign key and needs the upsert guarantee first.
- **Raw `auth()` + manual filter** — the route is null-tolerant on a missing `users` row (e.g. diary's `entry_date >= users.created_at` lower-bound check treats a missing `created_at` as "no lower bound") and doesn't need `ensureUserRecord`'s upsert side effect.

Both patterns are correct under the B.0d RLS lockdown — the divergence is a deliberate per-route choice (diary routes use Pattern 2 because their lower-bound check is null-tolerant), not an inconsistency to refactor away. See REVISIT-44 in `REVISIT-TRIGGERS.md` for the audit that surfaced this and closed it as a documentation fix rather than a code harmonization.

### Deleted in B.0e: `apps/web/lib/supabase/server.ts` (`createServerSupabaseClient`)

A vestigial factory that predated the Clerk third-party-auth migration. It fetched a Clerk JWT via the legacy `template: 'supabase'` shape and injected it as a Bearer header for RLS-driven authentication. **It had zero callers** `[verified 2026-05-09 via repo-wide grep]` — execution diverged from the Phase 3 plan (which had aspirationally promised "all API routes import `createServerSupabaseClient()`" in `03-VERIFICATION.md`). Deleted in B.0e to ratify the de-facto architecture and remove the third-path-nobody-uses ambiguity.

### Browser-side: `useSupabaseClient` exists but has zero callers

The hook in `apps/web/lib/supabase/client.ts` uses the modern `accessToken()` callback (third-party-auth-compatible) and is correct as written, but **no Client Component currently invokes it** `[verified 2026-05-09]`. Web's browser code reaches the database exclusively through Server Component reads + API route writes. If a future phase needs RLS-authed browser reads (e.g., real-time subscriptions, optimistic updates), deliberately re-introduce a caller at that point — the hook is ready and the third-party-auth integration on Supabase is wired.

### Why this matters for table classification

The USER_DATA RLS policies above (owner-match via `auth.jwt() ->> 'sub'`) are not currently exercised by any browser query path on web. They are fail-safe protection: if the publishable key is misused or a future direct-browser-read is introduced without thinking, RLS will deny anon access and require a valid Clerk JWT. They cost nothing operationally and represent zero blast radius today. Keep them — but understand that B.0d's lockdown gets its real-world enforcement from `ENABLE ROW LEVEL SECURITY` denying anon (the INTERNAL posture's mechanism), not from owner-match policies blocking legitimate-but-misrouted reads.

## Supabase SQL Editor BEGIN/COMMIT silent-failure quirk

**Discovered during B.0d remediation 2026-05-09.**

The first attempt at the lockdown migration wrapped all statements in a `BEGIN; … COMMIT;` block per the original B.0d plan (single-transaction approach for atomic rollback safety). Supabase SQL Editor returned "Success. No rows returned." Founder confirmed the success message. But the verification audit run minutes later showed the database state was **unchanged** — none of the `ALTER TABLE` or `CREATE POLICY` statements had taken effect.

**Fix that worked:** removed the `BEGIN; … COMMIT;` wrapper, ran the same statements one block at a time. Same SQL content, no transaction wrapper. Lockdown took effect immediately.

**Diagnosis:** unclear whether the SQL Editor silently rolls back transaction blocks under some condition, or whether something about how it streams the multi-statement input interacts with the BEGIN/COMMIT framing. Either way, the empirical signal is unambiguous: **don't use BEGIN/COMMIT wrappers in Supabase SQL Editor for DDL changes that need to take effect.**

**Recommended workflow for future schema changes via SQL Editor:**

1. Run statements **individually**, not wrapped in transactions.
2. Verify each statement's effect immediately via a follow-up query (e.g., `SELECT rowsecurity FROM pg_tables WHERE tablename = '<table>'` after `ALTER TABLE … ENABLE RLS`).
3. If multi-statement atomicity is required, use the Supabase CLI's migration system (`supabase migration up`) or a direct `psql` connection — both honor explicit transactions properly.
4. Always end with the curl audit pattern against the affected tables to confirm REST-API-observable state matches intent.

## How to verify lockdown via curl

Reusable verification pattern. Replace `<TABLE>` and `<PUB_KEY>`:

```bash
# Read test (INTERNAL or USER_DATA → expect []; CATALOG → expect rows)
curl -isS 'https://zsypmpswqrhkfvlnowcp.supabase.co/rest/v1/<TABLE>?select=*&limit=5' \
  -H "apikey: <PUB_KEY>" \
  -H "Authorization: Bearer <PUB_KEY>"

# Write test (any table → expect 401/403/42501)
curl -isS -X POST 'https://zsypmpswqrhkfvlnowcp.supabase.co/rest/v1/<TABLE>' \
  -H "apikey: <PUB_KEY>" \
  -H "Authorization: Bearer <PUB_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"<minimal_required_column>": "test_lockdown_check"}'
```

`PUB_KEY` is the value of `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `apps/web/.env.local`. The same key visitors to the site can extract from the JS bundle.

The PostgREST error code `42501` ("insufficient_privilege") with message "new row violates row-level security policy" is the canonical signal that RLS is enforcing on writes.

---

*Last updated 2026-05-09 at B.0d close.*
