# M3 Browser-only UAT Checklist

**Scope:** Things the programmatic harness at `apps/web/scripts/m3-uat-harness.mjs` cannot verify. A human drives these against `pnpm dev` in a real browser with their own Clerk session.

**Epistemic tags:** `[must-exercise]` blocks M3 continuation, `[should-exercise]` is recommended but non-blocking, `[deferred]` belongs to a later phase.

---

## Stripe Checkout fast-path (`activatePremiumFromSession`) `[must-exercise]`

**Why browser-only:** `apps/web/lib/stripe/activate-from-session.ts` only runs when `/api/stripe/status?session_id=cs_xxx` is called with a real Stripe Checkout session id, which requires the full Checkout redirect flow. Test-mode credentials alone are not enough — a session object has to exist.

**Steps:**
1. Sign in as a free-tier user.
2. Click the upgrade CTA that lands on `apps/web/app/(protected)/pricing/PricingContent.tsx`.
3. Complete Stripe's test-mode Checkout with card `4242 4242 4242 4242`, any future expiry, any CVC.
4. Stripe redirects to `/subscription/success?session_id=cs_test_…`. That page polls `/api/stripe/status` with the session id.
5. **Verify:** `users.subscription_tier` flips to `premium` within the first 1–2 polls (fast-path) rather than waiting for the webhook. Check by opening Supabase or by seeing premium UI unlock.
6. **Verify:** if the webhook also fires later it is idempotent — no duplicate upsert errors in server logs.

---

## Bulgarian error text rendering in UI `[must-exercise]`

The programmatic harness asserts the *JSON* bodies contain the Bulgarian strings, not that they render correctly in the page.

**Steps:**
1. Open `/birth-data/new` without filling the form → submit → verify Zod field errors render in Bulgarian (name, date, city).
2. Edit an existing chart and submit an invalid time value → verify the PATCH flow surfaces the translated error.
3. Trigger a `/api/chart/calculate` failure manually (e.g., edit a chart's latitude to a non-finite value via DevTools → save → calculate) → verify the 500-path Bulgarian message "Грешка при изчисление. Моля, проверете данните." reaches the user-visible surface, not just the console.
4. Sign out and poke a protected `/chart` or `/dashboard` URL directly → verify the middleware redirect preserves the locale and the Clerk-side error copy is Bulgarian.

---

## Crystal picker visual agreement `[must-exercise]`

The programmatic harness asserts `today.crystal.id === daily-collect.crystal.id`. A human needs to confirm the **rendered** stone on `/you/crystals` matches the one the manual Collect button inserts, **on a day the RESULTS.json picker-divergence section flagged as multi-match**.

**Steps:**
1. Read `RESULTS.json` `.multiMatch[]` — if the current lunar phase appears there with `agrees: false`, that is the day to test on.
2. If the current phase is not multi-match, pick a future date from the divergence list and either (a) wait for it or (b) temporarily stub `getLunarPhase()` in dev.
3. Load `/you/crystals` as premium. Note the stone displayed in `CrystalOfTheDayCard`.
4. Click "Collect" / "Приемам камъка" on the daily stone.
5. **Verify:** the `user_daily_crystals` row that was inserted references the same `crystal_id` the card displayed. Post-M3, the unified picker should make this trivially true on every day; the check exists to catch a regression where the web call site's `React.cache` dedupe disagrees with the route handler's unwrapped call.

---

## Server Component `React.cache` paths `[should-exercise]`

The programmatic harness hits `/api/crystals/today` (route handler, unwrapped core call). The web surface actually uses the `React.cache`-wrapped version at `apps/web/lib/crystals/today.ts` from the `dashboard/page.tsx` and `you/crystals/page.tsx` Server Components.

**Steps:**
1. Load `/dashboard` as premium → view source / open Network → confirm no `/api/crystals/today` XHR is made; the crystal is pre-rendered into the HTML via the Server Component path.
2. Same for `/you/crystals`.
3. Within a single page render, if both `DashboardContent` and a deeper tile also consume `getCrystalOfTheDay`, confirm only one Supabase query fires per request (observable via Supabase logs or a temporary `console.log` inside the core function during manual testing). Request-scoped dedupe is the claim; verify it holds.

---

## Dashboard + /you/crystals happy paths `[should-exercise]`

Post-M3, the Server Components that call `getCrystalOfTheDay` directly are untouched but depend on the same moved helpers. Smoke-test:
1. `/dashboard` loads without 500s, shows today's crystal tile.
2. `/you/crystals` loads, shows `CrystalOfTheDayCard`, `DailyStreakPanel`, and the collection list.
3. `/rhythm` loads (uses `getTransitsOverview` indirectly via the route).
4. `/chart` loads, renders the natal wheel for the default chart (uses `calculateChartForUser` indirectly).

---

## Things explicitly `[deferred]` to later phases

- **Mobile integration of any endpoint** — M5 work. The harness does not verify the Expo surface can call these endpoints; that gate is M5's responsibility.
- **Streaming endpoints** (`/api/horoscope/generate`, `/api/oracle/*`) — M4 scope; not extracted yet; not part of this UAT.
- **GDPR export / delete** — not in M3 scope.
- **Push subscribe/unsubscribe** — not in M3 scope.

---

## What "clean" means for this checklist

Every `[must-exercise]` item either passes or has a fix commit on `mobile-parallel-test` **before** M3 continues to the remaining endpoints. `[should-exercise]` items: surface findings in the next UAT's RESULTS.md, do not block M3 continuation.

Checklist is complete when a human can sign it off in a follow-up commit message or PR review on `mobile-parallel-test`.
