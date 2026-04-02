# Celestia AI — v1.0 Feature Roadmap

**Last updated:** 2026-04-02
**Audience:** Developers, product managers, stakeholders
**Status:** v0.1 web MVP complete (8 phases shipped). This document defines the full v1.0 scope.

---

## At a Glance

Celestia AI is a premium astrology app for the Bulgarian market. Users enter their birth data, get a precise natal chart calculated by Swiss Ephemeris, and receive AI-powered personalized readings. The business model is freemium: free users get a basic personality reading; premium subscribers (€6.99/mo) unlock love, career, health readings, synastry, and more.

**What's built:** A fully functional web app with auth, birth charts, AI Oracle, daily horoscopes, Stripe payments, and GDPR compliance.

**What's next:** Testing infrastructure, English localization, iOS app, and premium features that drive retention and conversion.

---

## The Market Opportunity

| Fact | Number |
|------|--------|
| Global astrology app market (2026) | €5.7B–€6.3B |
| Growth rate | ~20–25% CAGR |
| Bulgarian addressable audience (18–44) | ~2.5–3M people |
| Bulgarian internet penetration | 92.8% |
| Smartphone share of e-commerce | 55%+ |
| €6.99/mo as % of average BG salary | 0.51% (cheaper than Netflix) |

---

## Feature Map

Each feature is tagged with who cares about it:

- **USER** = directly visible to the end user
- **INFRA** = developer/operational foundation
- **GROWTH** = drives acquisition, retention, or conversion
- **COMPLIANCE** = legal or regulatory requirement

Status tags: `SHIPPED` `TO BUILD` `UPGRADE`

---

## Part 1: What's Already Shipped (v0.1)

These features are live and working. No action needed unless marked UPGRADE.

### 1.1 Landing Page `SHIPPED` `USER` `GROWTH`

**What it does:** First thing visitors see. Animated starfield background, feature showcase with icons, pricing comparison (free vs premium), and clear call-to-action buttons leading to registration.

**Why it matters:** This is the conversion funnel entry point. Every user's journey starts here.

**Tech:** Next.js server component, Tailwind CSS, Lucide icons. Route: `/` (`app/page.tsx`).

---

### 1.2 Authentication `SHIPPED` `USER` `COMPLIANCE`

**What it does:** Users register with email/password, verify via email, log in, reset forgotten passwords, and log out. Sessions persist across browser refreshes. All protected pages redirect unauthenticated users to login.

**Why it matters:** No auth = no personalization = no product.

**Tech:** Clerk (`@clerk/nextjs`), Bulgarian localization (`bgBG`), `clerkMiddleware` protecting all `/dashboard`, `/chart`, `/settings` routes. Session tokens are HttpOnly, Secure, SameSite cookies.

---

### 1.3 Birth Data Collection `SHIPPED` `USER`

**What it does:** A step-by-step wizard where users enter their birth date, birth time (with an "I don't know" option), and birth location. The location step has a search-as-you-type field covering 203 Bulgarian cities and villages, each mapped to precise latitude/longitude coordinates.

**Why it matters:** Birth data is the input to everything — charts, readings, horoscopes. Without accurate data, the product has no value.

**Tech:** Multi-step wizard component, Zod v4 validation, city search API (`/api/cities/search`), Supabase `charts` table with RLS, encrypted at rest.

---

### 1.4 Natal Chart Calculation `SHIPPED` `USER`

**What it does:** Given birth data, the system calculates a complete natal chart: positions of 11 celestial bodies (Sun, Moon, Mercury through Pluto, plus North Node), 12 house cusps (Placidus system), and all major aspects between planets. The Moon position is topocentric (corrected for Earth's surface, not center), and the North Node uses True Node (not Mean).

**Why it matters:** This is the scientific backbone. Accuracy here earns trust from serious astrology users who will cross-check against professional software.

**Tech:** `sweph` native Node.js bindings (Swiss Ephemeris), runs server-side only via `POST /api/chart/calculate`. Results cached in `chart_calculations` table to avoid recalculation.

---

### 1.5 Interactive Chart Visualization `SHIPPED` `USER`

**What it does:** A circular natal wheel rendered with D3.js showing all 12 zodiac segments, planet glyphs positioned at their calculated degrees, aspect lines connecting planets, and house cusp markers. Users can click/tap any planet to see a detailed interpretation card. The "Big Three" (Sun sign, Moon sign, Rising sign) are displayed prominently above the wheel.

**Why it matters:** The chart is the product's visual centerpiece. It's what users screenshot and share. An interactive chart feels premium; a static image feels like a free website from 2005.

**Tech:** D3.js + SVG in `components/chart/NatalWheel.tsx` (~350 lines). Planet detail popups in `PlanetDetail.tsx`. Responsive across desktop and mobile.

---

### 1.6 AI Oracle Readings `SHIPPED` `USER` `GROWTH`

**What it does:** Users request an AI-generated reading about their chart. The AI (Google Gemini 2.5 Flash) receives the user's full chart data — every planet position, house placement, and aspect — and generates a personalized, multi-paragraph interpretation. It cites specific degree positions (e.g., "Your Sun at 14°32' Leo in the 5th house..."). Readings stream in real-time so users see text appearing word by word.

**Four reading topics:**
| Topic | Access |
|-------|--------|
| General personality | Free |
| Love & relationships | Premium only |
| Career & purpose | Premium only |
| Health & wellness | Premium only |

Free users attempting a premium topic see a blurred teaser with an upgrade prompt.

**Why it matters:** This is the core monetization lever. The general reading proves value; locked topics drive upgrades. Personalization (citing exact degrees) differentiates from generic horoscope apps.

**Tech:** Vercel AI SDK v6 `streamText()`, `@ai-sdk/google` (Gemini 2.5 Flash), cached in `ai_readings` table with 7-day expiry. Routes: `/api/oracle/generate`, `/api/oracle/readings`, `/api/oracle/teaser`.

---

### 1.7 Daily Horoscope `SHIPPED` `USER` `GROWTH`

**What it does:** Each day, users see a personalized horoscope based on how today's planetary transits interact with their natal chart. Not generic sun-sign content — the AI analyzes specific transit-to-natal aspects (e.g., "Transit Mars conjunct your natal Venus") and generates guidance. Users can navigate back to view yesterday's horoscope.

**Why it matters:** This is the daily engagement hook. Users who check their horoscope every morning become habitual users. Habitual users convert to premium.

**Tech:** Transit calculation via `packages/astrology/src/transit.ts`, cached in `daily_transits` table. Horoscope generation via streaming AI, cached in `daily_horoscopes` table. Dashboard integration with yesterday navigation.

---

### 1.8 Push Notifications `SHIPPED` `USER` `GROWTH`

**What it does:** Users can opt in to receive a morning push notification with a preview of their daily horoscope. Delivered via Web Push (service worker). An opt-in banner appears on the dashboard.

**Why it matters:** Push notifications are the #1 retention mechanism in mobile apps. Even on web, they bring users back daily. 60%+ opt-in rate is the target.

**Tech:** Web Push API, VAPID keys, service worker at `public/sw.js`. Routes: `/api/push/subscribe`, `/api/push/unsubscribe`. Cron: `/api/cron/daily-horoscope` for batch delivery.

---

### 1.9 Stripe Payments `SHIPPED` `USER` `GROWTH`

**What it does:** Users can purchase a premium subscription via Stripe Checkout. After payment, premium features unlock immediately. Users can view their subscription status, cancel (with end-of-period access), reactivate, or manage billing through Stripe's Customer Portal. Webhooks handle the full lifecycle: checkout completed, invoice paid, subscription updated, subscription deleted.

**Why it matters:** This is how the business makes money.

**Tech:** Stripe SDK v20, routes for checkout/cancel/portal/status/webhook. Webhook uses `processed_webhook_events` table for idempotency. `users.subscription_tier` column controls access.

---

### 1.10 GDPR & Privacy `SHIPPED` `COMPLIANCE`

**What it does:**
- **Privacy policy page** accessible from landing footer and settings
- **Data export** — users can download all their data as JSON (`/api/gdpr/export`)
- **Account deletion** — soft-delete with 30-day grace period, then hard-delete via cron (`/api/cron/cleanup-deleted-accounts`)
- **Audit logging** — all sensitive operations (login, data access, deletion requests) are logged to `audit_logs` table

**Why it matters:** GDPR compliance is a legal requirement for operating in the EU. It's also a trust differentiator — competitors like Co-Star have faced criticism for opaque data practices.

**Tech:** Privacy page at `/privacy`, settings integration, fire-and-forget audit logger in `lib/audit.ts`.

---

### 1.11 Security Foundation `SHIPPED` `INFRA` `COMPLIANCE`

**What it does:**
- CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy headers on every response
- Row Level Security (RLS) on `charts` and `push_subscriptions` tables
- Clerk JWT claims used for RLS policies
- Zod validation on all user input
- Birth data encrypted at rest (Supabase database-level encryption)
- All API routes validate authentication before processing

**Why it matters:** A security breach in an astrology app that stores birth dates and locations would be a PR disaster and a legal liability.

---

## Part 2: What to Build Next (v1.0)

Organized into 6 waves. Each wave builds on the previous one. Within a wave, features can be developed in parallel.

---

### Wave 1: Quality Foundation `INFRA`

**Business case:** Zero tests and zero error monitoring means bugs ship silently and regressions are invisible. This wave prevents the "everything worked until it didn't" moment that kills user trust.

---

#### 2.1 Unit Testing (Vitest) `TO BUILD` `INFRA`

**What it does:** Automated tests that verify individual functions work correctly. Priority targets: astrology calculation accuracy (planet positions against known ephemeris data), transit aspect detection, Zod validation edge cases, Stripe webhook handler logic.

**Why it matters for business:** Every code change today is a coin flip. Tests catch bugs before users do. They also let new developers contribute without fear of breaking things.

**Why it matters for devs:** The astrology engine is the hardest thing to verify manually. A test that checks "Sun at 14°32' Leo for this birth data" catches regressions that no amount of manual QA would find.

**Tech:** Vitest, `@testing-library/react`, `@testing-library/jest-dom`. Add `"test"` script to Turborepo pipeline.

**Effort:** Medium. ~40 high-value tests across astrology engine + validators + webhook logic.

---

#### 2.2 End-to-End Testing (Playwright) `TO BUILD` `INFRA`

**What it does:** Automated browser tests that simulate real user flows: landing page → sign up → enter birth data → see chart → request reading → subscribe → manage subscription. 33 test scenarios are already written in `.planning/phases/full-project-UAT.md` — they need to be converted to executable Playwright tests.

**Why it matters for business:** These tests prove the entire user journey works. Before every deployment, the system automatically verifies that signups, payments, and core features still function.

**Why it matters for devs:** Manual QA of 33 scenarios takes hours. Playwright runs them in minutes.

**Tech:** `@playwright/test`. Priority flows: auth → birth data wizard → chart → oracle → Stripe checkout → settings.

**Effort:** Medium-high. 33 scenarios, some requiring Stripe test mode setup.

---

#### 2.3 Error Monitoring (Sentry) `TO BUILD` `INFRA`

**What it does:** Captures JavaScript errors, unhandled promise rejections, and API failures in production. Sends alerts with full stack traces, user context, and replay data.

**Why it matters for business:** Right now, if something breaks in production, nobody knows until a user complains (or leaves). Sentry turns silent failures into actionable alerts.

**Why it matters for devs:** Stack traces with source maps, breadcrumbs showing what the user did before the error, and performance monitoring for slow API routes.

**Tech:** `@sentry/nextjs`, wired into `next.config.js`, `global-error.tsx`, and `middleware.ts`.

**Effort:** Low. Half a day to integrate.

---

#### 2.4 CI/CD Pipeline (GitHub Actions) `TO BUILD` `INFRA`

**What it does:** On every pull request: install dependencies → type-check → run tests → build. On merge to main: deploy to Vercel. Failed checks block the merge.

**Why it matters for business:** No more "it works on my machine" deployments. Every change is verified before it reaches users.

**Why it matters for devs:** Fast feedback loop. Know within minutes if your PR is safe to merge.

**Tech:** `.github/workflows/ci.yml`, Vercel deployment integration.

**Effort:** Low. A few hours.

---

### Wave 2: Localization `USER` `GROWTH`

**Business case:** The app currently only works in Bulgarian. Adding English opens the product to 1.5B+ English speakers worldwide and the Bulgarian diaspora (~1.5M people abroad). The astrology app market is global — being Bulgarian-only limits growth to a 3M addressable audience.

---

#### 3.1 i18n Framework (next-intl) `TO BUILD` `INFRA`

**What it does:** Replaces every hardcoded Bulgarian string in the app (~200+ strings across 36 components and 13 lib files) with translation keys that load from JSON message files. The app detects the user's preferred language and renders accordingly.

**Why it matters:** This is the foundation. No i18n framework = no English version = no international growth.

**Tech:** `next-intl` with `NextIntlClientProvider` in `app/layout.tsx`. Message files: `messages/bg.json`, `messages/en.json`. Clerk already supports locale switching via `<ClerkProvider localization={...}>`.

**Effort:** High. Touching 36+ components to extract strings. Mechanical but time-consuming.

---

#### 3.2 English Translations `TO BUILD` `USER` `GROWTH`

**What it does:** Complete English version of all UI text, AI prompt instructions (so readings generate in English for EN users), and planet/zodiac names (currently `PLANETS_BG` and `ZODIAC_SIGNS_BG` in `packages/astrology/src/constants.ts`).

**Why it matters:** English is the unlock for international reach. The Bulgarian diaspora in the UK, US, and Germany is a natural first audience for English mode.

**Effort:** Medium. Translation + prompt adaptation + testing.

---

#### 3.3 Language Switcher `TO BUILD` `USER`

**What it does:** A toggle in the settings page where users choose Bulgarian or English. The preference is saved to their user profile and persists across sessions. New users default to Bulgarian.

**Why it matters:** Users need a way to actually change languages. Also: a `locale` column on the `users` table enables future features like locale-aware push notifications.

**Tech:** New `locale` column in `users` table (Drizzle migration). Settings UI update. Middleware-based locale detection for first-time visitors.

**Effort:** Low.

---

### Wave 3: Core Premium Features `USER` `GROWTH`

**Business case:** These features directly drive premium conversion and retention. Synastry (compatibility) is the #1 most-requested feature in astrology apps. Multiple profiles enable family/friend usage. Journal creates daily habit formation. Every feature here gives users a reason to keep subscribing month after month.

---

#### 4.1 Multiple Profiles `TO BUILD` `USER`

**What it does:** Users can save multiple birth charts — their own, their partner's, their child's, a friend's. Each profile has a name and its own natal chart. The dashboard shows a profile switcher. All existing features (chart view, oracle readings, horoscope) work with the selected profile.

**Why it matters for business:** More profiles = more engagement. Users who add their partner's chart are more likely to try synastry (premium). Users who add their child's chart check two horoscopes daily instead of one.

**Why it matters for devs:** The `charts` table already supports multiple rows per `user_id` and has a `name` column. The main work is UI: profile switcher, updating `useChart` hook to accept a `chartId` parameter, and listing multiple charts on the dashboard.

**Effort:** Medium. DB already supports it; it's mostly UI work.

---

#### 4.2 Synastry / Compatibility Charts `TO BUILD` `USER` `GROWTH`

**What it does:** Users select two profiles and get a compatibility analysis. The system calculates cross-chart aspects (how Person A's planets interact with Person B's planets) and generates an AI-powered relationship reading.

**Why it matters for business:** Compatibility is the #1 viral feature in astrology apps. Users share results with partners and friends, driving organic growth. It's a premium-only feature that justifies the subscription.

**Why it matters for devs:** New `calculateSynastryAspects()` function in `packages/astrology/src/synastry.ts`. New API route: `POST /api/chart/synastry`. New prompt in `lib/oracle/prompts.ts` for synastry topic. New UI for profile selection + result display.

**Depends on:** Multiple profiles (4.1).

**Effort:** High. New calculation logic, new prompt engineering, new UI flow.

---

#### 4.3 Multiple House Systems `TO BUILD` `USER`

**What it does:** Users can choose between three house systems for their natal chart: Placidus (default, most common in Bulgaria), Koch, or Whole Sign. The preference is saved per user and applied to all their chart calculations.

**Why it matters for business:** Serious astrology users have strong preferences about house systems. Supporting multiple systems signals professional quality and attracts the "power user" segment who are most likely to pay for premium.

**Why it matters for devs:** Minimal effort — `sweph.houses()` already accepts the house system as a parameter. Add constants for Koch (`'K'`) and Whole Sign (`'W'`), add `houseSystem` to `ChartInput` type, pass it through in `calculator.ts:137`, add `preferred_house_system` to users table, surface in settings.

**Effort:** Low. A day of work.

---

#### 4.4 Reading Archive `TO BUILD` `USER`

**What it does:** Past AI Oracle readings are preserved instead of expiring after 7 days. Users can browse their reading history sorted by date, seeing how their interpretations have evolved over time.

**Why it matters for business:** Users who can look back at past readings feel the product has accumulated personal value. This increases switching costs — leaving means losing their history.

**Why it matters for devs:** Remove or extend the 7-day expiry on `ai_readings`. Add `GET /api/oracle/history?chartId=xxx` with cursor-based pagination. New `ReadingHistory.tsx` component.

**Effort:** Low-medium.

---

#### 4.5 Journal `TO BUILD` `USER` `GROWTH`

**What it does:** A daily journal entry on the dashboard where users can log their mood (great / good / neutral / difficult) and write free-form reflections. Each entry is automatically tagged with that day's transit aspects, allowing users to see correlations between planetary movements and their emotional state over time.

**Why it matters for business:** Journal = daily habit = daily active user. The mood-transit correlation creates an "aha moment" that deepens belief in the product and drives retention. CHANI and Soulloop both offer this as a premium feature.

**Why it matters for devs:** New `journal_entries` table (Drizzle migration) with `mood`, `content`, and `transit_snapshot` columns. API: `POST /api/journal`, `GET /api/journal?date=YYYY-MM-DD`, `PATCH /api/journal/[id]`. Dashboard card below the horoscope.

**Effort:** Medium.

---

### Wave 4: Payments & Growth `GROWTH`

**Business case:** Optimizing pricing, adding a free trial, and reducing friction at every step of the funnel. The difference between 3% and 7% conversion rate at scale is the difference between a hobby project and a viable business.

---

#### 5.1 Price Adjustment: €9.99 → €6.99/mo `UPGRADE` `GROWTH`

**What it does:** Reduces the monthly subscription price from €9.99 to €6.99.

**Why it matters:** At €6.99, Celestia is cheaper than Netflix (€7.99) in Bulgaria. Research shows this price point is 0.51% of the average Bulgarian salary — frictionless for the target demographic. The 30% price reduction should increase conversion enough to more than offset the per-user revenue drop.

**Tech:** Create new Stripe Price object, update `STRIPE_PRICE_MONTHLY` env var, update display text in `PricingContent.tsx` and `PricingSection.tsx`.

**Effort:** Very low. An hour.

---

#### 5.2 7-Day Free Trial `TO BUILD` `GROWTH`

**What it does:** New users get 7 days of full premium access before being charged. If they don't cancel during the trial, the subscription starts automatically.

**Why it matters:** Trials let users experience the full product before committing money. Users who try synastry or love readings during the trial are far more likely to convert. Industry standard — most competitor apps offer 3–7 day trials.

**Tech:** Add `subscription_data.trial_period_days: 7` to Stripe Checkout session in `/api/stripe/checkout/route.ts`. Handle `customer.subscription.trial_will_end` webhook event. Update pricing UI to show "7 days free" messaging.

**Effort:** Low.

---

#### 5.3 Cookie Consent Banner `TO BUILD` `COMPLIANCE`

**What it does:** A banner on first visit asking users to accept or customize cookie preferences. Required because Clerk sets cookies and future analytics will too. Consent is stored in localStorage and a `cookie_consent` column on the users table. Analytics scripts are blocked until consent is given.

**Why it matters:** GDPR requires explicit consent for non-essential cookies. Not having this is a compliance risk.

**Effort:** Low.

---

#### 5.4 Analytics `TO BUILD` `INFRA` `GROWTH`

**What it does:** Product analytics (PostHog or Mixpanel) tracking key events: sign-up, birth data completion, first chart view, first reading, upgrade click, checkout completion, daily return. No PII is sent to the analytics provider.

**Why it matters:** Without analytics, every product decision is a guess. Which feature drives upgrades? Where do users drop off? What's the Day-7 retention rate? Analytics answers these questions.

**Effort:** Low-medium. Event instrumentation across key user flows.

---

#### 5.5 Social Login (Google + Apple) `TO BUILD` `USER` `GROWTH`

**What it does:** Users can register and log in with their Google or Apple account instead of email/password.

**Why it matters:** Social login reduces registration friction by 20–40% (industry benchmarks). Fewer fields = higher completion rates. Apple Sign-In is required for iOS App Store submission (Wave 5).

**Tech:** Configuration in Clerk Dashboard — no code changes needed. The `(auth)` catch-all routes already render Clerk's component which automatically shows configured providers.

**Effort:** Very low. Dashboard configuration only.

---

#### 5.6 Transactional Emails `TO BUILD` `USER` `GROWTH`

**What it does:** Automated emails triggered by key events:

| Email | Trigger |
|-------|---------|
| Welcome | After signup |
| Subscription confirmed | After first payment |
| Trial ending | 3 days before trial expires |
| Subscription cancelled | After cancellation |
| Account deletion scheduled | After deletion request |
| Account deletion completed | After 30-day grace period |

**Why it matters:** These emails reduce churn (trial-ending reminder), build trust (deletion confirmation), and improve the experience (welcome email with tips). The trial-ending email alone can recover 10–15% of users who would otherwise forget and churn.

**Tech:** Resend, SendGrid, or Clerk's built-in email templates. Integrate with Stripe webhook events.

**Effort:** Medium.

---

### Wave 5: iOS App `USER` `GROWTH`

**Business case:** Mobile apps account for 70%+ of astrology app revenue. The iOS App Store is the primary distribution channel for premium apps in Bulgaria (iOS market share ~30%, but iOS users spend 2–3x more on subscriptions than Android). Being web-only leaves significant revenue on the table.

---

#### 6.1 Expo Scaffold `TO BUILD` `INFRA`

**What it does:** Creates the `apps/mobile/` Expo app inside the existing monorepo. Configures Solito for code sharing between web and mobile. Sets up the mobile build pipeline.

**Code sharing strategy:**
| Layer | Shared between web & mobile? |
|-------|------------------------------|
| Types & constants | Yes — import from `@celestia/astrology/client` |
| Validation schemas | Yes — move to `packages/shared/` |
| API call logic | Yes — extract from hooks into shared service layer |
| UI components | No — web uses Tailwind/D3, mobile uses NativeWind/Skia |
| Navigation | No — web uses Next.js router, mobile uses Expo Router |
| Auth | Partial — both Clerk, different SDKs |

**Key constraint:** The astrology engine (`sweph`) uses native Node.js bindings and cannot run on mobile. All calculations already go through the API — no change needed.

**Effort:** Medium. Scaffolding + code reorganization.

---

#### 6.2 Clerk Native Auth + Biometrics `TO BUILD` `USER`

**What it does:** Authentication in the iOS app using `@clerk/clerk-expo`. Supports Face ID and Touch ID for returning users.

**Why it matters:** Biometric login is table stakes for iOS apps. Users expect to open the app and be logged in instantly.

**Effort:** Medium.

---

#### 6.3 RevenueCat IAP + Stripe Sync `TO BUILD` `INFRA` `GROWTH`

**What it does:** In-app purchases on iOS handled through RevenueCat. RevenueCat webhooks update the same `users.subscription_tier` column that Stripe updates, keeping web and mobile subscriptions in sync.

**Why it matters:** Apple requires apps with subscriptions to use In-App Purchase. You cannot use Stripe directly in an iOS app. RevenueCat abstracts the complexity.

**Tech:** `react-native-purchases` SDK on mobile. New webhook route: `POST /api/webhooks/revenuecat`. RevenueCat checks entitlements client-side; web continues using `/api/stripe/status`.

**Effort:** High. Payment integration + webhook handling + testing across platforms.

---

#### 6.4 Skia Natal Chart `TO BUILD` `USER`

**What it does:** A native iOS implementation of the natal chart wheel using React Native Skia. Same chart data, same layout logic, but rendered with GPU-accelerated Skia primitives instead of D3.js SVG.

**Why it matters:** The chart is the product's visual signature. A janky chart on mobile kills the premium feel. Skia delivers 60fps+ rendering.

**Tech:** `@shopify/react-native-skia`. Layout logic (planet positions on circle, zodiac segment angles) extracted from `NatalWheel.tsx` into a shared `chartLayout.ts` utility.

**Effort:** High. Full reimplementation of the chart renderer.

---

#### 6.5 APNs Push Notifications `TO BUILD` `USER` `GROWTH`

**What it does:** Native iOS push notifications for morning horoscopes and transit alerts. Uses Apple Push Notification service.

**Why it matters:** Native push on iOS has significantly higher engagement than web push. This is the primary retention mechanism for mobile users.

**Effort:** Medium.

---

#### 6.6 TestFlight Beta `TO BUILD` `GROWTH`

**What it does:** Distribute the iOS app to beta testers via Apple's TestFlight. Target: 500+ beta users before public App Store launch.

**Why it matters:** Beta feedback from real users catches issues that testing can't. TestFlight also validates App Store submission requirements (Apple Sign-In, IAP review, privacy labels).

**Effort:** Low (once the app is built). App Store review process is the bottleneck.

---

### Wave 6: Polish & Hardening `USER` `INFRA`

**Business case:** These features round out the experience before public launch. Rate limiting prevents abuse. Weekly horoscopes add a premium engagement touchpoint. Notification preferences reduce opt-outs. The security audit is a prerequisite for handling financial and personal data responsibly.

---

#### 7.1 Rate Limiting `TO BUILD` `INFRA`

**What it does:** Limits how many requests each user or IP can make to the API within a time window. Prevents abuse, scraping, and accidental DDoS.

**Limits:**
| Route type | Limit |
|------------|-------|
| Auth-protected routes | 60 req/min per user |
| AI generation (oracle/horoscope) | 10 req/min per user |
| Public routes | 30 req/min per IP |

**Tech:** `@upstash/ratelimit` with Vercel KV, or IP-based middleware.

**Effort:** Low-medium.

---

#### 7.2 Weekly Horoscope `TO BUILD` `USER` `GROWTH`

**What it does:** A premium feature: a longer, more in-depth horoscope covering the week ahead. Calculates transit aspects for a 7-day window and generates a narrative covering the key themes, opportunities, and challenges of the week.

**Why it matters:** Adds another premium-only touchpoint. Users who check daily + weekly horoscopes are deeply engaged.

**Tech:** New prompt in `lib/horoscope/prompts.ts`, new route `POST /api/horoscope/weekly`, extend transit calculation for 7-day windows.

**Effort:** Medium.

---

#### 7.3 Notification Preferences `TO BUILD` `USER`

**What it does:** Granular control over which notifications users receive:
- Daily horoscope (morning push)
- Transit alerts (major aspects hitting their chart)
- Weekly digest (summary of the week ahead)

Currently it's all-or-nothing. This lets users keep what they want and silence what they don't.

**Why it matters:** Users who can customize notifications are less likely to disable them entirely. Fewer full opt-outs = better retention.

**Tech:** `notification_preferences` JSONB column on `users` table. Settings UI. Cron job checks preferences before sending.

**Effort:** Low.

---

#### 7.4 Onboarding Flow `TO BUILD` `USER` `GROWTH`

**What it does:** A guided first-time experience for new users. After registration: welcome screen → birth data wizard → first chart reveal (with animation) → first AI reading → upgrade prompt with trial offer.

**Why it matters:** The path from "I just signed up" to "wow, this is accurate" needs to be as short and smooth as possible. Every second of confusion is a lost user. A great onboarding flow can double activation rates.

**Effort:** Medium. Orchestration of existing components into a guided flow.

---

#### 7.5 Security Audit `TO BUILD` `INFRA` `COMPLIANCE`

**What it does:** A thorough review of the entire application before public launch: dependency vulnerabilities (npm audit), authentication edge cases, API authorization gaps, SQL injection surface, XSS vectors, Stripe webhook security, and RLS policy coverage.

**Why it matters:** The app handles birth data (PII), payment information, and personal readings. A breach would be catastrophic for trust and potentially illegal under GDPR.

**Effort:** Medium. Can be done in-house or with an external auditor.

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| iOS TestFlight beta users | 500+ | TestFlight analytics |
| Daily active users (web + mobile) | 5,000+ | PostHog/Mixpanel |
| Free → premium conversion | 5%+ | Stripe + RevenueCat |
| Day-7 retention | 40%+ | Analytics cohort |
| Day-30 retention | 20%+ | Analytics cohort |
| App Store rating | 4.5+ | App Store Connect |
| Push notification opt-in | 60%+ | `push_subscriptions` count / total users |
| Monthly recurring revenue | €3,500+ | Stripe + RevenueCat dashboards |

---

## Execution Summary

| Wave | Features | Theme | Effort |
|------|----------|-------|--------|
| 1 | 2.1–2.4 | Testing, monitoring, CI/CD | ~2 weeks |
| 2 | 3.1–3.3 | English localization | ~2–3 weeks |
| 3 | 4.1–4.5 | Premium features (profiles, synastry, journal) | ~3–4 weeks |
| 4 | 5.1–5.6 | Pricing, trial, analytics, emails | ~2 weeks |
| 5 | 6.1–6.6 | iOS app | ~6–8 weeks |
| 6 | 7.1–7.5 | Rate limiting, weekly horoscope, onboarding, security | ~2–3 weeks |

**Total: 41 features across 6 waves.**

---

*Source: PRD v1.0, v0.1 codebase (8 phases shipped, build verified clean), REQUIREMENTS.md, PROJECT.md, FEATURES.md, COMPETITOR_ANALYSIS.md*
