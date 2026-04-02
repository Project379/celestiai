# Celestia AI v1.0 — Developer Feature Spec

**Date:** 2026-04-02
**Audience:** Next.js developer joining to build, refactor, and ship v1.0
**Baseline:** v0.1 web MVP — 8 phases complete, builds clean, zero type errors

---

## How to Read This Document

Each section covers a feature area. For every item you'll find:
- **What exists** — file paths, current behavior, known limitations
- **What to build** — concrete implementation guidance with file pointers
- **Gotchas** — things that will bite you if you don't know about them

Status tags: `DONE` (shipped), `BUILD` (new), `UPGRADE` (exists but needs work), `DEFERRED` (post v1.0).

---

## 0. Project Orientation

### Stack & Versions

| Layer | Tech | Version | Notes |
|-------|------|---------|-------|
| Monorepo | Turborepo | 2.8.1 | pnpm 9.15.4 workspaces |
| Framework | Next.js | 15.2.4 | App Router, Turbopack dev |
| React | React | 19.x | Server Components + Client |
| Auth | Clerk | 6.36.9 | `@clerk/nextjs`, bgBG localization |
| DB | Supabase + Drizzle ORM | 2.49.1 / 0.40.0 | PostgreSQL, RLS, 8 migrations |
| Styling | Tailwind 3.4 + NativeWind 4 | — | CSS variables, cosmic theme |
| AI | Vercel AI SDK | 6.0.86 | `@ai-sdk/google` (Gemini 2.5 Flash) |
| Payments | Stripe | 20.3.1 | API v2026-01-28.clover |
| Astrology | sweph | 2.10.3-4 | Native Node.js Swiss Ephemeris bindings |
| Validation | Zod | 4.3.6 | v4 syntax (`{ error }` not `{ message }`) |
| TypeScript | | 5.7.3 | Strict mode |

### Monorepo Layout

```
/
├── apps/
│   └── web/                    # Next.js 15 app (THE app today)
│       ├── app/
│       │   ├── (auth)/         # Sign-in/sign-up (Clerk catch-all routes)
│       │   ├── (protected)/    # Dashboard, chart, settings, pricing, birth-data
│       │   ├── api/            # 21 API routes (see inventory below)
│       │   ├── privacy/        # Public GDPR privacy policy page
│       │   └── page.tsx        # Landing page
│       ├── components/         # 36 components (auth, birth-data, chart, dashboard,
│       │                       #   horoscope, oracle, landing, upgrade, StarCanvas)
│       ├── hooks/              # useChart, useD3, useDailyHoroscope, useOracleReading
│       ├── lib/                # audit, horoscope/, interpretations/, oracle/,
│       │                       #   stripe/, supabase/, validators/
│       └── public/             # sw.js (service worker for push)
│
├── packages/
│   ├── astrology/              # @celestia/astrology — Swiss Ephemeris wrapper
│   │   └── src/
│   │       ├── calculator.ts   # calculateNatalChart() — 11 bodies, Placidus, topocentric Moon
│   │       ├── transit.ts      # calculateDailyTransits(), calculateTransitAspects()
│   │       ├── constants.ts    # PLANETS_BG, ZODIAC_SIGNS_BG, PLANET_IDS, ASPECT_DEFINITIONS
│   │       ├── types.ts        # Planet, ZodiacSign, ChartData, PlanetPosition, etc.
│   │       ├── client.ts       # Browser-safe re-export (no sweph import)
│   │       └── utils/          # aspects.ts, julian-day.ts, zodiac.ts
│   │
│   ├── db/                     # @celestia/db — Drizzle schema + Supabase client
│   │   ├── src/schema/         # 11 schema files (users, charts, cities, ai-readings, etc.)
│   │   ├── src/seed/           # Bulgarian cities seeder (203 settlements)
│   │   ├── drizzle/            # 8 SQL migrations (0000–0007)
│   │   └── drizzle.config.ts
│   │
│   ├── ui/                     # @celestia/ui — GlassCard, Text primitives
│   └── config/                 # Shared TypeScript base config
```

### API Route Inventory

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/birth-data` | GET, POST | Yes | List / create birth data |
| `/api/birth-data/[id]` | GET, PATCH | Yes | Read / update single chart |
| `/api/chart/calculate` | POST | Yes | Swiss Ephemeris calculation + cache |
| `/api/cities/search` | GET | Yes | Bulgarian city autocomplete |
| `/api/horoscope/generate` | POST | Yes | Daily horoscope (streaming) |
| `/api/oracle/generate` | POST | Yes | AI Oracle reading (streaming) |
| `/api/oracle/readings` | GET | Yes | Fetch cached reading |
| `/api/oracle/teaser` | GET | Yes | Blurred preview for locked topics |
| `/api/stripe/checkout` | POST | Yes | Create Stripe checkout session |
| `/api/stripe/cancel` | POST, DELETE | Yes | Cancel / reactivate subscription |
| `/api/stripe/portal` | POST | Yes | Stripe Customer Portal URL |
| `/api/stripe/status` | GET | Yes | Current subscription tier |
| `/api/webhooks/stripe` | POST | No | Stripe webhook (signature verified) |
| `/api/push/subscribe` | POST | Yes | Web push subscription |
| `/api/push/unsubscribe` | POST | Yes | Remove push subscription |
| `/api/gdpr/export` | GET | Yes | Download all user data as JSON |
| `/api/gdpr/delete-account` | POST, DELETE | Yes | Soft-delete / cancel deletion |
| `/api/cron/daily-horoscope` | GET | CRON_SECRET | Batch push notifications |
| `/api/cron/cleanup-deleted-accounts` | GET | CRON_SECRET | Hard-delete after 30-day grace |
| `/api/user` | GET | Yes | User row from `users` table |

### Database Tables (11)

| Table | RLS | Access Pattern |
|-------|-----|----------------|
| `users` | No | Service role only |
| `charts` | Yes | JWT `auth.jwt()->>'sub'` |
| `cities` | No | Read-only, public |
| `chart_calculations` | No | Service role (internal cache) |
| `ai_readings` | No | Service role only |
| `daily_transits` | No | Service role (global cache) |
| `daily_horoscopes` | No | Service role (per-chart cache) |
| `push_subscriptions` | Yes | JWT `auth.jwt()->>'sub'` |
| `audit_logs` | No | Service role, fire-and-forget |
| `processed_webhook_events` | No | Service role (idempotency) |

### Environment Variables

See `apps/web/.env.example`. You need: Clerk keys, Supabase URL + anon key, DATABASE_URL, Stripe keys (secret, webhook secret, price IDs), NEXT_PUBLIC_APP_URL. VAPID keys for push are generated at runtime via `web-push`.

### Build & Run

```bash
pnpm install                 # Install (pnpm 9.15.4 required)
pnpm dev                     # Next.js dev with Turbopack
pnpm build                   # Production build (~36s)
pnpm typecheck               # TypeScript check (all 4 packages)
cd packages/db && pnpm db:generate   # Generate Drizzle migration
cd packages/db && pnpm db:push       # Push schema to Supabase
cd packages/db && pnpm seed          # Seed Bulgarian cities
```

---

## 1. Testing & Observability (BUILD — Do This First)

There are **zero tests** in the project. `npm test` will fail. This is the #1 gap.

### 1.1 Unit Tests — Vitest

**Install:**
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom -w --filter @celestia/web
pnpm add -D vitest -w --filter @celestia/astrology
```

**What to test first (highest value):**
1. `packages/astrology/src/calculator.ts` — verify planet positions against known ephemeris data
2. `packages/astrology/src/transit.ts` — verify transit aspect detection
3. `packages/astrology/src/utils/aspects.ts` — applying/separating logic
4. `apps/web/lib/validators/birth-data.ts` — Zod schema edge cases
5. `apps/web/lib/stripe/subscription.ts` — webhook handler logic
6. `apps/web/lib/oracle/planet-parser.ts` — sentinel parsing

**Add to `turbo.json`:**
```json
"test": { "dependsOn": ["^build"] }
```

**Add to root `package.json`:**
```json
"test": "turbo run test"
```

### 1.2 E2E Tests — Playwright

33 UAT scenarios are already written at `.planning/phases/full-project-UAT.md`. Convert these to Playwright tests.

**Install:**
```bash
pnpm add -D @playwright/test -w --filter @celestia/web
```

**Priority flows:** Landing → Auth → Birth data wizard → Chart view → Oracle reading → Stripe checkout → Settings.

### 1.3 Error Monitoring — Sentry

**Install:**
```bash
pnpm add @sentry/nextjs -w --filter @celestia/web
npx @sentry/wizard@latest -i nextjs
```

**Wire into:** `next.config.js` (use `withSentryConfig` wrapper), `app/global-error.tsx`, `middleware.ts`.

### 1.4 CI/CD — GitHub Actions

Create `.github/workflows/ci.yml`:
- On PR: `pnpm install` → `pnpm typecheck` → `pnpm test` → `pnpm build`
- On main merge: deploy to Vercel

---

## 2. i18n / Localization (BUILD)

### Current State

Every string is hardcoded in Bulgarian across ~36 components, ~13 lib files, and 2 prompt files. There is no i18n framework.

### Implementation Plan

**Recommended: `next-intl`** (best Next.js App Router integration).

```bash
pnpm add next-intl -w --filter @celestia/web
```

**Steps:**
1. Create `messages/bg.json` and `messages/en.json` with all UI strings
2. Configure `next-intl` in `app/layout.tsx` with `NextIntlClientProvider`
3. Add `[locale]` segment to App Router or use middleware-based locale detection
4. Replace hardcoded strings in components with `useTranslations()` hook
5. Add `locale` column to `users` table (Drizzle migration)
6. Persist user preference via settings page

**Files with the most hardcoded Bulgarian text (refactor these first):**

| File | String Count (approx) |
|------|----------------------|
| `components/birth-data/BirthDataWizard.tsx` | 30+ |
| `components/birth-data/DateStep.tsx`, `TimeStep.tsx`, `LocationStep.tsx`, `ConfirmStep.tsx` | 15+ each |
| `components/landing/FeaturesSection.tsx`, `PricingSection.tsx`, `AboutSection.tsx` | 20+ each |
| `app/(protected)/pricing/PricingContent.tsx` | 25+ |
| `app/(protected)/settings/SettingsContent.tsx` | 30+ |
| `components/dashboard/DashboardContent.tsx` | 15+ |
| `components/auth/LogoutConfirmDialog.tsx`, `SessionExpiryModal.tsx` | 10+ each |
| `components/horoscope/DailyHoroscope.tsx`, `PushNotificationBanner.tsx` | 15+ each |

**AI prompts need parallel English versions:**
- `lib/oracle/prompts.ts` — `buildSystemPrompt()` currently returns English instructions with "generate in Bulgarian" directive. For EN users, change the language directive.
- `lib/horoscope/prompts.ts` — same pattern.
- `packages/astrology/src/constants.ts` — `PLANETS_BG` and `ZODIAC_SIGNS_BG` need English equivalents (or just use the English keys directly).

**Clerk already supports locale switching:**
```tsx
<ClerkProvider localization={locale === 'bg' ? bgBG : enUS}>
```

**Gotcha:** The `@celestia/ui` `Text` component accepts a `variant` prop but has no locale awareness. Strings flow through from the parent component — no changes needed to the primitives themselves.

---

## 3. Astrology Engine Upgrades

### 3.1 Multiple House Systems (BUILD — `ASTRO-01`)

**Current:** `HOUSE_SYSTEM_PLACIDUS = 'P'` hardcoded in `packages/astrology/src/constants.ts:130` and used in `calculator.ts:137`.

**Implementation:**
1. Add constants: `HOUSE_SYSTEM_KOCH = 'K'`, `HOUSE_SYSTEM_WHOLE_SIGN = 'W'` in `constants.ts`
2. Add `houseSystem?: 'P' | 'K' | 'W'` to `ChartInput` in `types.ts`
3. Pass it through in `calculator.ts:137` (currently hardcoded `HOUSE_SYSTEM_PLACIDUS`)
4. Add `preferred_house_system` column to `users` table schema
5. Surface in settings UI

**Gotcha:** `sweph.houses()` accepts the house system as the 4th arg — already parameterized, just pass it through.

### 3.2 Synastry / Compatibility Charts (BUILD — `ASTRO-02`)

**Current:** `calculateNatalChart()` calculates one chart. No comparison logic.

**Implementation:**
1. New function `calculateSynastryAspects(chart1: ChartData, chart2: ChartData)` in `packages/astrology/src/synastry.ts`
2. Cross-reference all planet pairs between two charts using `calculateAspects()` logic from `utils/aspects.ts`
3. New API route: `POST /api/chart/synastry` — accepts two chart IDs
4. New `synastry_readings` table or extend `ai_readings` with `partner_chart_id`
5. New prompt in `lib/oracle/prompts.ts` with `synastry` topic
6. New UI: profile selector + synastry result view

**Depends on:** Multiple profiles (`ASTRO-03`).

### 3.3 Multiple Profiles (BUILD — `ASTRO-03`)

**Current:** The `charts` table already supports multiple rows per `user_id`. The UI assumes one chart.

**Implementation:**
1. Add a `profiles` concept — a named chart (e.g., "Partner", "Child") with a `label` field
2. `charts` table already has `name` column — this may suffice
3. Update `apps/web/app/(protected)/dashboard/page.tsx` to list multiple charts
4. Add profile switcher component
5. Update `useChart` hook to accept a `chartId` parameter

**Gotcha:** `chart_calculations` table has a unique constraint on `chart_id`. Each profile's chart gets its own cached calculation — this already works.

---

## 4. AI Oracle Enhancements

### 4.1 Current Architecture

- **Streaming:** `POST /api/oracle/generate` uses `streamText()` from AI SDK v6 with `toTextStreamResponse()`
- **Client:** `useCompletion` hook with `streamProtocol: 'text'` in `hooks/useOracleReading.ts`
- **Cache:** `ai_readings` table with unique constraint on `(chart_id, topic)`, 7-day expiry
- **Tier gate:** `subscription_tier` checked in route handler; free users get `general` only
- **Prompts:** `lib/oracle/prompts.ts` exports `buildSystemPrompt(topic)`, `lib/oracle/chart-to-prompt.ts` serializes chart data

### 4.2 New Reading Types

**Weekly Horoscope (`AI-09`):**
1. New prompt builder in `lib/horoscope/prompts.ts` — weekly variant
2. New API route: `POST /api/horoscope/weekly`
3. New cache table column or separate `weekly_horoscopes` table
4. Calculate transit aspects for 7-day window (extend `transit.ts`)

**Synastry Reading (`AI-07`):**
1. New topic in `ReadingTopic`: `'synastry'`
2. New prompt suffix in `TOPIC_SUFFIXES` focusing on inter-chart aspects
3. New serializer: `synastryToPromptText(chart1, chart2, crossAspects)`
4. Cache key: `(chart_id, partner_chart_id, 'synastry')`

**Model Fallback (`AI-14`):**
1. Install `@ai-sdk/openai` as fallback provider
2. Wrap `streamText()` in try/catch — on Gemini failure, retry with GPT-5
3. Log which model served each reading in `ai_readings.metadata`

### 4.3 Reading Archive (`AI-12`)

**Current:** `ai_readings` expires after 7 days. Old readings are lost.

**Implementation:**
1. Remove or extend the 7-day expiry window
2. Add `GET /api/oracle/history?chartId=xxx` route
3. New UI component: `ReadingHistory.tsx` showing past readings by date
4. Paginate with cursor-based pagination (use `created_at`)

---

## 5. iOS App (BUILD)

### 5.1 Scaffold

```bash
npx create-expo-app apps/mobile --template blank-typescript
pnpm add solito -w --filter @celestia/mobile
pnpm add @clerk/clerk-expo -w --filter @celestia/mobile
pnpm add react-native-purchases -w --filter @celestia/mobile  # RevenueCat
pnpm add @shopify/react-native-skia -w --filter @celestia/mobile
```

Add `@celestia/mobile` to root `pnpm-workspace.yaml`.

### 5.2 Code Sharing Strategy

| Layer | Shared? | How |
|-------|---------|-----|
| Types & constants | Yes | Import from `@celestia/astrology/client` |
| Validation schemas | Yes | Import from `apps/web/lib/validators/` → move to `packages/shared/` |
| API calls | Yes | Extract fetch logic from hooks into shared service layer |
| UI components | No | Web uses Tailwind/D3, mobile uses NativeWind/Skia |
| Navigation | No | Web uses Next.js router, mobile uses Expo Router |
| Auth | Partial | Both use Clerk but different SDKs |

**Key decision:** The calculation engine (`@celestia/astrology`) uses `sweph` native Node.js bindings. It **cannot** run on mobile. All calculations go through `POST /api/chart/calculate`. This is already the pattern — no change needed.

### 5.3 RevenueCat + Stripe Sync

RevenueCat handles IAP on iOS. Stripe handles web. Both need to update the same `users.subscription_tier` column.

1. RevenueCat webhook → new API route `POST /api/webhooks/revenuecat`
2. Webhook updates `users.subscription_tier` (same as Stripe webhook does)
3. RevenueCat SDK on mobile checks entitlements client-side
4. Web continues using `GET /api/stripe/status`

**Gotcha:** Apple requires apps with subscriptions to use IAP. You cannot use Stripe directly in the iOS app. RevenueCat abstracts this.

### 5.4 Skia Chart Rendering

The web uses D3.js SVG (`components/chart/NatalWheel.tsx`, ~350 lines). The mobile app needs a React Native Skia equivalent.

- Reuse the same calculation data (`ChartData` type from `@celestia/astrology/client`)
- Build a new `NatalWheelSkia.tsx` using `@shopify/react-native-skia` Canvas, Path, Circle primitives
- The layout logic (planet positions on circle, zodiac segment angles) can be extracted from `NatalWheel.tsx` into a shared `chartLayout.ts` utility

---

## 6. Subscription & Payments

### 6.1 Pricing Change (UPGRADE — `PAY-07`)

**Current:** `€9.99/mo` hardcoded in `PricingContent.tsx:155` and `PricingSection.tsx:22-23`.

**Competitor research says:** `€6.99/mo` is optimal for Bulgarian market (cheaper than Netflix, 0.51% of average salary). See `.planning/research/COMPETITOR_ANALYSIS.md:69-77`.

**Implementation:** Update price display in UI + create new Stripe Price object. The actual price lives in Stripe — the env var `STRIPE_PRICE_MONTHLY` points to the price ID.

### 6.2 Free Trial (BUILD — `PAY-08`)

**Implementation:**
1. Stripe Checkout supports `subscription_data.trial_period_days: 7`
2. Add to `apps/web/app/api/stripe/checkout/route.ts`
3. Update `PricingContent.tsx` to show "7 дни безплатен пробен период"
4. Handle `customer.subscription.trial_will_end` webhook event

### 6.3 Transactional Emails (BUILD — `PAY-11`)

**Options:** Resend, SendGrid, or Clerk's built-in email templates.

**Emails needed:**
- Welcome after signup
- Subscription confirmed
- Trial ending (3 days before)
- Subscription cancelled (confirmation)
- Account deletion scheduled
- Account deletion completed

---

## 7. Engagement Features

### 7.1 Journal (BUILD — `ENGAGE-01`)

**Database:** The original PRD schema already mentions `journal_entries` table. It was never created.

**Schema (new Drizzle migration):**
```typescript
export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  date: date('date').notNull(),
  mood: text('mood'),           // e.g., 'great', 'good', 'neutral', 'difficult'
  content: text('content'),      // free-form text
  transitSnapshot: jsonb('transit_snapshot'), // day's transit aspects for correlation
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})
```

**API:** `POST /api/journal`, `GET /api/journal?date=YYYY-MM-DD`, `PATCH /api/journal/[id]`

**UI:** Journal card on dashboard below horoscope. Simple text area + mood selector. Show transit aspects alongside entry for correlation.

### 7.2 Notification Preferences (BUILD — `ENGAGE-03`)

**Current:** All-or-nothing push subscription via `PushNotificationBanner.tsx`.

**Add:**
- `notification_preferences` JSONB column on `users` table
- Options: `{ daily_horoscope: boolean, transit_alerts: boolean, weekly_digest: boolean }`
- Settings UI in `/settings`
- Cron job at `apps/web/app/api/cron/daily-horoscope/route.ts` checks preferences before sending

---

## 8. Security & Compliance

### 8.1 Rate Limiting (UPGRADE — `SEC-27`)

**Current:** Only `POST /api/oracle/generate` has a 24h regeneration limit (via `ai_readings` table check).

**Implementation:** Use `@upstash/ratelimit` with Vercel KV, or implement IP-based rate limiting in middleware.

**Apply to:** All `POST` API routes. Suggested limits:
- Auth-protected routes: 60 req/min per user
- Oracle/horoscope generation: 10 req/min per user
- Public routes: 30 req/min per IP

### 8.2 Cookie Consent (BUILD — `SEC-23`)

**Required for:** GDPR compliance (Clerk sets cookies, analytics will too).

**Implementation:** Cookie consent banner component in `app/layout.tsx`. Store consent in localStorage + `users.cookie_consent` column. Block analytics scripts until consent given.

### 8.3 Social Login (BUILD — `SEC-22`)

**Implementation:** Clerk Dashboard → configure Google and Apple OAuth providers. No code changes needed — Clerk handles it. The `(auth)` route group with catch-all pages already renders the Clerk component.

---

## 9. Refactoring Recommendations

These are not features — they're structural improvements to make v1.0 development faster.

### 9.1 Extract Shared Validation to Package

**Current:** `apps/web/lib/validators/birth-data.ts` and `apps/web/lib/validators/chart.ts` are web-only.

**Move to:** `packages/shared/validators/` so iOS app can reuse.

### 9.2 Extract API Fetch Logic from Hooks

**Current:** `hooks/useChart.ts`, `hooks/useOracleReading.ts`, `hooks/useDailyHoroscope.ts` each contain `fetch()` calls inline.

**Refactor:** Create `lib/api/` client module with typed functions:
```typescript
// lib/api/chart.ts
export async function calculateChart(chartId: string): Promise<ChartData> { ... }
export async function fetchSynastry(chartId1: string, chartId2: string): Promise<SynastryData> { ... }
```

This makes it trivial for the mobile app to share API call logic.

### 9.3 Consolidate Planet Color Maps

Planet colors are duplicated across 3 files:
- `components/chart/NatalWheel.tsx:22-34` — hex values
- `components/chart/PlanetDetail.tsx:98-111` — Tailwind border/bg classes
- `components/horoscope/HoroscopeStream.tsx:10-21` — Tailwind text classes

**Refactor:** Single `lib/theme/planet-colors.ts` exporting all three formats from one source of truth.

### 9.4 Server/Client Component Boundary

The project has a consistent pattern of server page → client content component (e.g., `pricing/page.tsx` server-fetches data, passes to `PricingContent.tsx` client component). Keep this pattern for new pages.

**Files following this pattern:**
- `pricing/page.tsx` → `PricingContent.tsx`
- `settings/page.tsx` → `SettingsContent.tsx`
- `settings/privacy/page.tsx` → `PrivacySettingsContent.tsx`
- `subscription/success/page.tsx` → `SuccessContent.tsx`
- `dashboard/page.tsx` → `DashboardContent.tsx`

### 9.5 Supabase Client Factory

There are 4 Supabase client factories in `lib/supabase/`:
- `server.ts` — server component client (reads Clerk JWT)
- `client.ts` — browser client (reads Clerk JWT)
- `service.ts` — service role client (admin access, no RLS)
- `public.ts` — anonymous client (no auth, used for public queries like city search)

**Rule:** Tables without RLS (users, ai_readings, chart_calculations, daily_*, audit_logs) use `service.ts`. Tables with RLS (charts, push_subscriptions) use `server.ts` or `client.ts`. Do not mix these up.

---

## 10. Known Technical Debt

| Issue | Location | Impact |
|-------|----------|--------|
| Zero tests | Everywhere | High — regressions invisible |
| No error monitoring | No Sentry/similar | High — production errors silent |
| `logAuditEvent()` is async fire-and-forget, never awaited | `lib/audit.ts` | Low — audit failures silently lost |
| Supabase free tier auto-pauses after 14 days | Infra | Medium — migration `0004_parched_lizard.sql` needs manual re-apply |
| No `.env.example` for `packages/db` | `packages/db/` | Low — `DATABASE_URL` needed for migrations |
| `PLANET_DESCRIPTIONS` missing North Node entry for `client.ts` | `packages/astrology/src/client.ts` | None — client.ts re-exports from constants, which has it |
| NativeWind 4 + Tailwind 3.4 (not 4) | `tailwind.config.ts` | None for web — but Tailwind 4 migration needed for future NativeWind updates |
| React 19 but no use of `use()` hook or Server Actions | Various | None — standard pattern, no urgency to adopt |

---

## 11. Priority Execution Order

If you're building v1.0 sequentially, this is the recommended order:

### Wave 1: Foundation (do before any features)
1. **Vitest** — add test framework, write tests for astrology engine + validators
2. **Sentry** — error monitoring
3. **CI/CD** — GitHub Actions pipeline
4. **Playwright** — convert UAT scenarios to E2E tests

### Wave 2: Localization (unlocks international reach)
5. **next-intl** — i18n framework
6. **String extraction** — BG → message files
7. **EN translations** — all UI + prompts
8. **Language switcher** — settings + persistence

### Wave 3: Core Features (drives premium conversion)
9. **Multiple profiles** — DB + UI (prerequisite for synastry)
10. **Synastry engine** — `packages/astrology/src/synastry.ts`
11. **Synastry reading** — AI prompt + API route + UI
12. **Multiple house systems** — constants + calculator + settings
13. **Reading archive** — extend ai_readings + history UI
14. **Journal** — schema + API + dashboard card

### Wave 4: Payments & Growth
15. **Pricing adjustment** — €9.99 → €6.99 (Stripe + UI)
16. **Free trial** — 7-day trial via Stripe
17. **Cookie consent** — GDPR banner
18. **Analytics** — PostHog/Mixpanel (no PII)
19. **Social login** — Google + Apple via Clerk
20. **Transactional emails** — Resend or Clerk

### Wave 5: iOS App
21. **Expo scaffold** — `apps/mobile/` with Solito
22. **Clerk native** — auth + biometrics
23. **RevenueCat** — IAP + entitlement sync
24. **Skia chart** — natal wheel reimplementation
25. **APNs** — push notifications
26. **TestFlight** — beta distribution

### Wave 6: Polish
27. **Bottom nav** — mobile web + iOS
28. **Onboarding flow** — first-time user experience
29. **Rate limiting** — all API routes
30. **Weekly horoscope** — premium feature
31. **Notification preferences** — granular control
32. **Security audit** — before public launch

---

## 12. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| iOS TestFlight beta users | 500+ | TestFlight analytics |
| DAU (web + mobile) | 5,000+ | PostHog/Mixpanel |
| Premium conversion | 5%+ | Stripe + RevenueCat dashboards |
| Day-7 retention | 40%+ | Analytics cohort |
| Day-30 retention | 20%+ | Analytics cohort |
| App Store rating | 4.5+ | App Store Connect |
| Push opt-in rate | 60%+ | `push_subscriptions` count / total users |
| MRR | €3,500+ | Stripe + RevenueCat |

---

*Created: 2026-04-02*
*Source: PRD v1.0, v0.1 codebase audit (build verified clean), REQUIREMENTS.md, PROJECT.md, FEATURES.md, COMPETITOR_ANALYSIS.md*
