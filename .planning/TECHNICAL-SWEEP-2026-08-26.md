---
title: Full Technical Sweep — 2026-08-26
status: investigation only, nothing fixed, awaiting founder ruling on the whole set
method: read against code and against production Postgres directly; docs used only as leads
---

# Full Technical Sweep — 2026-08-26

**Rule applied throughout:** every claim below is either VERIFIED (I ran the
query / read the code / executed the check) or INFERRED (reasoned from
evidence, with the confirming step named). No claim is carried over from
another planning doc. Six doc-vs-code contradictions were reported this
session; this sweep found three more, listed in §10.

Production Postgres was queried read-only via `DATABASE_URL` from
`apps/web/.env.local` using the `postgres` driver already in the lockfile.
Catalog queries only (`pg_class`, `pg_policy`, `pg_constraint`,
`supabase_migrations.schema_migrations`, row counts). No writes.

---

## 0. Prioritised findings

Nothing below is fixed. Ranked by severity, then by breadth of what it blocks.
V = VERIFIED (query run, code read, or check executed). I = INFERRED, with the
confirming step named in the section body.

| # | Sev | Finding | § | What it blocks | V/I |
|---|---|---|---|---|---|
| 1 | CRITICAL | `REVENUECAT_WEBHOOK_SECRET` is byte-identical to the `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` shipped in the app bundle — forgeable premium grants. Also means the webhook has never been verified against real traffic. | 2.1 | Any real purchase flow. Blocks trusting mobile subscription state at all. | V |
| 2 | CRITICAL | `/api/horoscope/generate` has no quota of any kind — `checkQuotaAvailable` is called from one file in the repo, and it is not this one. | 4.1 | Nothing functionally; blocks safe public launch. Uncapped AI spend. | V |
| 3 | CRITICAL | Chart creation is uncapped (no count check anywhere). Chained with #2, a **free** account reaches ~7,200 unquota'd paid generations/day. | 4.2 | Same as #2 — this is the mechanism that makes #2 exploitable without premium. | V |
| 4 | HIGH | Premium is entirely unmetered on every AI path; the 10/min burst limiter is its only brake. | 4.3 | Unit economics. A single scripted premium account outspends its subscription. | V |
| 5 | HIGH | Both circle report routes are unmetered and version-bumping, so every call is a fresh paid generation with no cache. | 4.4 | Same as #4. | V |
| 6 | HIGH | GDPR delete never touches `user_crystals` / `user_daily_crystals`; neither has an FK to `users`, so nothing cascades either. | 5.1 | GDPR Art. 17 compliance. Blocks a clean EU launch. | V |
| 7 | HIGH | Every `.delete()` in the cleanup cron ignores its returned `error`. A non-throwing failure destroys the retry anchor and reports success. | 5.2 | Same as #6, and it defeats the Batch 5.5 #4 ordering fix, which assumed failures throw. | V |
| 8 | HIGH | Migration ledger holds 6 rows against 16 repo files; 16 production tables have no `CREATE TABLE` anywhere. **`supabase db push` would replay a destructive `DROP COLUMN` migration.** | 1.4–1.5 | Any fresh environment (staging, DR, a second region). Also makes any schema change risky. | V |
| 9 | HIGH | Web has never deployed; build **passes locally** (exit 0), so the cause is environmental. Ranked diagnostic order given. | 7 | The privacy URL, `EXPO_PUBLIC_WEB_APP_URL`, Stripe redirects, Clerk production, the RevenueCat webhook test. The widest blocker on the board. | V |
| 10 | HIGH | Diary list is unbounded end to end — no `.limit()`, no `.range()`, rendered by `.map()` in a plain `ScrollView`. Silently truncates at PostgREST's 1000-row cap. | 6.3 | Nothing today. Fails for the first committed daily journaler. | V (cap is I) |
| 11 | HIGH | Both crons select unbounded and process sequentially; the web-push cron is one-at-a-time under a 300s cap, with no cursor, so the same prefix is served daily and the tail never gets a push. | 6.4 | Push delivery past ~1,500 subscribers. Deletion throughput past ~30 users/day. | V |
| 12 | MEDIUM | Both public Sentry DSNs are in the wrong app's env file. **Mobile Sentry is disabled entirely; web browser-side Sentry is too.** Only web server-side reports. | 2.2 | Any observability. The 2026-08-26 device pass ran with no crash reporting attached. | V |
| 13 | MEDIUM | GDPR export omits the same crystals tables as #6, plus push tables and quotas. | 5.3 | GDPR Art. 15. Same single root cause as #6. | V |
| 14 | MEDIUM | Oracle regenerate cooldown resets itself — a fresh generation writes `last_regenerated_at: null`. | 4.5 | Leaks one extra generation per cycle on free; removes the last brake on premium. | V |
| 15 | MEDIUM | Reanimated worklet warning: `NatalWheelFrame` is unmemoised, so the single `useAnimatedProps` object is re-attached to `AnimatedG` on every planet tap. **This is the answer to the open "~30fps until force-quit" question at `NatalWheel.tsx:180–182`.** | 6.2 | Chart-tab frame rate. Nothing else. | I (mechanism named; confirm by memoising and re-running the tap sequence) |
| 16 | MEDIUM | **Two** VirtualizedList nesting instances, not one: `CitySearch` inside `wizard/location.tsx` (the one that warned) and inside `SavedProfileForm` → `circle/new.tsx`. `TimePicker` is clear at both its sites — it is inside a `Modal`. | 6.1 | Nothing at 202 cities. Real if the city catalogue grows. | V |
| 17 | MEDIUM | The rate limiter fails open by design, and it is the *only* control on several money-spending routes. | 4.6 | A Supabase degradation removes every cost control in §4 at once. | V |
| 18 | LOW | PostgREST filter injection in `cities/search` — raw user input interpolated into an `.or()` string. Only repo-wide instance. RLS confines it to a 202-row public catalog. | 3 | Nothing. Fix on principle. | V |
| 19 | LOW | `crystal_listings` and `crystal_vendors` are empty in production — the crystal "where to buy" surface renders blank for everyone. | 1.6 | That feature's usefulness. A seeding gap, not a code defect. | V |
| 20 | LOW | `rate_limit_buckets` is the only table with RLS off. One `ALTER TABLE` fixes it; behaviourally a no-op. | 1.3 | Nothing. Consistency only. | V |
| 21 | LOW | Env hygiene: `NEXT_PUBLIC_APP_URL` is localhost, `EXPO_PUBLIC_WEB_APP_URL` is a literal placeholder, RevenueCat vars sit in the web env file with trailing spaces, `users.stripe_customer_id` is double-indexed. | 2.4, 6.5 | Production Stripe redirects; the mobile subscribe CTA. | V |

**Came out clean, stated as a result rather than an absence:**

- **§3 authorisation.** All 40 routes read. Every route authenticates or
  verifies a secret/signature; every route rate-limits; no client-supplied ID
  is trusted anywhere — including the three routes where an unscoped service
  helper is followed by a caller-side membership check, which is the classic
  place this breaks. Middleware is deny-by-exception with a backup layout
  guard.
- **§6.5 indexes.** Composite indexes match the real query shapes; partial
  indexes where they belong; sane statement timeouts per role.
- **§1.1 RLS coverage.** 30 of 31 tables have RLS enabled with the right
  posture for their class.

**What to rule on.** Items 1–3 are the ones I would not ship past. Item 9 is
the widest blocker but is yours, not the code's. Items 6–7 are one fix each and
share a root cause with 13. Item 8 is the largest single piece of work and the
only one where the obvious next command is destructive.

---

## 0b. Device pass — Batches 1–7 closed

Founder ran the real Android build 2026-08-26 and everything from Batches 1
through 7 verified working. Those batches were all carrying "not
device-tested" in the tracker; that qualifier is now retired for 1–7. Two
findings came out of the pass and are carried into this sweep rather than
fixed on the spot: the VirtualizedList nesting warning (§6.1, two instances) and the
Reanimated worklet warning (§6.2).

---

## 1. Database and RLS

### 1.1 RLS state — VERIFIED against production

Queried `pg_class.relrowsecurity` + `pg_policy` for all 31 public tables.

**Every table has RLS enabled except one: `rate_limit_buckets` (RLS = false).**

Posture by class, all matching `.planning/SECURITY-MODEL.md`:

- USER_DATA (owner-scoped policies keyed on the Clerk `sub` claim): `charts`,
  `ai_readings`, `daily_horoscopes`, `diary_entries`, `push_subscriptions`,
  `push_tokens`, `subscription_quotas`, `user_crystals`,
  `user_daily_crystals`, `crystal_recommendations`, `saved_people_profiles`,
  `saved_people_reports`, `relationship_profiles`, `relationship_invites`,
  `compatibility_reports`, `connection_spaces`, `connection_members`,
  `connection_invites`, `connection_reports`.
- CATALOG (public read): `bulgarian_cities`, `crystals`, `crystal_listings`,
  `crystal_vendors`.
- INTERNAL (RLS on, zero policies — deny-all, service role bypasses):
  `users`, `audit_logs`, `chart_calculations`, `bg_generation_flags`,
  `daily_transits`, `processed_webhook_events`,
  `processed_revenuecat_events`.

### 1.2 crystal_recommendations — the tracker is WRONG

**VERIFIED:** `crystal_recommendations` has `relrowsecurity = true` in
production and carries exactly one policy, `crystal_recommendations_owner_all`,
`FOR ALL`, with owner-scoped USING and WITH CHECK expressions. That is
byte-for-byte what `20260803100000_crystal_recommendations_rls.sql` creates.

**There is nothing to run for crystal_recommendations. The tracker's
"RLS disabled in production, fix migration written but unapplied" entry is
stale and should be struck.** The migration was applied by hand at some
point and never recorded in the ledger.

### 1.3 The one real divergence — rate_limit_buckets

**VERIFIED:** `rate_limit_buckets` is the only table with RLS off. The repo
holds two migrations in sequence: `..._131500_rate_limit_buckets_disable_rls`
(turned it off) and `..._133000_rate_limit_buckets_enable_rls` (turns it back
on, with the reasoning that RLS-on-no-policy is this repo's convention for
service-role-only tables). Production state matches the *disable*, so the
enable was never applied.

**Exactly what to run — this one statement, in the Supabase SQL editor:**

```sql
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
```

Behaviourally a no-op for the app: `apps/web/lib/rate-limit.ts` is the sole
reader/writer and goes through the service-role client, which carries
BYPASSRLS. This is a consistency fix, not a live hole.

### 1.4 Migration history does NOT reproduce production — the big one

**VERIFIED** by querying `supabase_migrations.schema_migrations` directly.
The ledger holds **six** rows:

```
20260420100254  realign_charts_approximate_time_range
20260421150801  create_diary_entries
20260509163000  create_relationship_profiles      <- no file in repo
20260510093000  create_saved_people_profiles      <- no file in repo
20260511103000  create_connection_spaces          <- no file in repo
20260729120000  bg_generation_flags
```

The repo holds **sixteen** migration files. So the ledger is desynced in both
directions: **thirteen repo migrations are unrecorded**, and **three ledger
entries have no corresponding file**.

Separately, and this is the deeper problem: **sixteen tables that exist in
production have no CREATE TABLE anywhere in tracked migrations.** Computed as
a set difference between the 31 tables in `pg_class` and every `CREATE TABLE`
statement across all sixteen migration files:
`ai_readings`, `audit_logs`, `bulgarian_cities`, `chart_calculations`,
`charts`, `crystal_listings`, `crystal_recommendations`, `crystal_vendors`,
`crystals`, `daily_horoscopes`, `daily_transits`, `processed_webhook_events`,
`push_subscriptions`, `user_crystals`, `user_daily_crystals`, `users`. These
are the Drizzle-era tables; `packages/db/drizzle` was deleted, so their base
schema has no SQL record anywhere. (An empty vestigial `__drizzle_migrations`
table is still sitting in production.) `20260803102000_b0d_rls_lockdown_capture.sql`
flags this in its own header — that flag was accurate and is still open.

**A fresh database built from `supabase/migrations/` alone would not boot the
app.** This is the same class of problem as `processed_webhook_events`, but
sixteen times over.

### 1.5 DANGER — do not run `supabase db push`

**This is the one place in this report where the obvious next step is
destructive.** `db push` will try to apply all thirteen unrecorded
migrations, including `20260413141504_schema_hardening.sql`, which contains
an `ALTER TABLE public.users DROP COLUMN subscription_tier`, a
`RENAME COLUMN`, and a back-population `INSERT`. Against a production
database where that work is already done, that is data loss, not a no-op.

The safe reconciliation is `supabase migration repair --status applied <version>`
for each file already reflected in production, done one at a time after
confirming each file's effect is present. That is its own scoped job.

### 1.6 Catalog tables that are empty

**VERIFIED** by row count: `crystal_listings` = 0 and `crystal_vendors` = 0.
`crystals` = 30, `bulgarian_cities` = 202. So the crystal "where to buy this"
surface has no data behind it — it will render empty for every user. Not a
defect in code; a seeding gap.

---

## 2. Secrets and credentials

Nothing secret is committed. **VERIFIED:** `git ls-files` matched no
`.pem` / `.p8` / `.p12` / `.keystore` / `google-services` / service-account
file, and `.gitignore` covers `.env`, `.env.local`, `.env*.local`, plus
`*.se1` ephemeris data.

### 2.1 CRITICAL — the RevenueCat webhook secret is a public key

**VERIFIED** by byte comparison of the two values:

```
REVENUECAT_WEBHOOK_SECRET  ==  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
```

They are identical, 32 characters, both beginning `test_nueux`. The
`EXPO_PUBLIC_` prefix means that value is inlined into the mobile JS bundle
and ships inside the APK/IPA.

`apps/web/app/api/webhooks/revenuecat/route.ts` is well built — raw body,
HMAC-SHA256 over timestamp-dot-body, `timingSafeEqual`, 300-second replay
window, fail-closed on a missing secret, insert-first idempotency. All of
that is defeated if the signing secret is a value anyone can read out of the
app bundle: forge a subscription-granting payload, sign it, grant yourself
premium.

Two consequences, and the second matters more than the first:

1. **Today the blast radius is small** — it is a Test Store key, and the
   webhook has never been exercised end-to-end because web has never
   deployed.
2. **The webhook has therefore never actually worked.** RevenueCat signs with
   the *integration's own signing secret*, created in Dashboard →
   Integrations → Webhooks and shown once. That is a different value from
   any SDK API key. So real RevenueCat traffic would have been rejected with
   401 at the signature check. This is a never-run gate, in the sense of
   `feedback_ungated_things_hide_problems`: the code looks right and has
   never been proven against real traffic.

The fix is not code. It is: create the webhook integration in RevenueCat,
copy the real signing secret, set `REVENUECAT_WEBHOOK_SECRET` to *that*, and
never again let it equal an `EXPO_PUBLIC_` value.

### 2.2 The Sentry DSNs are in the wrong files — both are dead

**VERIFIED** by reading the init code and grepping both env files:

| File | Defines | Code actually reads |
|---|---|---|
| `apps/web/.env.local` | `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` | `instrumentation-client.ts` reads `NEXT_PUBLIC_SENTRY_DSN` — **not set** |
| `apps/mobile/.env.local` | `NEXT_PUBLIC_SENTRY_DSN` | `lib/monitoring/sentry.ts` reads `EXPO_PUBLIC_SENTRY_DSN` — **not set** |

The two public DSN variables are exactly swapped between the two apps.

Consequences: **mobile Sentry is silently disabled entirely** — `sentry.ts`
guards on a truthy `dsn`, and `dsn` is `undefined`, so `Sentry.init` never
runs. **Web browser-side Sentry is also disabled** for the mirror-image
reason. Only web *server-side* Sentry works, because `SENTRY_DSN`
(unprefixed) is set and `sentry.server.config.ts` / `sentry.edge.config.ts`
read it.

This corrects the tracker, which says mobile errors land in the web project.
They land nowhere. That also means the device pass ran with no crash
reporting attached — anything that failed silently on device produced no
Sentry event to go back and read.

### 2.3 Everything is on test/development credentials

**VERIFIED** by prefix:

| Key | Value prefix | Mode |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_` | development |
| `CLERK_SECRET_KEY` | `sk_test_` | development |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_` (same instance as web) | development |
| `STRIPE_SECRET_KEY` | `sk_test_` | test mode |
| `STRIPE_PRICE_MONTHLY` / `_ANNUAL` | `price_1T1r…` | test-mode prices |
| RevenueCat iOS/Android SDK keys | `test_` | RevenueCat Test Store |

**What changes when Clerk goes to production, and what breaks.**

A Clerk production instance is a *separate instance*, not a flag. Consequences,
all INFERRED from how Clerk is structured — confirm each in the Clerk
dashboard before switching:

- **Every existing user is gone.** Development and production instances do
  not share a user table. All 13 rows in `users` reference dev-instance
  Clerk IDs. Those values become dangling — every FK in the schema
  (`charts`, `ai_readings`, `daily_horoscopes`, the push tables,
  `subscription_quotas`, plus the unconstrained `user_id` columns) points at
  identities that will not exist. Not an outage, but every current account,
  including your own test data, is orphaned.
- **A production instance requires a verified domain with DNS records.**
  Clerk issues CNAMEs (`clerk.`, `accounts.`, `clkmail.`, plus DKIM) that
  must be added at the registrar for stellaeum.com. This blocks on the
  domain, which currently serves nothing.
- **The JWT template for Supabase RLS must be recreated on the production
  instance** and the Supabase project's JWT secret / JWKS URL re-pointed at
  it. Miss this and every owner-scoped policy in §1.1 evaluates against a
  token Supabase cannot verify — the browser-side paths silently return zero
  rows. Service-role paths keep working, which is exactly what makes this
  failure mode quiet.
- **Mobile ships the live publishable key and needs a rebuild.** It is an
  `EXPO_PUBLIC_` value baked into the bundle, so this is a new build, not a
  config change.
- **OAuth providers must be re-configured with production credentials.**
  Development instances use Clerk's shared dev OAuth apps; production
  requires your own client IDs and secrets per provider.

### 2.4 Smaller env hygiene items — VERIFIED

- `apps/web/.env.local` defines `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and
  `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` **with a trailing space before the
  equals sign**. Web never reads them, so this is inert, but they should not
  be in the web env file at all.
- The iOS and Android RevenueCat SDK keys are the same value. Correct for a
  Test Store key; *not* correct in production — App Store and Play Store
  apps get distinct `appl_` and `goog_` keys.
- `EXPO_PUBLIC_WEB_APP_URL` in `apps/mobile/.env.local` is literally the
  string `REPLACE_WITH_WEB_APP_URL`. Confirmed placeholder; blocks the
  mobile free-tier "subscribe on web" CTA. Blocked on Vercel.
- `NEXT_PUBLIC_APP_URL` is `http://localhost:3000`. Stripe redirect URLs are
  built from this, so production checkout returns users to localhost until it
  is changed.

---

## 3. Authorisation

**This section came out clean, and I want to be specific about that rather
than vague.** I read the auth model of all 40 route files.

**VERIFIED — every route is covered.** Every route handler either calls
`auth()` / `requireAppUser()` and returns 401 on absence, or (the two crons)
verifies `CRON_SECRET` with a timing-safe comparison, or (the two webhooks)
verifies a provider HMAC signature over the raw body. No route reaches
authenticated data on an unauthenticated path.

**VERIFIED — every route rate-limits.** Every authenticated route calls
`assertRateLimit` before doing DB work. On the routes where ordering matters
most (`gdpr/delete-account`, `stripe/checkout`) the limiter deliberately runs
against a `userId` from `auth()` *before* `requireAppUser()`, so a burst
cannot force an `ensureUserRecord` upsert first. That fix held.

**VERIFIED — no client-supplied ID is trusted.** I specifically hunted the
shape you asked about:

- `chartId` (oracle, horoscope): fetched, then explicitly compared —
  a mismatch against `chart.user_id` returns 403.
- `profileId` (circle profiles, reports, delete): every path goes through
  `getSavedProfileForUser(userId, profileId)`, which filters on both the id
  and the owner. Ownership is in the query, not a later branch.
- `relationshipId` / `spaceId` (weather, report, archive): the service
  helpers `getSpaceById` and `getLatestConnectionReport` are *unscoped* by
  design, but **all three callers check membership immediately** before using
  the result. And `listSpaceMembers` filters on `status = 'active'`, so a
  removed or archived member does not retain access. I checked this
  specifically because an unscoped helper plus a caller-side check is the
  classic place this breaks; here it does not.
- `inviteId`: compared against `invite.inviter_user_id`, 403 on mismatch.

**VERIFIED — middleware.** `apps/web/middleware.ts` is deny-by-exception with
an explicit protected matcher covering `/dashboard`, `/chart`, `/birth-data`,
`/you`, `/rhythm`, `/circle`, `/subscription`, backed by a second redirect in
`app/(protected)/layout.tsx`. Security headers and a strict CSP are set.
`/monitoring` (the Sentry tunnel) is deliberately public and carries no data.

**One low-severity item, and it is injection, not authorisation.**
`apps/web/app/api/cities/search/route.ts:58` interpolates raw user input into
a PostgREST filter string via `.or(...)`. A query containing a comma or a
closing paren breaks out of the intended filter and can append conditions.
Impact is genuinely small — the client is the *anon* client, so RLS applies,
and the anon role can only read `bulgarian_cities`, a 202-row public catalog.
But it is the only place in the codebase doing this (VERIFIED by grep — one
hit repo-wide), and it should not survive. Same route: the `limit` parameter
comes from the query string with no clamp and no NaN guard.

---

## 4. Rate limiting and cost

**You were right that there are more shapes. There is one considerably worse
than the oracle regenerate bypass, and it affects free users.**

### 4.1 CRITICAL — `/api/horoscope/generate` has no quota at all

**VERIFIED.** `checkQuotaAvailable` and `incrementQuotaUsage` are called from
exactly one file in the entire repo: `apps/web/app/api/oracle/generate/route.ts`.
Grep confirms no other call site.

`/api/horoscope/generate` calls `generateText` / `streamText` against
OpenRouter with `maxOutputTokens: 2000`. Its only brakes are:

- `assertRateLimit`, 5 per minute per user, and
- the `daily_horoscopes` cache, unique on (chart_id, date).

So the cost ceiling is **one paid AI generation per chart per day** — which
would be fine, if the number of charts were bounded.

### 4.2 CRITICAL — chart creation is uncapped, and that is what makes 4.1 exploitable

**VERIFIED.** `POST /api/birth-data` rate-limits at 10/minute and calls
`createBirthChart`. Neither the route nor
`packages/core/src/charts/birth-data.ts` contains any count check, cap, or
tier gate — grep for limit/count/MAX/cap in that core module returns nothing.

Chaining 4.1 and 4.2: a single **free** account can create 10 charts a minute
— 14,400 a day — and each new chart is a fresh (chart_id, date) cache key, so
each one unlocks another AI horoscope generation that no quota touches.

Two separate limiters are involved, so keep the numbers apart: **charts
creatable** is 14,400/day at 10/min; **paid generations actually reachable**
is 7,200/day, because `/api/horoscope/generate` carries its own 5/min limit.
**7,200 is the cost figure.** The monthly reading quota does not touch this
path at all, and each chart creation additionally triggers a Swiss Ephemeris
compute.

This is a bigger hole than the regenerate bypass you already found, because
it needs no premium tier and no unusual flag — just a loop over the normal
create-chart endpoint.

### 4.3 HIGH — premium is entirely unmetered on every AI path

**VERIFIED** in `oracle/generate` step 7a/7b: `checkQuotaAvailable`
short-circuits to available for premium, and the `incrementQuotaUsage` claim
is skipped entirely under a non-premium guard. Premium's only brake anywhere
is the 10/minute burst limiter.

That is up to 14,400 oracle generations per day per premium account, at 2,000
output tokens each. A single compromised or scripted premium subscription
costs far more in inference than it pays in subscription. There is no
per-period ceiling of any kind for premium on any route.

### 4.4 HIGH — both circle report routes are unmetered

**VERIFIED.** `circle/relationships/[relationshipId]/report` and
`circle/profiles/[profileId]/report` each gate on the user's tier being
premium, then generate. Each POST writes a **new version row**
(next version = baseline + 1), so there is no cache to hit — every call is a
fresh paid generation. Rate limit is 5/minute. That is 7,200 paid
compatibility reports per day per premium account, per route.

### 4.5 MEDIUM — the regenerate cooldown resets itself

**VERIFIED** in `oracle/generate`, in both the JSON and streaming upsert
paths: `last_regenerated_at` is written as the current timestamp when the
call is a regeneration of an existing reading, and **as `null` otherwise**.

So any *fresh* generation clears the 24-hour cooldown that step 6 checks. The
cooldown is not "once a day per chart-topic"; it is "once per fresh
generation," and a fresh generation is available whenever the 7-day cache
expires — or on any new chart, see 4.2. The quota claim still happens on the
fresh generation, so on the free tier this leaks one extra generation per
cycle rather than unlimited. On premium, where there is no quota, it removes
the only remaining brake.

### 4.6 The rate limiter fails open — by design, but worth knowing

**VERIFIED** in `apps/web/lib/rate-limit.ts`: if the
`check_and_increment_rate_limit` RPC errors, the function logs and returns,
letting the request through. Defensible for availability. It does mean a
Supabase degradation removes every cost control in §4 simultaneously, since
the limiter is the *only* control on several of these paths.

### 4.7 What is correctly protected — so the list above is read in context

The two crons verify `CRON_SECRET` with `timingSafeEqual`. The Stripe webhook
uses `constructEvent` on the raw body. The RevenueCat webhook does HMAC plus
replay window plus insert-first idempotency. The oracle quota claim is a real
atomic conditional UPDATE via RPC with a refund path on generation failure.
None of that is the problem; the problem is the routes that never enter that
machinery.

---

## 5. Data integrity

### 5.1 HIGH — GDPR deletion misses the crystals tables entirely

**VERIFIED** two ways: by reading
`apps/web/app/api/cron/cleanup-deleted-accounts/route.ts` end to end, and by
querying `pg_constraint` for every FK in the schema.

`user_crystals` and `user_daily_crystals` both carry a `user_id` column
(confirmed via `information_schema.columns`). Neither has a foreign key to
`users` — their only FK is to `crystals` (confirmed in the FK dump). And
neither appears anywhere in the deletion cron.

**So a user's crystal collection and daily-crystal history survive account
deletion permanently, keyed to their Clerk ID, with no cascade and no
explicit delete to remove them.** That is personal data retained after an
Art. 17 erasure request.

`crystal_recommendations` is covered, but only incidentally — it cascades
from `charts.id`, not from the user.

### 5.2 HIGH — every delete in the cron ignores its own error result

**VERIFIED.** `supabase-js` `.delete()` does not throw; it returns an object
carrying `error`. In the cleanup cron, **none** of the delete calls
destructure or check that field — not `daily_horoscopes`,
`chart_calculations`, `ai_readings`, `saved_people_reports`,
`saved_people_profiles`, `connection_reports`, `connection_invites`,
`connection_members`, `connection_spaces`, `charts`, `push_subscriptions`,
`push_tokens`. The `deleteUserDiaryEntries` helper *does* return a failure
result, and the cron logs it and then deliberately continues.

The consequence interacts badly with the (otherwise correct) Batch 5.5 #4
ordering fix. That fix made the `users` row the retry anchor: delete Clerk
first, `users` row last, so any thrown failure leaves the row in place and
tomorrow's run retries. But a *non-throwing* delete failure never reaches
that safety net. The loop proceeds, deletes the Clerk account, deletes the
`users` row — and the retry anchor is gone, permanently, with the user's data
still in the table. The counter increments and the run reports success.

This is the inconsistent-state failure you asked about, and the ordering fix
does not cover it, because the ordering fix assumed failures throw.

### 5.3 MEDIUM — GDPR export omits the same crystals data

**VERIFIED** by reading `apps/web/app/api/gdpr/export/route.ts`. It exports
`charts`, `ai_readings`, `daily_horoscopes`, `diary_entries`,
`connection_spaces`, `connection_members`, `connection_invites`,
`connection_reports`, `saved_people_profiles`, `saved_people_reports`, and
`users`. It does **not** export `user_crystals`, `user_daily_crystals`,
`crystal_recommendations`, `push_tokens`, `push_subscriptions`, or
`subscription_quotas`.

The crystals subsystem is therefore missing from *both* GDPR paths — export
and erasure — which is a consistent, single-cause gap rather than two
unrelated ones. `audit_logs` is also not exported; that is more defensible
(it is a security log), but it is a judgement call worth making deliberately,
and note its FK is ON DELETE SET NULL, so audit rows survive deletion with a
null `user_id`.

### 5.4 MEDIUM — the deletion ordering itself is sound; the batch shape is not

The Clerk-before-users-row ordering (Batch 5.5 #4) is correct, and the 404
idempotency handling for an already-deleted Clerk account is correct. Those
hold up.

What does not scale is the batch: the selection query has no LIMIT, the
per-user work is fully sequential, and `maxDuration` is 60 seconds. See §6.4.

---

## 6. Performance at scale

### 6.1 VirtualizedList nesting — exactly one instance, VERIFIED

You asked for every instance, not just the one that warned. **There are two,
and only one of them is on the wizard path you saw.**

Method, in three steps — the first two alone would have missed the second hit:

1. **Which components hold a VirtualizedList.** Grep across the whole mobile
   app returns exactly two `FlatList` uses: `components/wizard/CitySearch.tsx:174`
   and `components/wizard/TimePicker.tsx:80`. `packages/` contains none
   (VERIFIED — no `FlatList` or `SectionList` anywhere in `packages/`). No
   `FlashList`.
2. **Where each of those components is rendered.** This is the step that
   matters: one definition can have many mount sites.
3. **Whether a `ScrollView` sits anywhere in the ancestor chain** — RN warns
   on any ancestor, not just the immediate parent — and whether a `Modal`
   breaks that chain.

Results:

- **`CitySearch` — nested at BOTH of its two mount sites.** It has no `Modal`
  wrapper (VERIFIED by grep), so its FlatList is inline in whatever tree
  mounts it.
  - **Instance 1** — `app/(authed)/wizard/location.tsx:181`, inside a
    `ScrollView` spanning lines 105–295. This is the one that warned on the
    device pass.
  - **Instance 2** — `components/circle/SavedProfileForm.tsx:376`. That form
    has no `ScrollView` of its own, and it is mounted at
    `app/(authed)/circle/new.tsx:36`, inside a `ScrollView` spanning lines
    26–43. Same defect, different screen: the Кръг "add a saved person" flow.
    It would not have warned during a wizard-only device pass.

  Both set `nestedScrollEnabled`, which fixes Android's scroll-gesture
  conflict but does nothing for windowing — the warning and the lost
  virtualisation both remain.

- **`TimePicker` — not nested at either of its two mount sites.** Its exported
  component wraps everything in a React Native `Modal`
  (`TimePicker.tsx:134–207`), which renders into a separate root hierarchy and
  breaks the ancestor chain regardless of what mounted it. That holds for both
  `app/(authed)/wizard/time.tsx:314` — which is in any case outside that
  screen's ScrollView, closing at line 310 — and `SavedProfileForm.tsx:454`.
  It is also iOS-only (Android uses the imperative
  `DateTimePickerAndroid.open()`), and its data is a fixed 24/60-item column.

I also checked `ScreenShell.tsx`, which wraps its children in a `ScrollView`
(lines 183–202), since anything rendered inside it would nest too. **None of
the four mount sites above sits under `ScreenShell`** (VERIFIED by grep).

Real-world impact of both instances is modest — `bulgarian_cities` holds 202
rows and the API defaults to 20 — but they are genuine defects, and the second
one is the reason this needed a render-site enumeration rather than a
component grep.

### 6.2 The Reanimated worklet warning — mechanism identified, and it resolves a known open item

The warning is "Tried to modify key `current` of an object which has been
already passed to a worklet," fired during chart interaction.

**VERIFIED facts:** `useAnimatedProps` appears exactly once in the entire
mobile app — `components/chart/NatalWheel.tsx:565`, producing `graticuleProps`.
It is passed as a **prop** at line 604 into `NatalWheelFrame`, which attaches
it at `NatalWheelFrame.tsx:111` via an `AnimatedG` with `animatedProps`.
**`NatalWheelFrame` is not memoised** — grep for `memo` in that file returns
nothing, unlike its sibling `WheelStaticLayers`, which *is* wrapped in `memo`.

**INFERRED mechanism** — confirm on device by memoising `NatalWheelFrame` and
re-running the tap sequence: a planet tap changes selection state in
`NatalWheel`, which re-renders. `WheelStaticLayers` is memoised and bails
out; that was the Batch 1 fix. `NatalWheelFrame` is not, so it re-renders and
re-attaches the same `useAnimatedProps` object to `AnimatedG` on every single
tap. Reanimated's animated-props object carries internal mutable
view-descriptor state; re-attaching an object already handed to a worklet is
precisely what produces that warning text.

**Why this matters more than a stray warning:** the comment at
`NatalWheel.tsx:180–182` records a previous session's unexplained
observation — that the Batch 1 memo fix narrowed per-tap cost but did *not*
explain "stays at ~30fps until force-quit," and guessed the cause was "an
animated-value/worklet subscription from WheelArrivalContainer or
graticuleProps not tearing down," needing a profiler session. **This finding
is that answer, arrived at from the opposite direction.** The accumulation
across taps and the warning are the same defect.

I also ruled out the other candidate that comment named: `WheelArrivalContainer`
passes `onSettled` into a `withTiming` completion worklet, but **no caller
ever passes `onSettled`** (VERIFIED — `chart.tsx:169` renders it with only
`wheelSize` and `triggerKey`), so that closure captures nothing.

### 6.3 HIGH — the diary list is unbounded end to end

**VERIFIED.** `listDiaryEntries` in `packages/core/src/diary/entries.ts` has
two `.order(...)` calls and **no `.limit()` and no `.range()`**.
`GET /api/diary/entries` calls it and returns the whole array. On mobile,
`app/(authed)/rhythm/journal.tsx` renders into a plain `ScrollView` and
`ManifestHistory.tsx:41` maps over the entries — no virtualisation at all.

At 3 entries this is invisible. A user journaling daily for two years has
~730 rows of free text fetched in one response and mounted as ~730 view trees
at once. There is also a silent ceiling: Supabase's PostgREST caps un-ranged
responses (default 1000 rows), so past that the list quietly truncates rather
than erroring — INFERRED from the Supabase default, since `supabase/config.toml`
sets no max_rows; confirm in Dashboard → Settings → API → Max rows.

This is the clearest "works at 3, fails at 300" in the codebase.

### 6.4 HIGH — both crons are unbounded and sequential

**VERIFIED** — these are the only two files in the API surface with a
`.select()` and no `.limit()`, `.range()`, `.single()`, or `.maybeSingle()`
anywhere. I checked all 110 select call sites programmatically.

- **`cron/daily-horoscope`**: selects every row of `push_subscriptions`, then
  awaits `webpush.sendNotification` **one at a time in a for loop**, with
  `maxDuration = 300`. At a realistic ~200ms per send that is a hard ceiling
  around 1,500 users before the function is killed mid-loop. There is no
  cursor and no resume marker, so the same prefix of users is served every day
  and the tail never receives a notification. The PostgREST 1000-row cap bites
  first and is entirely silent. The Expo/mobile half is better — it chunks
  properly via `expo.chunkPushNotifications` — but its `push_tokens` select is
  equally unbounded, and it adds a fixed 10-second sleep for receipts inside
  the same 300s budget.
- **`cron/cleanup-deleted-accounts`**: selects every expired user with no
  limit and processes them sequentially, each user costing a dozen-plus round
  trips, under `maxDuration = 60`. Combined with §5.2, a timeout mid-user
  leaves partial deletion — though here the retry anchor does work, because a
  timeout does not delete the `users` row.

### 6.5 Indexes — VERIFIED, and they are good

I dumped every index in the public schema from `pg_indexes`. Coverage is
genuinely solid: composite indexes on the actual query shapes
(`ai_readings(chart_id, topic, expires_at DESC)`,
`daily_horoscopes(chart_id, date DESC)`, `diary_entries(user_id, entry_date)`,
`connection_members(space_id, user_id)` and `(user_id, status, joined_at DESC)`,
`saved_people_reports(profile_id, version)`), plus partial indexes where they
belong (`push_tokens(revoked_at) WHERE revoked_at IS NULL`,
`users(subscription_expires_at) WHERE subscription_status = 'active'`).

Two small notes: `users` has `stripe_customer_id` indexed **twice** (duplicate
index, harmless but pure write overhead), and `bulgarian_cities` has a btree
on `name_ascii` that the leading-wildcard ILIKE search in §3 cannot use — that
search is a sequential scan. At 202 rows nobody will ever notice.

Statement timeouts are set sensibly (anon 3s, authenticated 8s), and
service_role has none — which is why the crons in §6.4 can run long enough to
hit the Vercel duration limit instead of a database one.

---

## 7. Vercel

**The single most useful thing I can tell you: the production build passes
locally.** I ran `pnpm --filter @stellaeum/web build` to completion — exit 0,
all 40 API routes and 20 pages compiled, sweph / dictionary-bg / geo-tz
externalised correctly, Sentry plugin ran. So the code is not the problem.
The failure is environmental, and that lets me rank the candidates tightly
instead of listing everything that could theoretically go wrong.

Note one line from that log: `- Environments: .env.local`. Locally Next reads
that file off disk. On Vercel it does not exist, and every value must arrive
through the process environment. That single difference is the root of
candidates #1 and #2.

### Diagnostic order — read the build log against this list, top down

**#1 — Turbo strict env mode, surfacing as a Stripe crash at page-data
collection. Check this first; it is the only candidate that explains a
deterministic, repeatable failure that cannot reproduce locally.**

Two facts combine:

- **VERIFIED:** `turbo.json` declares no `env` and no `globalEnv` — the build
  task has only `dependsOn` and `outputs`. Turborepo 2.x filters task
  environments by default, so variables not declared are not passed through
  to `next build`.
- **VERIFIED by execution:** `apps/web/lib/stripe/client.ts:11` constructs the
  Stripe client with `process.env.STRIPE_SECRET_KEY!` at **module scope**. I
  ran that constructor with an undefined key against the installed stripe@20
  and it throws: `Neither apiKey nor config.authenticator provided`. That is a
  module-load throw, so it fires during Next's page-data collection for the
  four `/api/stripe/*` routes and the Stripe webhook — the same phase that
  produced the earlier dictionary-bg failure documented in `next.config.js`.

**The discriminating fact is your Vercel Root Directory setting**, and you can
settle it from the first few lines of the build log:

- If the log shows `turbo run build` — this candidate is live. Fix by adding
  an env allowlist to `turbo.json` (`globalEnv` covering the `STRIPE_`,
  `CLERK_`, `NEXT_PUBLIC_`, `SUPABASE_`, `SENTRY_`, `VAPID_` families plus
  `OPENROUTER_API_KEY`, `CRON_SECRET`, `REVENUECAT_WEBHOOK_SECRET`).
- If the log shows `next build` directly in `apps/web` — turbo is not in the
  path, this candidate drops out entirely, and you go to #2.

Either way, `stripe/client.ts` should be a lazy getter rather than a
module-scope constructor. That is a two-line change that makes a missing env
var produce a 500 on one route instead of a failed build.

**#2 — pnpm workspace visibility from the Root Directory.**

**VERIFIED:** there is no `.npmrc` anywhere in the repo, so pnpm uses its
default isolated node-linker, and `pnpm-workspace.yaml` lives at the repo
root. If Vercel's Root Directory is `apps/web`, the install step never sees
the workspace file, and the `workspace:*` protocol on `@stellaeum/core` and
`@stellaeum/astrology` is unresolvable — install fails before any compile
output appears. The setting that fixes this is *Include source files outside
of the Root Directory in the Build Step*. In the log this shows as a failure
during install, not build.

**#3 — Env vars that must exist at build time, not just runtime.**

Beyond the Stripe module-scope case, `NEXT_PUBLIC_` values are inlined at
build time and cannot be added afterward. The set web needs at build:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, the four `NEXT_PUBLIC_CLERK_*_URL`
values, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, and
`NEXT_PUBLIC_SENTRY_DSN` — which, per §2.2, does not currently exist anywhere.
`SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` are read by
`withSentryConfig` at build; their absence degrades to warnings rather than
failing, but `silent: !process.env.CI` means Vercel sets CI and you will see
the plugin's full output either way.

**#4 — sweph resolution. This is a RUNTIME failure, not a build failure — rank
it after you have a green build.**

**VERIFIED:** `sweph` is a dependency of `packages/astrology`, **not** of
`apps/web`. It is listed in `serverExternalPackages` *and* forced into
`config.externals` for the server build, so it is deliberately not bundled —
which means Node must require it from disk at request time. With pnpm's
isolated linker it is only physically present under
`packages/astrology/node_modules`, and it is a native N-API module whose
`.node` binary is loaded through node-gyp-build's dynamic require, a pattern
Vercel's file tracer cannot follow statically.

This cannot be causing the 404, because it produces a 500 on ephemeris routes
after a successful deploy. But it is the next thing that will break, and the
mitigation is cheap: add `sweph`, `geo-tz`, and `dictionary-bg` to `apps/web`'s
own dependencies so they resolve from the app that externalises them, and
confirm the Vercel build image's Node major matches the `>=22` engines field.

**#5 — Things I checked and cleared, so you do not spend log-reading time on
them.** **`turbo run build` does not fan out to mobile** — VERIFIED:
`apps/mobile/package.json` declares `start` / `android` / `ios` / `web` /
`typecheck` / `lint` and **no `build` script**, and neither do any of the four
`packages/*`. `apps/web` is the only workspace with one, so an Expo or EAS
build cannot fire inside the Vercel container even if the Root Directory is
the repo root. `apps/web/vercel.json` is valid and declares only the two crons.
`next.config.js` contains a `console.log` at config load — noise, not a
failure. `@stellaeum/ui` is declared as a dependency but is **not imported
anywhere in web** (VERIFIED by grep), so its absence from `transpilePackages`
is harmless; it is simply a dead dependency. `@stellaeum/core` and
`@stellaeum/astrology` ship raw TypeScript via source exports and *are* listed
in `transpilePackages`, correctly. `next build` type-checks and lints by
default and passed locally, so neither is a hidden Vercel-only gate.

---

## 8. RevenueCat

### 8.1 Why the Test Store key fails, and what it actually means

`InvalidCredentialsError` against the native SDK is expected and is not a
misconfiguration on your side. RevenueCat's **Test Store** is a simulation
layer intended for Expo Go and preview flows; its `test_` key is not accepted
by the native `react-native-purchases` SDK, which requires a platform key
(`appl_` for iOS, `goog_` for Android) bound to a real store connection. The
device confirmation you got is the correct outcome, not a bug to chase.

### 8.2 What exists in code today — VERIFIED

Less than the tracker implies, and this is worth being blunt about.
`apps/mobile/lib/purchases/RevenueCatProvider.tsx` does exactly two things:
`Purchases.configure({ apiKey })` at root-layout mount, and
`Purchases.logIn(clerkUserId)` / `Purchases.logOut()` tracking Clerk auth
state. **Grep across the entire mobile app finds no `getOfferings`, no
`purchasePackage`, no `getCustomerInfo`, and no entitlement read.** There is no
paywall screen and no purchase call. The identity plumbing is real; the
purchase flow does not exist yet in any form.

The server half — the webhook route, `handleRevenueCatEvent`, the
`processed_revenuecat_events` idempotency table, and the
`subscription_provider` column — is fully built. It has just never received a
verified request, for the two reasons in §2.1 (wrong secret) and §7 (never
deployed).

### 8.3 The actual path to a working purchase, in dependency order

**Testable with neither Apple nor Google — do this first. It is real work and
it unblocks everything else:**

1. In the RevenueCat dashboard, create the **entitlement** (one identifier,
   e.g. `premium`) and an **offering** with monthly and annual packages.
   Entitlement and offering identifiers are what your code references, and
   they are stable across stores — you can define them before any store
   connection exists.
2. Write the missing client code against those identifiers: a paywall screen
   calling `getOfferings()`, `purchasePackage()`, and an entitlement check via
   `getCustomerInfo()`. With no store connection this will not complete a
   purchase, but every code path up to the store handoff is exercisable.
3. Create the **webhook integration** in RevenueCat, take the real signing
   secret, and put it in `REVENUECAT_WEBHOOK_SECRET`, replacing the public SDK
   key currently sitting there (§2.1). The webhook cannot be tested end-to-end
   until web deploys, but the secret should be corrected now so it is not
   forgotten.
4. Keep using the Test Store for **Expo Go / preview builds only**, where it
   works. Do not put its key into a native build again.

**Blocked on Apple** — in order, each step gating the next:

5. Apple Developer Program enrolment completes, giving App Store Connect
   access.
6. Create the app record with bundle ID `com.stellaeum.app` (matches
   `app.json`, VERIFIED). **The Paid Applications Agreement must be signed and
   active in App Store Connect** — this is the single most commonly missed
   step, and until it is active, in-app purchase products will not load and
   RevenueCat will report the app as misconfigured with no obvious cause.
7. Create the two auto-renewable subscription products in a subscription
   group. Note their product IDs.
8. Generate the **In-App Purchase key (.p8)** in App Store Connect → Users and
   Access → Integrations. Upload it to RevenueCat with the Issuer ID and Key
   ID. This is what lets RevenueCat validate receipts and receive Apple's
   server notifications.
9. In RevenueCat, add the iOS app, paste the App Store Connect credentials,
   attach the products to your packages, and take the `appl_` public SDK key.
   That replaces `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.
10. TestFlight build → purchases work in the sandbox against a Sandbox Apple ID.

**Blocked on Google** — independent of Apple, so these can run in parallel:

11. Google Play Console account (one-time fee; identity verification can take
    days) → create the app with package `com.stellaeum.app`.
12. Create the two subscription products. **Google requires an app uploaded to
    a track — internal testing is enough — before subscriptions can be
    created.** You cannot configure products against an empty listing.
13. Create a **Google Cloud service account**, grant it Play Console access
    with the financial-data permission, download its JSON credentials, and
    upload that JSON to RevenueCat. Play's permission propagation is genuinely
    slow — allow up to 36 hours before it starts working, and do not assume it
    is broken before then.
14. Take the `goog_` key into `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`. Test
    with a licence-tester account on the internal track.

**The honest summary:** steps 1–4 are yours today and are the majority of the
*code* work. Everything from 5 onward is gated on accounts you do not yet
have, and Google's step 13 has a multi-day latency worth starting early
precisely because it is slow and cheap to start.

---

## 9. Founder track — what no amount of code can resolve

Ordered by how much each blocks. "Rejected outright" means a store reviewer
fails the submission; "unfinished" means it ships but is incomplete.

### Tier 1 — blocks the most, start today

**1. Vercel deployment and the domain, together.**
These are one item, not two. stellaeum.com is bought and serving nothing, and
web has never deployed. Everything downstream waits on this: the privacy URL
that App Store Connect requires as a form field, `EXPO_PUBLIC_WEB_APP_URL`
(currently the literal string `REPLACE_WITH_WEB_APP_URL`), the mobile
free-tier "subscribe on web" CTA, the RevenueCat webhook end-to-end test,
Stripe's redirect URLs (currently localhost:3000), and Clerk's production
instance, which needs DNS records on that domain.
*Prerequisite:* none — this is the root of the tree.
*Time:* hours, if §7's candidate #1 is the cause. Days if you have to bisect.
*In parallel:* everything in Tier 2. Nothing in Tier 1 waits on it except
Clerk production.
**Rejection risk: yes, indirectly.** A privacy policy URL is a required field
in App Store Connect and Apple checks that it resolves. A 404 there is a
rejection.

**2. Apple Developer Program enrolment.**
The longest lead time on the board, and nothing about it is under your
control. Individual enrolment is often same-day; if you enrol as a company you
need a D-U-N-S number, which alone can take one to two weeks.
*Prerequisite:* none. **Start it before you finish reading this.**
*Time:* 1 day to 2+ weeks.
*In parallel:* everything. Nothing else needs it to begin.
**Rejection risk: n/a — without it you cannot submit at all.**

**3. Google Play Console setup — only if Android is a launch target.**
You have a working Android build and `com.stellaeum.app` is configured, so
Android is the cheaper first market. One-time registration fee, identity
verification, and — for a new personal developer account — Google's
requirement of a **closed test with 12+ testers running for 14 continuous
days** before you may apply for production access. That is a hard 14-day
calendar wall no amount of preparation shortens.
*Prerequisite:* none to start; a build on a track before you can create
subscription products.
*Time:* days to register, then 14 days of testing you cannot compress.
*In parallel:* everything.
**This is probably your real critical path, and it is worth deciding today
whether Android is a launch target — because if it is, the 14-day clock should
already be running.**

### Tier 2 — blocks submission, does not block itself

**4. RevenueCat dashboard configuration.**
Full ordered breakdown in §8.3. Entitlement, offering, and webhook secret are
doable today with no store account. Store connections split cleanly: iOS needs
items 5–10, Android needs 11–14, and the two do not block each other.
*Time:* 2–3 hours of dashboard work spread across the dependencies.
*In parallel:* yes — and the Google service-account step has up-to-36-hour
propagation, so start it the day you have Play access.

**5. Terms of Service page, and privacy-policy reachability.**
`/privacy` **does** exist as a route — VERIFIED in the build output. `/terms`
does not. App Store Connect requires a privacy URL and a EULA; Apple's
standard EULA is acceptable if you do not supply your own, but a subscription
app with no visible terms is a common rejection under Guideline 3.1.2, which
requires subscription terms to be visible *inside the app* as well as on the
web.
*Prerequisite:* Vercel, for the URLs to resolve.
*Time:* half a day for the page; longer if you want a lawyer's eyes on it.
**Rejection risk: yes.** Guideline 3.1.2 is actively enforced on subscription
apps, and a dead privacy URL is an automatic fail.

**6. App icon.**
Still outstanding on the designer brief. **VERIFIED in `app.json`:** there is
no `icon` field at all, and no `android.adaptiveIcon`. A splash and a
notification icon are configured; the app icon is not.
*Prerequisite:* the designer.
*Time:* yours is the waiting.
**Rejection risk: yes — you cannot submit without one.** This is a hard
blocker that is easy to leave until it is urgent. Chase the designer now.

### Tier 3 — real, but does not block a first build in someone's hands

**7. Clerk production instance.**
Full breakdown in §2.3. The headline: it is a separate instance, all 13
existing users are orphaned, it needs DNS on stellaeum.com, the Supabase JWT
template must be recreated, and mobile needs a rebuild to ship the live key.
Development keys work fine for TestFlight and internal testing.
*Prerequisite:* the domain.
*Time:* half a day plus DNS propagation.
*In parallel:* yes — do this only when you are ready for real users, not
before. Switching early costs you your test data for no benefit.

**8. Analytics vendor decision, which gates the cookie consent banner.**
The dependency runs one way: the banner's content is determined by which
vendor you pick, so the decision gates the banner, and the banner gates a
GDPR-clean EU launch. Bulgaria is EU, so this is not optional at launch — but
it is not a submission blocker.
*Prerequisite:* none; it is a product call only you can make.
*Time:* an afternoon to decide, a day to implement.
**Rejection risk: no from Apple or Google. Real regulatory risk at EU launch.**

**9. Signed processor DPAs.**
Supabase, Clerk, OpenRouter, Sentry, RevenueCat, Stripe, Vercel. Most are
click-through in the vendor dashboard. Under GDPR Art. 28 you need one with
every processor touching personal data, and OpenRouter deserves specific
attention because chart data goes into prompts.
*Time:* an hour of clicking, minus whichever need negotiation.
**Rejection risk: no. Regulatory exposure: yes.**

**10. Sentry project for mobile.**
Worth doing, but §2.2 changes what it is. **Mobile errors are not landing in
the web project — mobile Sentry is disabled entirely**, because
`apps/mobile/.env.local` defines `NEXT_PUBLIC_SENTRY_DSN` and the code reads
`EXPO_PUBLIC_SENTRY_DSN`. Web's *browser-side* Sentry is dead for the
mirror-image reason. So this is one engineering fix (swap the two variable
names) plus one founder action (create a separate mobile project so the two
apps' issue streams do not merge).
*Time:* ten minutes in the Sentry dashboard.
*Do this before the next device pass* — the last one ran blind.

**11. AI provider fallback decision.**
Single provider (OpenRouter, Llama 3.3 70B), no retry, no secondary. An
OpenRouter outage means every AI surface fails. Genuinely a product and cost
call: a fallback model changes output voice and Bulgarian quality, which only
you can judge.
*Time:* the decision is yours; implementation is a day.

**12. Swiss Ephemeris licence.**
Deferred until first paying subscriber, trigger wired. `sweph` is pinned at
2.10.0-11 under GPL-2.0 (VERIFIED in the root pnpm overrides). The posture is
correct: GPL is fine until you distribute commercially without source, at
which point you need the commercial licence from Astrodienst.
*Prerequisite:* first paying subscriber.
*No action now.* Just do not let the trigger slip.

### What you did not list, and should have

**13. Apple's App Privacy questionnaire (the "nutrition label").**
Required at submission, separate from your privacy policy. You must declare
every data type collected and whether it is linked to identity. You collect
birth date, birth time, birth location, and free-text diary entries — the last
is the one to think about, because "Sensitive Info" and "Other User Content"
have specific handling. Getting this wrong is a rejection and a resubmission
cycle.

**14. Account deletion must be reachable in-app.**
Apple has required this since 2022 for any app with account creation. You have
it — the GDPR delete route plus mobile settings UI — so this is a
verify-and-tick, not a build. But confirm the mobile path is reachable in the
shipping build; reviewers look for it specifically and reject when they cannot
find it.

**15. Age rating and the astrology / fortune-telling category.**
Both stores ask. Google Play has historically been sensitive about
fortune-telling apps making claims; keep marketing copy on the
entertainment/reflection side rather than predictive certainty.

**16. Bulgarian-market App Store metadata.**
Screenshots at required device sizes, description, keywords, support URL —
another one that must resolve, see Vercel. Screenshots in particular are a
half-day you will not have budgeted, and they cannot be made until the UI work
in Batch 8 lands.

**17. Store listing localisation.**
The app is Bulgarian; the store listing should be too, with `bg` as a
supported locale. Easy to forget when the dashboard defaults to English.

**18. `app.json` is missing release fields.**
**VERIFIED:** no `ios.buildNumber`, no `android.versionCode`, and `version` is
0.1.0. Both stores reject or refuse re-upload without a monotonically
increasing build number. Engineering fix, but it is a submission blocker and
belongs on your radar.

### The shortest path to a testable build in someone else's hands

Being precise, because this is the question underneath all the others.

**You are much closer than "code complete" suggests, if you accept Android
internal testing as the target.** The honest ordering:

- **Fastest possible: 2–5 days, Android internal testing.** Google Play
  registration → upload the existing Android build to the internal testing
  track → invite testers by email. Internal testing does **not** require the
  14-day closed-test wait, does not require store review, and does not require
  a working purchase flow, a privacy URL, or a final-quality app icon. Your
  testers get a real installable app. **This is your shortest path and it is
  available now**, gated only on Play registration and a `versionCode` in
  `app.json`.
- **TestFlight: gated entirely on Apple enrolment.** 1 day to 2+ weeks for
  enrolment, then hours. TestFlight *external* testing requires a Beta App
  Review, which does check the privacy URL — so that path pulls in Vercel.
  Internal TestFlight, up to 100 of your own devices, does not require review
  and is nearly as fast as Android internal.
- **A build someone can actually *buy* in: 3–5 weeks minimum.** Purchase-flow
  code does not exist (§8.2), and store product configuration cannot even
  begin until Apple enrolment or Play access completes.
- **Public launch on Android: add 14 days minimum** for the closed-test
  requirement, and that clock starts only after you have 12 testers actually
  installing.

**The gap between where you are and a real user holding this is days, not
months — but only for testing.** The gap to a *paying* user is weeks, and the
binding constraints are all account-level: Apple enrolment, Play's 14-day
window, and Google's service-account propagation. None of them are
engineering. All of them can be started today, in parallel, and every day you
do not start them is a day added to the end.

---

## 10. Doc-versus-code contradictions found in this sweep

Adding to the six already reported this session.

**7. CLAUDE.md claims Drizzle ORM. There is no Drizzle.** VERIFIED — no
drizzle dependency in any `package.json`, no `pgTable` anywhere, no schema
file. All database access is `@supabase/supabase-js` via
`createCoreSupabaseClient` / `createServiceSupabaseClient`. The only trace is
an empty vestigial `__drizzle_migrations` table in production. CLAUDE.md also
still names Gemini/GPT-5 as the AI provider when it is OpenRouter and Llama
3.3 70B — the tracker already flags that line as stale.

**8. The tracker's crystal_recommendations RLS entry is wrong.** RLS is on in
production with the correct policy. See §1.2. This is the entry that would
have sent you to run a migration you do not need.

**9. The tracker's Sentry entry is wrong in a way that understates the
problem.** It says mobile errors land in the web project. They land nowhere.
See §2.2.

---

## 11. Batch 8 additions (UI/intuitiveness scope, recorded not scoped)

Per the founder's direction, added to Batch 8's list, not investigated here:

- **`AppLoadingScreen`** (`apps/mobile/components/design-system/AppLoadingScreen.tsx`)
  — the first thing every user sees, predates the design language entirely,
  needs a fresh mockup.
- **The whole wizard.** `.planning/design/mockups/wizard-v4.html` exists but
  the shipped screens do not match it. Open question for Batch 8: is the
  mockup usable as-is, or does it need redoing? Note that §6.1's only
  VirtualizedList defect is in the wizard, so a wizard redesign is the natural
  place to fix it.
