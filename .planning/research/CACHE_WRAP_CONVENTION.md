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

`[planned]` **Two layers: package.json exclusion + ESLint `no-restricted-imports` covering all framework-coupling patterns, not just React.**

### 6.1 package.json layer

`packages/core/package.json` must not list any of the following in `dependencies` or `peerDependencies`:
- `react`, `react-dom`, `@types/react*`
- `next`, `@types/next*`
- `expo`, `expo-*`, `react-native`, `react-native-*`, `@react-native/*`
- `nativewind`, `react-native-css-interop`
- `@clerk/nextjs`, `@clerk/nextjs-server`, `@clerk/clerk-expo`, `@clerk/clerk-react`

`[inferred]` This is the cheap-but-coarse layer. Prevents whole classes of framework-coupled code from installing. Does not prevent transitive deps or type-only imports of things that are already in the root `node_modules` via pnpm hoisting. The ESLint layer below closes the gap.

### 6.2 ESLint layer — framework-coupling denylist

`[planned]` Add to `apps/mobile/eslint.config.js` / `apps/web/eslint.config.mjs` model a new override in the workspace-root (or `packages/core/eslint.config.mjs` when the package is scaffolded) with `no-restricted-imports` `patterns`:

```js
// packages/core/eslint.config.mjs
export default [
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          // --- React (render-tree / hook / Suspense coupling) ---
          { group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
            message: 'packages/core/ is framework-agnostic. See CACHE_WRAP_CONVENTION.md — React.cache wraps at the web call site.' },

          // --- Next.js (server-runtime / navigation / image / link) ---
          { group: ['next/*', 'next'],
            message: 'Next.js imports live in apps/web/. Core takes plain inputs (userId, request body) and returns plain data.' },

          // --- Clerk (framework-specific auth adapters) ---
          { group: ['@clerk/nextjs', '@clerk/nextjs/**', '@clerk/nextjs-server', '@clerk/clerk-expo', '@clerk/clerk-react', '@clerk/clerk-react/**'],
            message: 'Core takes userId: string | null as an argument. Clerk auth extraction happens at the web/mobile call site.' },

          // --- Expo / React Native (mobile-runtime) ---
          { group: ['expo', 'expo-*', 'expo-*/**', '@expo/**'],
            message: 'Expo imports live in apps/mobile/. Core is framework-agnostic.' },
          { group: ['react-native', 'react-native-*', 'react-native-*/**', '@react-native/**'],
            message: 'React Native imports live in apps/mobile/. Core is framework-agnostic.' },

          // --- Styling (platform-coupled) ---
          { group: ['nativewind', 'nativewind/*', 'react-native-css-interop', 'react-native-css-interop/*'],
            message: 'Styling is UI concern. Core returns data, not styled components.' },
        ],
      }],
    },
  },
]
```

**Adding a new denied family is a one-line append** to the `patterns` array — matches the structure the user asked for.

### 6.3 When a denied pattern shows up in a legitimate use case

`[planned]` If a future engineer genuinely needs to import something from a denied group (edge case: schema validation library that happens to share a namespace), the correct move is:
1. Write down why the rule doesn't apply in this case
2. Add an inline `// eslint-disable-next-line no-restricted-imports` with a comment linking back to that reasoning
3. Open an issue to reconsider the denylist, don't amend it quietly

If enough legitimate exceptions accumulate, the rule itself is wrong and should be refined. Until then, per-use overrides force the reasoning to be surfaced in the diff.

### 6.4 CI integration

`[planned]` The existing `pnpm lint` task (via turbo) runs ESLint across all workspaces. Once `packages/core/eslint.config.mjs` exists with the denylist, `pnpm lint` fails on any forbidden import in the package. No new CI step needed — it falls out of the existing lint pipeline.

### 6.5 Documentation

`[planned]` Link this doc from `packages/core/README.md` once the package is scaffolded in Phase M1. The Phase M1 PR description should mention the denylist explicitly so reviewers know what they're approving.

---

## 7. Clerk asymmetry — resolved

Previously flagged as `[open]`. `[verified]` Clerk's server-side `auth()` is a Next.js-specific import that pulls in `next/headers`. It has the same structural problem as `react/cache`: works only inside Next.js server runtime. The §6.2 denylist covers `@clerk/nextjs`, `@clerk/nextjs/**`, `@clerk/nextjs-server`, `@clerk/clerk-expo`, and `@clerk/clerk-react` — so core cannot import from any Clerk surface.

`[planned]` The contract: `packages/core/` functions take `userId: string | null` as an explicit argument. Clerk auth extraction happens at the web call site (`const { userId } = await auth()` in a Server Component or route handler) or at the mobile call site (`useAuth()` in a React Native component, passed to the HTTP client). Core never imports Clerk.
