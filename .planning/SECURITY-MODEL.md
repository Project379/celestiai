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

## Per-table classification (all 17 tables in public schema, as of 2026-05-09)

| Table | Posture | Reasoning |
|---|---|---|
| `users` | INTERNAL | Server reads tier via service role (`getCachedUserTier`); browser never queries directly. AppUser data is hydrated via the new `/api/user` endpoint (CA-0002 work, B.0c). |
| `audit_logs` | INTERNAL | `logAuditEvent` writes via service role; browser never reads. |
| `chart_calculations` | INTERNAL | Chart-calc API writes via service role; chart-id-keyed (no user_id column on this table). Browser receives chart data via `/api/chart/calculate` API JSON, not directly. |
| `processed_webhook_events` | INTERNAL | Stripe webhook handler (idempotency check); only the webhook route touches this. |
| `daily_transits` | INTERNAL | Date-keyed shared cache; horoscope generation API reads/writes via service role. Browser reads `daily_horoscopes` (per-user-computed result), not transits directly. |
| `charts` | USER_DATA | Birth-data PII per user; browser reads/writes via Clerk session. RLS from migration 0008. |
| `ai_readings` | USER_DATA | Cached Oracle readings per user/chart/topic; browser reads via Clerk session. RLS from 0008. |
| `daily_horoscopes` | USER_DATA | Cached daily horoscope per user/chart/date; browser reads via Clerk session. RLS from 0008. |
| `push_subscriptions` | USER_DATA | Per-user push endpoints; browser writes (subscribe/unsubscribe) via Clerk session. RLS from 0008. |
| `subscription_quotas` | USER_DATA | Cap-gate accounting per user. RLS from 0008 (SELECT-only owner policy; writes via service role). |
| `diary_entries` | USER_DATA | Лунен дневник per user. RLS from `20260421150801_create_diary_entries.sql`. |
| `user_crystals` | USER_DATA | Per-user crystal collection; browser reads via Clerk session. RLS added in B.0d remediation. |
| `user_daily_crystals` | USER_DATA | Per-user daily crystal visits. RLS added in B.0d remediation. |
| `bulgarian_cities` | CATALOG | Wizard autocomplete (~5,500 rows of public reference data). Public-read policy added in B.0d. |
| `crystals` | CATALOG | Crystal display data. Public-read policy added in B.0d. |
| `crystal_listings` | CATALOG | Phase B+ vendor display (currently empty). Public-read policy added in B.0d. |
| `crystal_vendors` | CATALOG | Phase B+ vendor display (currently empty). Public-read policy added in B.0d. |

## The B.0d remediation migration

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

This is the pattern documented under INTERNAL and used for USER_DATA tables above. **There is no second server-side path.** The B.0d Task 2 audit confirmed every API route, every `(protected)/page.tsx` server-side fetch, every cron handler, every Stripe webhook, and every GDPR / oracle / horoscope / diary / push route uses `createServiceSupabaseClient()` + `.eq('user_id', …)`. RLS is the second line of defense — service role bypasses it; ownership is enforced by the manual `user_id` filter.

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
