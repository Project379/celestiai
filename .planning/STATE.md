# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-21)

**Core value:** Users return daily for precise, personalized readings that feel like wisdom from a knowledgeable friend who happens to know the stars.
**Current focus:** Phase 8 (launch prep — Phase 7 complete)

## Current Position

Phase: 8 of 8 - IN PROGRESS
Plan: 2 of 3 in phase 8 - COMPLETE
Status: Phase 8 Plan 2 complete — GDPR compliance with privacy policy, data export, account deletion, hard-delete cron
Last activity: 2026-02-18 - Completed 08-02-PLAN.md (GDPR compliance — privacy policy, data export, soft-delete account deletion, cleanup cron)

Progress: [####################] 98%

## Performance Metrics

**Velocity:**
- Total plans completed: 25
- Average duration: 9m
- Total execution time: 3.4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 20m | 7m |
| 02-authentication | 3 | 25m | 8m |
| 03-birth-data-database | 5 | 17m | 3m |
| 03.1-bugfixes-and-landing-page | 3 | 10m | 3m |
| 04-astrology-engine-charts | 4 | 104m | 26m |
| 05-ai-oracle | 3 | 20m | 7m |
| 06-daily-horoscope | 3 | 11m | 4m |
| 07-payments | 3 | 15m | 5m |
| 08-launch-prep | 2 | 12m | 6m |

**Recent Trend:**
- Last 5 plans: 07-02 (5m), 07-03 (5m), 08-01 (5m), 08-02 (7m)
- Trend: Consistent execution pace through Phase 8

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Web-first for v0.1, Bulgarian-only, server-side WASM only
- [Roadmap]: 8 phases derived from 54 requirements with security distributed across relevant phases
- [01-01]: Manual monorepo setup instead of create-turbo for exact control
- [01-01]: Next.js 15.5.9 with Turbopack for fast development
- [01-01]: React 19 with TypeScript 5.9 for latest features
- [01-02]: Tailwind v3.4.x (not v4) for NativeWind compatibility
- [01-02]: CSS variables with rgb() for alpha support
- [01-02]: React.createElement for dynamic tag Text component
- [01-03]: Nonce-based CSP with dynamic rendering via connection()
- [01-03]: Dev mode allows unsafe-eval/unsafe-inline for hot reload
- [01-03]: @celestia/ui as explicit workspace dependency
- [02-01]: clerkMiddleware replaces custom CSP middleware
- [02-01]: ClerkProvider with bgBG localization and dynamic prop
- [02-02]: Canvas-based star animation for performance
- [02-02]: Combined sign-up/sign-in on single /auth route
- [02-03]: Native dialog element for logout confirmation accessibility
- [02-03]: useRef for wasSignedIn tracking to avoid stale closures
- [02-03]: UserButton custom action for logout confirmation flow
- [03-01]: pgTable().enableRLS() with pgPolicy() helpers for type-safe RLS
- [03-01]: auth.jwt()->>'sub' for Clerk user ID (not auth.uid())
- [03-01]: Separate server/client Supabase factories for different contexts
- [03-02]: 203 settlements with mix of cities/towns/villages for comprehensive coverage
- [03-02]: Client-side re-sort for proper type ordering (city > town > village)
- [03-03]: Zod v4 error syntax uses { error: string } not { message: string }
- [03-03]: superRefine for conditional cross-field validation (time/range)
- [03-03]: RLS handles user isolation; API routes don't manually filter by user_id
- [03-04]: FormProvider wraps wizard for shared state across step components
- [03-04]: Per-step validation via trigger() before navigation forward
- [03-04]: 300ms debounce for city search autocomplete
- [03-05]: Server/client split for dashboard with initial data fetch
- [03-05]: Two-step confirmation for edit dialog (form -> confirm -> save)
- [03.1-01]: auth() instead of auth.protect() in API routes for JSON error responses
- [03.1-01]: Bulgarian error message "Неоторизиран достъп" for 401 responses
- [03.1-02]: UserButton.MenuItems to explicitly list menu items (hides default signOut)
- [03.1-03]: Use /auth for both login and register CTAs (unified auth route)
- [03.1-03]: Sticky navigation with glassmorphism blur effect
- [03.1-03]: Landing section components with id attributes for anchor navigation
- [04-01]: Use sweph native Node.js bindings (not WASM) for server-side calculations
- [04-01]: Use Moshier ephemeris (built-in, no external files needed)
- [04-01]: Access sweph constants via sweph.constants object
- [04-01]: Houses result points array uses indices (SE_ASC=0, SE_MC=1)
- [04-01]: Aspect orbs: conjunction 8deg, sextile 5deg, square/trine 7deg, opposition 8deg
- [04-02]: Service role client for chart_calculations (internal cache table)
- [04-02]: Cache-first pattern: check cache before calculation
- [04-02]: JSONB columns for flexible chart data storage
- [04-02]: Unique constraint on chart_id (one calculation per chart)
- [04-03]: Separate @celestia/astrology/client for browser-safe imports
- [04-03]: D3 arc generator for zodiac segments with element colors
- [04-03]: useD3 hook pattern for React/D3 integration
- [04-03]: Responsive layout at lg (1024px) breakpoint
- [04-04]: Interpretation data layer in lib/interpretations/ for localized content
- [04-04]: Accessible SVG elements with role=button, tabindex, keyboard events
- [04-04]: Selection glow ring on wheel planets, scale transform on Big Three cards
- [05-01]: No RLS on users or ai_readings — service role access only (consistent with chart_calculations)
- [05-01]: Sentinel markers use English planet keys [planet:KEY]Bulgarian[/planet] for chart cross-highlighting
- [05-01]: Fresh RegExp per call (not module-level) to avoid stateful lastIndex bugs with 'g' flag
- [05-01]: Topic suffixes appended to base system prompt for voice consistency across reading types
- [05-02]: AI SDK v6 uses toTextStreamResponse() — toDataStreamResponse() was removed in v6
- [05-02]: AI SDK v6 uses maxOutputTokens not maxTokens for token limits
- [05-02]: useCompletion streamProtocol: 'text' pairs with toTextStreamResponse() in v6
- [05-02]: Teaser upsert creates row with empty content to hold teaser_content until full generation
- [05-03]: OraclePanel mounted twice (desktop + mobile) — share same DB cache via useOracleReading(chartId)
- [05-03]: Cross-highlight bridge in ChartView maps Oracle planet keys to NatalWheel selection state via existing setSelectedPlanet flow
- [05-03]: chart/page.tsx wraps users table query in try/catch — silently defaults to 'free' if Supabase paused or row missing
- [05-03]: TOPIC_META in TopicCard.tsx is single source of truth for labels + icons across Oracle components
- [06-01]: Sofia timezone date key (Intl.DateTimeFormat en-CA) prevents UTC boundary mismatch for Bulgarian users
- [06-01]: Two-layer transit cache: global daily_transits by date + per-chart daily_horoscopes by chart+date
- [06-01]: Yesterday horoscope returns unavailable if no prior cache — no retroactive AI generation
- [06-01]: Transit orbs separate from natal: inner planets 2-3deg, outer 3-4deg via TRANSIT_ASPECT_DEFINITIONS
- [06-01]: daily_transits + daily_horoscopes use service role only (no RLS) — consistent with ai_readings pattern
- [06-02]: Date param passed as URL query string (?date=YYYY-MM-DD) to match API route searchParams parsing — not in POST body
- [06-02]: parseSentinels() returns React.ReactNode[] to render planet names with accent colors inline — no DOM manipulation
- [06-02]: PLANET_COLORS map uses Tailwind text- classes per planet key — reuses cosmic theme palette
- [06-02]: DailyHoroscope placed after BirthDataCard section and before 3-column grid — first astrology content section
- [06-03]: Generic push notification body avoids N concurrent AI calls at cron time — personalized content generated on dashboard visit
- [06-03]: 410/404 error codes from web-push trigger automatic subscription cleanup in batch after cron run
- [06-03]: Uint8Array<ArrayBuffer> explicit generic required for TypeScript 5.7 compatibility with PushManager.subscribe applicationServerKey
- [07-01]: stripe@20.3.1 installed (latest); API version is '2026-01-28.clover' not '2025-01-27.acacia' — plan referenced older SDK version
- [07-01]: drizzle-kit updated to latest to resolve drizzle-orm 0.40.1 incompatibility with 0.31.8
- [07-01]: PricingContent extracted to separate file (not inline with page.tsx) for clean server/client component separation
- [07-01]: clerkUserId metadata set on both checkout session and subscription_data for reliable webhook correlation in 07-02
- [07-02]: stripe@20.x moves current_period_end from Subscription to SubscriptionItem (sub.items.data[0].current_period_end)
- [07-02]: stripe@20.x moves invoice.subscription to invoice.parent.subscription_details.subscription (new parent union type)
- [07-02]: SuccessContent extracted to separate file for clean server/client component separation (consistent with PricingContent pattern from 07-01)
- [07-03]: SettingsContent extracted to separate file for clean server/client split (consistent with PricingContent and SuccessContent patterns)
- [07-03]: UpgradePrompt uses inline expansion — collapsed teaser expands in-place to show pricing and checkout button, no modal or full-page redirect
- [07-03]: DashboardContent receives subscriptionTier and priceMonthly from server page to avoid client-side fetch for initial render
- [07-03]: Promise.all used in dashboard page to fetch charts + users rows concurrently (was sequential before)
- [08-01]: 2x2 grid layout (md:grid-cols-2 max-w-4xl) for 4 feature cards — cleaner than 4-in-a-row or 3+1 orphan
- [08-01]: lucide-react for consistent, tree-shakeable icon library across landing page
- [08-02]: daily_horoscopes and ai_readings both have user_id — queried directly for GDPR export and hard-delete
- [08-02]: Soft delete with 30-day grace period: deleted_at marks deactivation, deletion_scheduled_at sets hard-delete date
- [08-02]: Cascading hard-delete order: horoscopes/calculations by chart_id, then readings/charts/push by user_id, then users, then Clerk
- [08-02]: await clerkClient() per Clerk v6 pattern for server-side Clerk API calls in cron job

### Pending Todos

5 pending — run `/gsd:check-todos` to review:
- Human test - Complete wizard flow
- Human test - City search behavior
- Human test - Edit flow with confirmation
- Human test - RLS data isolation
- Human test - Push notification end-to-end flow (06-03 Task 3 deferred to post-Phase 7 batch)

### Roadmap Evolution

- Phase 3.1 inserted after Phase 3: Bugfixes & Landing Page (COMPLETE)
  - Two logout buttons in UI - FIXED
  - JSON parsing errors (HTML returned instead of JSON) - FIXED
  - /birth-data accessible without auth - FIXED
  - City search fails for unauthenticated users - FIXED
  - Remaining Latin text issues - FIXED
  - Landing page needs proper structure with nav tabs - DONE

### Blockers/Concerns

- Supabase free tier project auto-paused (14 days inactive). Apply migration 0004_parched_lizard.sql manually via Supabase dashboard SQL Editor after unpausing. All TypeScript code is correct.

## Phase 1 Completion Summary

Phase 1 (Foundation) is complete with all requirements satisfied:

**Infrastructure:** Turborepo monorepo, Next.js 15.5.9, React 19, pnpm workspaces
**Styling:** NativeWind v4, Tailwind 3.4.x, cosmic glassmorphism theme
**Security:** CSP, XFO, XCTO, Referrer-Policy, HSTS headers
**UI:** Dark space aesthetic, Bulgarian language, responsive grid

## Phase 2 Completion Summary

Phase 2 (Authentication) is complete with all requirements satisfied:

**Clerk Integration:** clerkMiddleware with route protection, ClerkProvider with bgBG
**Auth UI:** Combined sign-in/sign-up page at /auth with cosmic star animation
**Protected Routes:** Dashboard with UserMenu, session expiry modal, protected API pattern
**Security:** auth.protect() for routes and APIs, logout confirmation dialog

## Phase 3 Completion Summary

Phase 3 (Birth Data & Database) is complete with all requirements satisfied:

**Database:** Supabase with RLS policies, charts table with Clerk user_id
**Cities:** 203 Bulgarian settlements with search API
**Validation:** Zod schemas with Bulgarian error messages, conditional time/range validation
**UI:** 4-step wizard with progress bar, city autocomplete with debounce
**Dashboard:** Birth data card or CTA based on user state, edit dialog with confirmation
**Security:** SEC-19 verified - no PII sent to third-party services

## Phase 3.1 Completion Summary

Phase 3.1 (Bugfixes & Landing Page) is complete with all issues fixed:

**Bugfixes:** API routes return JSON 401 errors, duplicate logout button removed
**Landing Page:** Sticky navigation with tabs, Features/Pricing/About sections
**UI:** All text in Bulgarian Cyrillic, smooth scroll anchor navigation

## Phase 4 Completion Summary

Phase 4 (Astrology Engine & Charts) is complete with all requirements satisfied:

**Swiss Ephemeris:** @celestia/astrology package with sweph native bindings
**Calculation API:** POST /api/chart/calculate with caching
**Visualization:** D3.js natal wheel with 10 planets, 12 zodiac segments, aspect lines
**Big Three:** Sun, Moon, Rising cards with Bulgarian translations
**Interactions:** Planet click reveals interpretation panel with Bulgarian text (CHART-03)
**Accessibility:** Keyboard navigable chart with focus management
**UI:** Responsive /chart page with loading skeleton and error states

## Phase 5 Completion Summary

Phase 5 (AI Oracle) is complete with all requirements built (human verification deferred):

**Database:** users table (subscription_tier), ai_readings table (7-day expiry cache, unique per chart+topic)
**Prompt Engineering:** Bulgarian mystical guide persona, sentinel markers for cross-highlighting, topic suffixes
**Streaming API:** Gemini 2.5 Flash via Vercel AI SDK v6, tier gating, cache-first, 24h regen rate limit
**UI:** TopicCards (4 topics with lock states), ReadingStream (streaming + cross-highlight), LockedTopicTeaser (blurred + CTA), OraclePanel
**Integration:** ChartView with responsive Oracle panel, planet cross-highlighting bridge to NatalWheel

## Phase 6 Completion Summary

Phase 6 (Daily Horoscope) is complete with all automated tasks done (human verification of push flow deferred to post-Phase 7):

**Database:** daily_transits + daily_horoscopes tables (service role, two-layer cache); push_subscriptions table (endpoint uniqueness, user_id index)
**API:** POST /api/horoscope/generate (streaming, Sofia timezone, 24h cache), GET /api/cron/daily-horoscope (CRON_SECRET auth, batch send, expired cleanup), POST /api/push/subscribe + unsubscribe
**Service Worker:** apps/web/public/sw.js — push event handler (showNotification) + notificationclick (openWindow /dashboard)
**UI:** DailyHoroscope card with today/yesterday tabs, HoroscopeStream with planet sentinel color highlighting, PushNotificationBanner with Bulgarian UI
**Infrastructure:** vercel.json cron at 06:00 UTC; web-push library; generic notification body avoids N AI calls at cron time

## Phase 7 Completion Summary

Phase 7 (Payments) — All 3 plans complete:

**Stripe SDK:** stripe@20.3.1 installed in apps/web; singleton client with API version 2026-01-28.clover
**Database:** users table extended with 3 Stripe columns; processed_webhook_events table for webhook idempotency; migration 0005_slow_blue_shield.sql generated
**Checkout API:** POST /api/stripe/checkout with priceId allowlist validation, clerkUserId metadata on session + subscription_data, returning-customer support
**Pricing Page:** /pricing server page + PricingContent client component; Free/Premium side-by-side cards; monthly/annual toggle; cancelled=true URL param handling; active badge for premium users
**Environment:** Stripe env vars documented in .env.example (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL, NEXT_PUBLIC_APP_URL)
**Webhook Handler:** POST /api/webhooks/stripe — raw body text() for signature verification, idempotency via processed_webhook_events, 5 event types, 500 on errors (Stripe retries)
**Subscription Lifecycle:** handleCheckoutComplete/Updated/Deleted/InvoicePaid — updates users table tier, Stripe IDs, expiry; stripe@20.x API fixes applied
**Success Page:** /subscription/success — server fetches initial tier, client polls /api/stripe/status every 2s until premium; 30s timeout; 3 Bulgarian UI states
**Cancel API:** POST /api/stripe/cancel (cancel_at_period_end: true) + DELETE (reactivate); optional reason logging
**Portal API:** POST /api/stripe/portal — Stripe Customer Portal session returning URL
**Settings Page:** /settings with 4 subscription states (free, active, cancelling, expired); native dialog cancellation with 4-option reason dropdown; billing date, payment method display
**UpgradePrompt:** Reusable inline expand/collapse CTA component; context-specific Bulgarian copy for dashboard/horoscope/oracle; calls /api/stripe/checkout
**Dashboard:** Premium badge for premium users; UpgradePrompt for free users; parallel fetch of tier + chart data
**DailyHoroscope:** Inline UpgradePrompt after content for free users; additive only

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 08-02-PLAN.md — GDPR compliance (privacy policy, data export, account deletion, cleanup cron)
Resume file: None

---

*Next action: Execute 08-03-PLAN.md*

## Key Clarifications

- `.env.local` is NOT hardcoded keys -- it's gitignored and stays local only
- `.env.example` (committed) shows what variables are needed with placeholders
- This is standard Next.js secrets pattern
