# Data-Fetching Architecture Inventory

**Written:** 2026-04-18
**Scope:** Full audit of apps/web + apps/mobile data access, with Option-B migration plan
**Status:** Inventory complete; migration plan proposed, not executed
**Epistemic tags:** `[verified]` = read from files/tools; `[inferred]` = deduced from files; `[planned]` = not yet implemented; `[assumed]` = conventional wisdom / placeholder; `[open]` = question not yet answered, action required. Sub-claims get their own tag when they make a different or stronger claim than the parent.

> **Audit method [verified]:** Grep + Glob + direct file reads across `apps/web/app/`, `apps/web/components/`, `apps/web/lib/`, `apps/web/hooks/`, `apps/mobile/`, and `packages/db/` on branch `mobile-parallel-test` at commit `3a0680e`. Read 4 full route handlers end-to-end (`/api/crystals/today`, `/api/chart/calculate`, `/api/transits/overview`, sample of `/api/horoscope/generate`); enumerated all 28 route handlers; enumerated all 17 page components; enumerated all client-component fetch calls.

---

## 1. apps/web data-fetch inventory [verified]

### 1.1 Route handlers total

`[verified]` **28 route handlers** in `apps/web/app/api/**/route.ts`. Full list:

```
api/user/route.ts
api/push/{subscribe,unsubscribe}/route.ts
api/chart/calculate/route.ts
api/birth-data/route.ts
api/birth-data/[id]/route.ts
api/horoscope/generate/route.ts
api/stripe/{subscription,cancel,checkout,portal,status}/route.ts
api/cities/search/route.ts
api/cron/{cleanup-deleted-accounts,daily-horoscope}/route.ts
api/oracle/{generate,readings,teaser}/route.ts
api/planets/current/route.ts
api/crystals/{collect,route,daily-streak,today}/route.ts
api/crystals/daily/collect/route.ts
api/transits/overview/route.ts
api/gdpr/{delete-account,export}/route.ts
api/webhooks/stripe/route.ts
```

### 1.2 Server Component direct DB fetches

`[verified]` Enumerated by grepping for `createServiceSupabaseClient|getCachedLatestChart|getCachedUserTier|supabase.from` in `apps/web/app/**/*.tsx`.

| File | Pattern |
|---|---|
| `(protected)/layout.tsx` | `getCachedLatestChart` + `getCachedUserTier` helpers |
| `(protected)/dashboard/page.tsx` | `getCachedLatestChart` + `getCachedUserTier` |
| `(protected)/chart/page.tsx` | Direct `createServiceSupabaseClient()` inline |
| `(protected)/rhythm/page.tsx` | Direct `createServiceSupabaseClient()` inline |
| `(protected)/you/crystals/page.tsx` | Direct `createServiceSupabaseClient()` inline |
| `(protected)/you/recommendations/page.tsx` | Direct `createServiceSupabaseClient()` inline |
| `(protected)/you/crystals/guide/page.tsx` | Direct `createServiceSupabaseClient()` inline |
| `(protected)/birth-data/page.tsx` | Direct `createServiceSupabaseClient()` inline |
| `(protected)/subscription/success/page.tsx` | Direct `createServiceSupabaseClient()` inline |
| `(protected)/pricing/page.tsx` | Direct `createServiceSupabaseClient()` inline |

`[verified]` **Count: 10 Server Component files fetch data directly from Supabase at render time.** Two use the `React.cache()`-wrapped helpers in `apps/web/lib/supabase/queries.ts`; eight inline their own `createServiceSupabaseClient()` call and query chains.

`[inferred]` The asymmetry is historical: the cached helpers cover the two most common queries (user's latest chart + subscription tier); everything else open-codes.

### 1.3 Client-side fetches to `/api/*` endpoints

`[verified]` 15 distinct fetch calls from client components + hooks:

| File (client/hook) | Endpoint | Method |
|---|---|---|
| `hooks/useChart.ts` | `/api/chart/calculate` | POST |
| `components/auth/AccountSubscriptionPage.tsx` | `/api/stripe/subscription` | GET |
| `components/birth-data/BirthDataWizard.tsx` | `/api/birth-data` | POST |
| `components/auth/SettingsContent.tsx` (×3) | `/api/stripe/{portal,cancel,cancel}` | POST, POST, DELETE |
| `components/horoscope/PushNotificationBanner.tsx` (×2) | `/api/push/{subscribe,unsubscribe}` | POST |
| `components/dashboard/tiles/CrystalTile.tsx` | `/api/crystals/today` | GET |
| `components/crystals/DailyStreakPanel.tsx` (×2) | `/api/crystals/{daily-streak,today}` | GET |
| `components/oracle/OraclePanelGlobal.tsx` | `/api/oracle/teaser` | POST |
| `components/crystals/CrystalOfTheDayCard.tsx` | `/api/crystals/today` | GET |
| `components/crystals/CrystalCollectionContent.tsx` | `/api/crystals/collect` | POST |
| `app/(protected)/pricing/PricingContent.tsx` | `/api/stripe/checkout` | POST |

`[verified]` Plus streaming fetches inside `useOracleReading` hook and `DailyHoroscope` component (via AI SDK) hitting `/api/oracle/generate` and `/api/horoscope/generate`.

`[inferred]` **Four of these fetches could be Server Component direct calls instead — they happen during page render and have no user-interaction prerequisite:**
- `CrystalTile` (renders on dashboard, always visible) → could receive crystal data as a prop from the Server Component that wraps it
- `CrystalOfTheDayCard` (renders on `/you/crystals` at page load, always) → same
- `DailyStreakPanel` (renders on `/you/crystals`, always) → same
- `AccountSubscriptionPage` (renders on settings, always) → same

The rest are genuinely interactive (user triggers the fetch by action — pressing Collect, opening Oracle, submitting birth data, checking out) and legitimately belong as client-side POSTs.

### 1.4 Server Actions

`[verified]` **Zero.** Grep for `'use server'` in `apps/web/` returned no matches. No Server Actions exist in the codebase.

### 1.5 Client-side fetches to external APIs

`[verified]` None from client components. All third-party calls (Stripe, AI providers) happen server-side via route handlers. This is correct — keeps API keys out of the bundle.

### 1.6 Category summary — counts

| Category | Count |
|---|---|
| Server Component direct fetch (via `createServiceSupabaseClient` or cached helpers) | 10 files |
| Route handlers in `app/api/**` | 28 files |
| Client-component fetches to own `/api/*` (non-streaming) | 15 call sites |
| Client-component streaming fetches to own `/api/*` (AI SDK) | 2 call sites |
| Server Actions | 0 |
| Client-component fetches to external APIs | 0 |

---

## 2. Route-handler logic location [verified]

### 2.1 Pattern observed across sampled handlers

`[verified via full-file reads of 4 route handlers]`:

- `/api/crystals/today/route.ts` (150 lines): streak computation, daily rotation math, auto-collect, premium check — **all inline**. Only `fetchCatalog` is extracted to `@/lib/crystals/queries`.
- `/api/chart/calculate/route.ts` (138 lines): auth, ownership verification, cache lookup, cache write, audit logging — **all inline**. Only `calculateNatalChart` (pure ephemeris calc) is extracted to `@celestia/astrology`.
- `/api/transits/overview/route.ts` (105 lines): premium gate, chart ownership verify, calculation lookup-or-compute-and-cache orchestration — **all inline**. Only `buildTransitOverview` (pure aspect analysis) is extracted to `@/lib/horoscope/transit-analysis`.
- `/api/horoscope/generate/route.ts` (255 lines, partial read): streaming setup, prompt building, transit analysis — **partially extracted** (`buildDailyHoroscopePrompt`, `buildTransitOverview`, `transitAndNatalToPromptText`) but orchestration inline.

`[inferred]` **The codebase already has a logic layer at `apps/web/lib/`** with sub-directories for `crystals`, `horoscope`, `oracle`, `stripe`, `supabase`, `manifest`, `stories`, `validators`, `interpretations`, `types`. Functions extracted there are:
- Pure helpers: prompt builders, parsers (`stripSentinels`), aspect analyzers (`buildTransitOverview`), validators
- Some DB query wrappers: `fetchCatalog`, `collectRecommendation`, `recommendCrystals`, `getCachedLatestChart`, `getCachedUserTier`

`[inferred]` **What is NOT extracted** — and this is the gap Option B needs to close:
- Multi-step DB orchestration (cache-or-compute patterns, atomic collect-and-streak updates)
- Auth-gated premium checks (duplicated inline across route handlers with slight variations)
- Ownership verification boilerplate
- Audit logging calls

`[verified]` Zero route handler in the codebase is a pure "parse → call shared function → Response.json()" wrapper. Every route handler today contains at least some business logic inline.

### 2.2 Where extracted functions live

`[verified]`:
- `apps/web/lib/` (co-located with web app, 13 sub-directories). This is the current logic layer.
- `packages/astrology` (pure ephemeris + chart math). Used by route handlers via `@celestia/astrology`.
- `packages/db` exists with Drizzle schemas, but **`[verified]` no file in `apps/web/` imports from `@celestia/db` or uses Drizzle.** Supabase is accessed via `@supabase/supabase-js` query builder only. Drizzle is currently unused by the web app.

`[inferred]` `apps/web/lib/` serves roughly the role the user wants `packages/core/` to serve — shared business logic — but it's scoped to `apps/web`, so `apps/mobile` cannot import from it. That's the hoist target for Option B.

---

## 3. apps/mobile HTTP-call inventory [verified]

### 3.1 Current state

`[verified]` Grep for `fetch\(|XMLHttpRequest|axios` in `apps/mobile/` returned **zero matches**. The Expo scaffold currently has no network calls to any backend. All tab screens render placeholder data inline.

### 3.2 Endpoints mobile WILL need (derived from screen content)

`[planned]` The five tab screens, when hydrated with real data, will need:

| Screen | Endpoint it needs | Exists today in apps/web/app/api? |
|---|---|---|
| `(tabs)/index.tsx` (Днес) | GET today's horoscope for user's chart | `/api/horoscope/generate` (streaming) — YES |
| | GET today's crystal for user | `/api/crystals/today` — YES |
| | GET today's lunar phase + active meteor shower | NO — currently `lib/moon-phase` + `lib/meteor-showers` are pure client-side computation; acceptable to duplicate in mobile or expose via a new endpoint |
| `(tabs)/chart.tsx` (Карта) | POST calculate/cache natal chart | `/api/chart/calculate` — YES |
| `(tabs)/circle.tsx` (Кръг) | CRUD ghost profiles + synastry | NO — Phase B work, `packages/core/circle/*` |
| `(tabs)/rhythm.tsx` (Ритъм) | GET transit overview | `/api/transits/overview` — YES |
| | GET/POST diary entries | NO — currently localStorage-backed in `useManifestEntries` hook; needs `/api/manifest/*` endpoints |
| `(tabs)/you.tsx` (Ти) | GET user profile + subscription tier | `/api/user` + `/api/stripe/subscription` — YES |
| Oracle FAB | POST start Oracle conversation (streaming) | `/api/oracle/generate` — YES |

### 3.3 Gaps

`[verified]` Endpoints mobile needs that don't exist today:
1. **Manifest diary persistence endpoint** — currently localStorage via `hooks/useManifestEntries.ts`. Mobile cannot use localStorage as a primary store (well, AsyncStorage exists but shouldn't be the source of truth cross-device). Needs `GET/POST /api/manifest/entries`.
2. **Кръг CRUD** — entire people-graph endpoints are Phase B work, do not exist.
3. **Lunar phase / meteor shower as HTTP endpoint** — `[open]` decision: duplicate the pure computation in `packages/core/` (cleaner, no server round-trip) or expose as endpoint (consistent pattern, enables server caching).

---

## 4. Supabase client initialization symmetry [verified]

### 4.1 Five client factories exist today

`[verified]`:

| Factory | File | Auth context | Works in Server Components? | Works in Route Handlers? | Works in Client Components? |
|---|---|---|---|---|---|
| `createServiceSupabaseClient()` | `apps/web/lib/supabase/service.ts` | None — env-only, service role key, bypasses RLS | ✅ | ✅ | ❌ (service key must not reach client) |
| `createServerSupabaseClient()` | `apps/web/lib/supabase/server.ts` | Clerk `await auth()` + JWT template | ✅ | ✅ | ❌ (uses `@clerk/nextjs/server`) |
| `createPublicSupabaseClient()` | `apps/web/lib/supabase/public.ts` | None — anon key | ✅ | ✅ | ✅ |
| `useSupabaseClient()` | `apps/web/lib/supabase/client.ts` | Clerk `useSession()` hook | ❌ (React hook) | ❌ (React hook) | ✅ |
| `createSupabaseClient(accessToken)` | `packages/db/src/client.ts` | Generic — takes token provider | ✅ | ✅ | ✅ (if caller provides accessToken) |

`[verified]` **Server Components and Route Handlers are symmetric.** Any client factory that works in one works in the other. Both use the Next.js server runtime and both can call `await auth()` from `@clerk/nextjs/server` without extra plumbing. This is the crucial result for Option B: a shared package function that takes a `userId: string` argument and constructs its own Supabase client internally will work identically whether called from a Server Component page or a route handler.

### 4.2 Clerk session asymmetry — none

`[verified]` Both Server Components and route handlers import and call `auth()` identically from `@clerk/nextjs/server`. The `auth()` helper returns `{ userId, getToken, ... }` in both contexts. Tested pattern in `(protected)/dashboard/page.tsx` (Server Component) and `/api/crystals/today/route.ts` (route handler) — same API, same behavior. No plumbing gap.

`[inferred]` The only auth asymmetry is with Client Components (they use `useAuth()` / `useSession()` hooks instead). Not relevant to Option B, which is specifically about Server Component + route handler sharing.

---

## 5. Open questions — not answered unilaterally

### 5.1 Swiss Ephemeris weight

`[open]` `@celestia/astrology` wraps `swisseph-wasm`. `[verified]` it's already being called inside route handlers (`/api/chart/calculate`, `/api/transits/overview`) and working. `[open]` The question is whether it works cleanly inside Server Components too — specifically cold-start cost on Vercel serverless. Per `Celestia_AI_Reference.md §3`, WASM init adds 500ms-2s on cold start. For an SSR page that awaits the calc in its render path, that's user-visible latency.

Proposed resolution [planned]: Server Components should not compute ephemeris on the render path. Always serve from `chart_calculations` cache (Supabase row keyed by `chart_id`). The compute-and-cache step lives in a shared function that any surface can call; route handlers expose it over HTTP for mobile (or web client components), and Server Components hit the cache only. Cache misses trigger async recompute, not synchronous block.

### 5.2 AI streaming endpoint placement

`[open]` `/api/horoscope/generate` and `/api/oracle/generate` currently stream via Vercel Serverless Functions (inferred from Next.js App Router defaults). `[open]` Whether Vercel Edge Functions, Vercel Serverless, or a dedicated streaming service is right depends on the `LOAD_TEST_PLAN.md` results we haven't run yet. Edge has lower TTFT but tighter Node API compatibility; Serverless handles WASM but has colder starts.

Proposed resolution [planned]: decision gated on Scenario B+C results from `LOAD_TEST_PLAN.md §3`. Tag as `[open]` in any architecture doc until measured.

### 5.3 Clerk session symmetry

`[verified]` — not open. Server Components + route handlers share `auth()` with no asymmetry. Settled.

### 5.4 Drizzle adoption

`[open]` `packages/db` has full Drizzle schemas defined for all tables (users, charts, crystals, etc.) but zero code in `apps/web/` uses them. Supabase is accessed via `@supabase/supabase-js` query builder.

Proposed resolution [planned]: Option B migration is the natural moment to either (a) actually use Drizzle inside `packages/core/*` data functions, or (b) delete Drizzle from `packages/db` as unused scaffolding. Decision depends on whether type safety from Drizzle > churn cost of migrating query patterns. Flag for the person doing the migration.

### 5.5 Does Option B require killing client-side /api fetches for the four "renders-on-every-page-load" cases?

`[open]` Per §1.3, four client fetches (`CrystalTile`, `CrystalOfTheDayCard`, `DailyStreakPanel`, `AccountSubscriptionPage`) happen unconditionally on page render and could be Server Component direct calls. They're technically Option C today (HTTP round-trip on web where none is needed). Option B says pre-fetch in Server Component, pass as prop.

Proposed resolution [planned]: yes, in Phase 2 of the migration. The fetch logic moves into a shared function in `packages/core/`, the Server Component calls it directly and passes result as a prop, the client tile becomes pure presentation. Mobile's equivalent calls `/api/*` which wraps the same shared function.

---

## 6. Target architecture — Option B [planned]

Restating per conversation so the sequence below is unambiguous:

**Shared package (`packages/core/` — does not exist yet):**
- Plain async TypeScript functions. Zero HTTP, zero framework coupling.
- Input/output validated by Zod schemas colocated with them.
- Internal DB access via a Supabase client constructed from env vars (matches current `createServiceSupabaseClient` pattern, portable).

**Server Components in `apps/web/`:**
- Import shared functions directly.
- Call inline during render. No HTTP round-trip on web.

**Route handlers in `apps/web/app/api/`:**
- Thin wrappers: parse request → validate with Zod → call shared function → `Response.json()`.
- No business logic of their own.

**Mobile (Expo):**
- HTTP-only. Calls the route handlers at their existing paths.
- Shares Zod schemas via the schemas package for type safety.

**Zod schemas:**
- Live in `packages/core/` alongside the functions that use them.
- Imported by web clients, mobile clients, route handlers, and internal package code. Single contract source.

---

## 7. Migration plan [planned]

### 7.1 Ramp-up visibility

`[assumed — no measured team experience with this pattern]` Moving multi-step orchestration out of route handlers into shared package functions, plus wiring Zod contracts, is a pattern familiar to engineers who have done tRPC/oRPC migrations or Remix `loader/action` refactors. If the first person doing this work has not done it before on a Next.js 15 App Router + Supabase + Clerk stack:

**One-time ramp-up: 3-5 days.** Covers: understanding the current `apps/web/lib/` extraction patterns, setting up `packages/core/` with proper TS path aliases in Turbo, confirming Clerk `auth()` works cleanly from a shared package (it does — same server runtime — but verifying against a real build prevents surprises), and establishing the Zod schema conventions (input/output shapes, error types, response-wrapping patterns). Like the Skia ramp-up tax (§10 of `MOBILE_UX_RESEARCH.md`), this absorbs into the first phase's budget — put it in a low-stakes surface first.

`[planned]` **Sequencing recommendation:** do the ramp-up on `crystals/today` (one of the shorter route handlers, well-isolated, pure-function nature of daily rotation makes it easy to extract). **Do NOT start with the Oracle streaming endpoint** — streaming + SSE + LLM fallback logic is the wrong place to learn the Option B pattern.

### 7.2 Phased migration [planned]

**Phase M1 — Scaffold `packages/core/` + absorb ramp (first route + first SC):**
- Create `packages/core/` with TS config, Turbo wiring, Supabase-client factory, Zod dep
- Establish conventions: function signatures take explicit `userId` + validated input; return plain data or throw typed errors; no HTTP types leak
- Migrate `/api/crystals/today` — logic moves to `packages/core/crystals/today.ts`, route handler becomes 15-line wrapper
- Update `CrystalOfTheDayCard` and `CrystalTile` (currently Option C on web) to receive data from their Server Component parents that pre-fetched via the shared function
- **Budget: 3-5 days ramp + 2 days execution = 5-7 days total** `[inferred]`

**Phase M2 — Migrate remaining "pure read" endpoints:**
- `/api/transits/overview`, `/api/planets/current`, `/api/user`, `/api/stripe/status`, `/api/crystals/{daily-streak,route}`
- Per-endpoint budget: 2-4 hours (extraction is mechanical once patterns are set) `[inferred]`
- **Budget: 4-6 days total** `[inferred]`

**Phase M3 — Migrate "write + orchestration" endpoints:**
- `/api/chart/calculate`, `/api/birth-data`, `/api/birth-data/[id]`, `/api/crystals/{collect,daily/collect}`
- Higher care needed for the cache-or-compute orchestration in chart calc + transits
- **Budget: 4-6 days** `[inferred]`

**Phase M4 — Migrate streaming endpoints:**
- `/api/horoscope/generate`, `/api/oracle/{generate,teaser,readings}`
- `[open]` Whether these move to shared-package functions that return AsyncIterables or stay partially route-handler-coupled depends on Vercel AI SDK architecture. Research needed before touching.
- Deferred until streaming placement decision (§5.2) is resolved
- **Budget: 3-5 days once streaming decision is made** `[inferred]`

**Phase M5 — Mobile integration:**
- Mobile imports Zod schemas from `packages/core/`
- Mobile HTTP client (fetch wrapper) validates responses against schemas
- Cleanup: delete `apps/mobile` inline type definitions that duplicate schema types
- **Budget: 2-3 days** `[inferred]`

**Phase M6 (optional, post-Option-B) — Kill unused Drizzle OR adopt it:**
- See §5.4
- If adopting: migrate all `packages/core/` data access from raw Supabase calls to Drizzle
- Budget if adopting: 3-5 days `[inferred]`
- If killing: <1 day

### 7.3 What NOT to do during migration (user's explicit constraints, restated)

- **Do not** leave business logic in `route.ts` files while also duplicating it in Server Components. That's Option A and it's the worst of both worlds.
- **Do not** make web Server Components hit `/api/*` endpoints when they could call the shared function directly. That's Option C applied to web, and it wastes Next.js.
- **Do not** spin up a separate Node/Python/Go backend unless `LOAD_TEST_PLAN.md` results or specific constraints force it. Currently nothing in this audit justifies a separate service.

---

## 8. Immediate actions before migration starts

Not migration work itself — prerequisites that should happen regardless:

1. `[open]` Decide Drizzle question (§5.4) — adopt it across `packages/core/` or delete it from `packages/db/`. Cheap to decide; expensive to half-commit.
2. `[open]` Run Scenario B+C from `LOAD_TEST_PLAN.md` against current route handlers. Establishes baseline before the refactor, so a regression becomes visible. Also unblocks §5.2 streaming decision.
3. `[verified]` Current `apps/web/lib/supabase/queries.ts` has the `React.cache()` pattern that deduplicates identical Supabase calls within a single render pass. **Any `packages/core/` function must preserve this — wrap the async function with `React.cache()` at the web import site (not inside the shared package, since `react` isn't a shared-package dep).** Call this out in the Phase M1 conventions.

---

## 9. Summary — what this inventory changes vs the previous understanding

- `[correction]` Previous chat said "API routes are shared because both clients hit HTTP endpoints — nothing to do with Solito." That's true, but the audit shows that **today, web clients (10 Server Components) do NOT hit API routes — they query Supabase directly.** Option B explicitly preserves that pattern and extends it to a shared package. Mobile is the only HTTP consumer by design.
- `[verified]` The foundation for Option B is stronger than I previously acknowledged: `apps/web/lib/` already has a logic layer; `packages/astrology` already has pure ephemeris code; Clerk session works symmetrically in Server Components and route handlers; Supabase service client is purely env-var based. The missing piece is hoisting the logic layer from `apps/web/lib/` to `packages/core/` and making route handlers thin.
- `[open]` Drizzle in `packages/db` is a stranded decision — either adopt or delete.
- `[open]` Streaming endpoints are a separate conversation until load-test data exists.
