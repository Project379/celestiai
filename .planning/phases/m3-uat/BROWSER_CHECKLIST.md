# M3 Browser-only UAT Checklist

**Scope:** Things the programmatic harness at `apps/web/scripts/m3-uat-harness.mjs` cannot verify. A human drives these against `pnpm dev` in a real browser with their own Clerk session.

**Epistemic tags:** `[must-exercise]` blocks M3 continuation, `[should-exercise]` is recommended but non-blocking, `[deferred]` belongs to a later phase.

## What programmatic UAT covers vs what stays browser-only

The harness covers, on a real dev server + real Clerk backend + real Supabase:

- Every `/api/*` route handler's auth gate, error branches, and happy path against both free and premium tiers.
- `/api/oracle/generate` cap-gate: 3/day free, 429 CAP_REACHED on (cap+1)th attempt, premium bypass, cache-hit bypass, below-cap short-circuit.
- Middleware is signed-out-blocking every protected page route (dev-mode signal = `x-clerk-auth-status: signed-out` + `x-clerk-auth-reason: protect-rewrite`).
- Public pages (`/`, `/sign-in`, `/sign-up`, `/pricing`) stay public (not middleware-blocked).
- Per-run cleanup of all user-scoped writes (charts, chart_calculations, ai_readings, user_daily_crystals, user_crystals, crystal_recommendations) + tier reset to free.

The harness does NOT cover, and these items remain browser-only:

- **Rendering fidelity.** Whether pages actually render correctly in a browser — HTML layout, CSS, hydration, animations, component interactivity. The harness verifies HTTP contracts, not pixels.
- **Clerk's full sign-in round-trip.** In Clerk dev mode without a `__clerk_db_jwt` cookie, `auth.protect()` does a protect-rewrite rather than a real 3xx redirect with `Location: /sign-in?redirect_url=...`. The programmatic harness can confirm the middleware fires but cannot observe the `redirect_url` preservation. That round-trip must be exercised in a real browser — the Stripe `session_id` survival test in particular.
- **Multi-profile / multi-cookie scenarios.** Stale session cookies, cross-tab auth state, dev HMR serving stale SSR HTML across auth changes — all require real browser state that fetch can't simulate. See `.planning/research/AUTH_TESTING_NOTES.md`.
- **Server Component behavior under `React.cache`.** Harness hits route handlers, not Server Component render passes. Whether `getCrystalOfTheDay` dedupes correctly across multiple Server Components within a single render is framework behavior that requires a page load.
- **Streaming endpoints.** `/api/horoscope/generate` and `/api/oracle/generate` are streaming responses under AI SDK semantics. Harness probes the cap-gate branch (429 short-circuit before the stream) and the cache-hit branch (200 cached JSON before the stream); the actual stream body is never consumed.
- **Localization rendering.** Harness asserts BG strings appear in JSON bodies; whether those strings render correctly in the UI (font, direction, truncation, Zod-form error placement) is a visual check.

**Release gate.** Don't declare M3 UAT complete on a programmatic pass alone. Every `[must-exercise]` item in this document must be signed off in a browser session against `pnpm --filter @stellaeum/web dev` in incognito with DevTools "Disable cache" on (see `AUTH_TESTING_NOTES.md` for why).

---

## Feature reachability — per-feature obligation `[must-exercise]`

**Why this exists:** on 2026-08-28 the entire web push-notification feature was found offline — `PushNotificationBanner.tsx` was a complete, working component that had been unmounted from `/dashboard` as collateral damage in an aesthetic-pass commit (`d230a3f`). Every automated gate stayed green: the API routes, the service worker, the cron, the component's own unit test. Nothing verifies that a feature is *reachable*, only that its code is correct when invoked. See `VERIFICATION-SURFACE-GAPS.md` #12. A `knip` unimported-module CI gate (owned engineering item) will catch the fully-orphaned case; it will not catch a component that is imported but rendered behind a dead condition, or a screen with no navigation path. That residue is a manual obligation here.

**The obligation:** for every user-facing feature, a human confirms in a real browser session, starting from a signed-in user on the landing/dashboard with no prior knowledge of routes:

1. **Reach it.** There is a visible, discoverable path — a nav item, a button, a link, a settings row — that a user without the URL could follow to the feature. "You can get there by typing the route" does not count.
2. **Operate it.** The primary control renders and responds — the toggle flips, the form submits, the action completes — for the tier/permission state the feature is meant for, and degrades sanely for states it isn't (empty, denied, free-tier).
3. **Return to it.** If the feature has an on/off or opt-in/opt-out nature (notifications, subscriptions, connections), there is an in-app path back to change the decision. A one-time prompt with no settings equivalent fails this point.

Run this whenever a screen is added, a screen is restyled, or a navigation/layout component changes — restyle commits are the specific risk. Maintain the feature list alongside this checklist; a feature with no line here is an untested feature, not an absent concern.

---

## Stripe session_id survives the sign-in bounce `[must-exercise]`

**Why browser-only:** The fix in `531c9f8` routes `/subscription/success?session_id=…` through Clerk middleware so `auth.protect()` produces `/sign-in?redirect_url=<url-encoded original URL>` and the `session_id` query param round-trips through the sign-in flow. The programmatic harness can confirm the middleware fires (`x-clerk-auth-status: signed-out`) but **cannot observe the `redirect_url` value** because Clerk dev mode protect-rewrites rather than redirecting when no `__clerk_db_jwt` cookie exists. Verifying the round-trip requires a real browser that Clerk has issued a dev-browser cookie to.

**Steps:**
1. Sign out. Open incognito, load `http://localhost:3000/sign-in` once so Clerk issues a `__clerk_db_jwt` dev browser cookie. Sign out again or open a second incognito window without signing in.
2. In DevTools Network tab with "Preserve log" and "Disable cache" on, navigate to `http://localhost:3000/subscription/success?session_id=cs_test_uat_probe_12345`.
3. **Verify:** the navigation bounces to `http://localhost:3000/sign-in?redirect_url=%2Fsubscription%2Fsuccess%3Fsession_id%3Dcs_test_uat_probe_12345` (URL-encoded `session_id` intact in the `redirect_url` param).
4. **Verify:** after signing in, you land back on `/subscription/success?session_id=cs_test_uat_probe_12345` with the `session_id` intact (visible in the URL bar or Network tab).
5. Regression signal: if the bounce is to bare `/sign-in` with no `redirect_url`, OR if `redirect_url` is missing the `session_id` encoding, a matcher change has re-dropped `/subscription/success` and the payment-activation data loss is back.

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
