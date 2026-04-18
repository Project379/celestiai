# Cache-Wrap Convention

**Written:** 2026-04-18
**Status:** Convention, not yet enforced in code (prerequisite to Option-B migration per `DATA_FETCHING_INVENTORY.md §8.3`)
**Epistemic tags:** `[verified]` / `[inferred]` / `[planned]` / `[assumed]` / `[open]`.

---

## 1. The rule

`[planned]` **`packages/core/` cannot depend on `react`. Framework-specific caching lives at the call site.**

Concretely: if a shared-package data function benefits from request-scoped deduplication on the web, the web caller wraps it with `React.cache()` at the import boundary. The shared package itself exposes plain async functions with no caching infrastructure.

---

## 2. Why the constraint exists

`[verified]` React's `cache()` primitive (imported as `import { cache } from 'react'`) only works in React Server Components. It's request-scoped; it deduplicates calls made within a single render pass. `[inferred]` It has no meaning and no effect outside a React render tree. Importing `react` into `packages/core/` would:

- `[verified]` Force every consumer of `packages/core/` to also have `react` available. That breaks mobile's non-React-server callers (cron scripts, background jobs, tests), and it couples a package that shouldn't know about React to React's version semantics.
- `[inferred]` Bloat the dependency surface of a package whose whole point is framework-agnostic business logic. If `packages/core/` depends on `react`, it is no longer framework-agnostic; it's a web-SSR-only package with a misleading name.
- `[inferred]` Create surprise failure modes when the package is imported from places `react` isn't available (Expo's Metro bundler has a different React version than Next.js, and Node cron scripts don't have React at all).

`[verified]` The existing precedent matches this rule. `apps/web/lib/supabase/queries.ts` imports `cache` from `react` and wraps `createServiceSupabaseClient()` calls at the wrap site, not inside the Supabase client factory. See `getCachedUserTier` and `getCachedLatestChart` — both wrap pure async functions.

---

## 3. The pattern — concrete example

`[planned]` Take `crystals/today` as the first Phase-M1 extraction:

**Shared package (`packages/core/crystals/today.ts`):**
```ts
import type { Database } from '@celestia/db'
import { createSupabaseClient } from '@celestia/db'
import { getLunarPhase } from './lunar-phase'  // also core

export async function getCrystalOfTheDay(userId: string | null) {
  const supabase = createSupabaseClient(/* service-role accessor */)
  // ... pure async function, no React, no HTTP, no framework coupling
  return { crystal, lunarPhase, streak, isPremium, collectedToday }
}
```

**Web call-site wrapper (`apps/web/lib/crystals/today.ts`):**
```ts
import { cache } from 'react'
import { getCrystalOfTheDay as coreGetCrystalOfTheDay } from '@celestia/core/crystals/today'

// Request-scoped dedupe — multiple Server Components (layout + page + tile)
// that ask for today's crystal in the same render pass get one fetch.
export const getCrystalOfTheDay = cache(coreGetCrystalOfTheDay)
```

**Server Component consumer (`apps/web/app/(protected)/dashboard/page.tsx`):**
```ts
import { getCrystalOfTheDay } from '@/lib/crystals/today'
// Gets the cached wrapper. React.cache dedupes within the render pass.
const crystal = await getCrystalOfTheDay(userId)
```

**Route handler consumer (`apps/web/app/api/crystals/today/route.ts`):**
```ts
import { getCrystalOfTheDay } from '@celestia/core/crystals/today'
// Route handlers import the unwrapped core function directly — no render pass,
// no benefit from React.cache. Each request is its own async call.

export async function GET() {
  const { userId } = await auth()
  const data = await getCrystalOfTheDay(userId)
  return Response.json(data)
}
```

**Mobile consumer (`apps/mobile/...`):**
```ts
// Mobile calls the route handler over HTTP. Never imports from @celestia/core
// directly for client-side data (doesn't have DB credentials). If caching is
// wanted on mobile, it's explicit — AsyncStorage, React Query, whatever is
// chosen — but that's a mobile-specific layer, not cache() from react.
const res = await fetch(`${API_BASE}/api/crystals/today`)
```

---

## 4. Downstream consequences

`[planned]` Future "I want to cache this" requests get framework-specific caching at the call site. The shared package never acquires a caching layer of its own. Specifically:

### 4.1 For web Server Components
- `React.cache()` wraps at the web lib import. Request-scoped dedupe only. Not persistent.
- If persistent caching is needed on the web (across requests), use Next.js's `unstable_cache()` from `next/cache` — also wrapped at the web call site, not inside `packages/core/`.
- Don't reach for `packages/core/` to "just add caching" — that's out of scope for the shared package.

### 4.2 For route handlers
- No React.cache — route handlers are not in a render tree. They call core functions directly.
- If a route handler wants response caching, use HTTP Cache-Control headers (already done in `transits/overview/route.ts` with `Cache-Control: private, max-age=900, stale-while-revalidate=600`). Supabase CDN / Vercel edge handle the rest.
- If a route handler wants to memoize across invocations within the same serverless function instance, use a module-level `Map` — explicitly, in the route file, with full awareness that each cold start starts empty.

### 4.3 For mobile
- No React.cache — React Native doesn't have Server Components. Mobile uses React Query / TanStack Query / plain useState patterns for client-side dedupe and caching. Those are mobile-specific and never part of `packages/core/`.
- If offline-first behavior is wanted (store results in AsyncStorage), that wrapper lives in `apps/mobile/` — it calls the HTTP route, then caches the result. Core knows nothing about it.

### 4.4 For background jobs and tests
- No caching. Cron handlers (`/api/cron/*`) and test harnesses call core functions fresh every time. If a cron job is called twice and does the same expensive work twice, that's a feature, not a bug — idempotence is the goal.
- If background-job throttling is needed, it's implemented in the cron handler, not in core.

### 4.5 For the `packages/core/` functions themselves
- They should be **idempotent and cheap to call multiple times**. Two identical calls within a short window should not produce destructive side effects (no "first call charges $1, second call charges another $1").
- They should **accept all auth context as arguments**, not reach for it from a global. That makes them testable and portable.
- They should **not retain state across invocations**. Module-level variables are allowed only for pure configuration (e.g., lunar phase constants), not for state that varies by caller.

---

## 5. What this convention explicitly prevents

Three anti-patterns that get tempting when someone's mid-migration:

### 5.1 "Let me just add React.cache inside the shared package"
`[planned]` Prevented: `packages/core/` has `react` excluded from its dependencies. Attempting to import `cache` from `react` inside the package fails at build time. CI should fail on this.

### 5.2 "Let me add an `lru-cache` inside the shared package for persistent caching"
`[planned]` Prevented by convention, not code. `packages/core/` functions are stateless-by-rule. If someone reaches for `lru-cache`, they're solving the wrong problem — the right answer is either (a) Supabase is fast enough, (b) add caching at the call site (Next.js `unstable_cache`, HTTP Cache-Control, React Query on mobile), or (c) if the DB read is genuinely too slow, fix the DB query or add a materialized view in migrations.

### 5.3 "Let me make the function return a React Suspense-compatible thing"
`[planned]` Prevented: `packages/core/` functions return plain data or throw typed errors. They don't return promises that double as Suspense boundaries (`use()` consumption, Server Actions with transitions) — those are framework concerns. The web layer wraps the plain promise with Suspense at the call site if needed.

---

## 6. Enforcement

`[planned]`:

- `packages/core/package.json` must not list `react`, `react-dom`, `next`, or any `@types/react*` in `dependencies` or `peerDependencies`. Only `devDependencies` for type-stripping during build, if at all.
- A CI check (or Turbo task) that grep-rejects `from 'react'` in `packages/core/**/*.ts`. Simple to add.
- This doc linked from `packages/core/README.md` once the package is scaffolded in Phase M1.

`[open]` Open question: should the same rule apply to `@clerk/nextjs/server`? `[verified]` Clerk's server-side `auth()` is a Next.js-specific import that pulls in `next/headers`. It has the same problem as `react/cache`: it only works inside Next.js server runtime. The clean pattern is: `packages/core/` functions take `userId: string | null` as an argument, and Clerk auth extraction happens at the web call site (Server Component or route handler). Mobile extracts `userId` from its Clerk Expo SDK separately. Core never imports Clerk. Call this out explicitly in the Phase-M1 conventions and in `packages/core/README.md`.
