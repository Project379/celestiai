# Roadmap: Stellaeum AI

**Refreshed 2026-08-13 — see git history for the prior stale snapshot.** This
file's Phase B section sat frozen at "OPEN 2026-05-09, awaiting ratification"
through most of Stream P actually shipping; see
`.planning/VERIFICATION-SURFACE-GAPS.md` item 4. For a continuously-verified
view, see `.planning/COMPLETION-TRACKER.md`.

This document covers two milestones:

- **v0.1 — web MVP** (COMPLETE 2026-02-19) — Phases 1–8 documented below for historical reference.
- **v1.0 — mobile-led launch** (Phase A complete 2026-05-09; Phase B substantially advanced as of 2026-08-13) — appended at the bottom.

---

## v0.1 milestone — web MVP

### Overview

Stellaeum AI v0.1 delivers a web-first Bulgarian astrology MVP. The journey starts with monorepo foundation and security headers, progresses through authentication and birth data collection, builds the core astrology engine with interactive charts, layers AI-powered readings and daily horoscopes, integrates Stripe payments, and concludes with landing page polish and GDPR compliance. Eight phases, 54 requirements, zero enterprise theater.

## Domain Expertise

- None (greenfield project, research documents provide context)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Monorepo scaffold, theme, security headers, responsive base
- [x] **Phase 2: Authentication** - Clerk integration with secure session handling
- [x] **Phase 3: Birth Data & Database** - User data collection, encryption, RLS policies
- [x] **Phase 3.1: Bugfixes & Landing Page** (INSERTED) - Route protection, UI fixes, landing page
- [x] **Phase 4: Astrology Engine & Charts** - Swiss Ephemeris server-side, interactive visualization
- [x] **Phase 5: AI Oracle** - AI-powered personalized readings with tier restrictions
- [x] **Phase 6: Daily Horoscope** - Personalized daily content with push notifications
- [x] **Phase 7: Payments** - Stripe integration, subscription lifecycle management
- [x] **Phase 8: Launch Prep** - Landing page, GDPR compliance, audit logging, final polish

## Phase Details

### Phase 1: Foundation

**Goal**: Establish Turborepo monorepo with Next.js 15, NativeWind theming, security headers, and responsive layout foundation

**Depends on**: Nothing (first phase)

**Requirements**:
- UI-01: App uses "cosmic glassmorphism" dark theme
- UI-02: All UI text in Bulgarian
- UI-03: Responsive design works on desktop and mobile browsers
- SEC-01: All PII transmitted over HTTPS
- SEC-13: Content Security Policy (CSP) headers configured
- SEC-14: X-Frame-Options: DENY header (prevent clickjacking)
- SEC-15: X-Content-Type-Options: nosniff header
- SEC-16: Referrer-Policy: strict-origin-when-cross-origin header

**Success Criteria**:
- [x] User sees dark glassmorphism theme on both desktop and mobile viewports
- [x] All visible text renders in Bulgarian language
- [x] Browser DevTools shows all security headers present on every response
- [x] Site loads over HTTPS with valid certificate

**Research**: Complete (01-RESEARCH.md)
**Plans**: 3 plans in 3 waves (COMPLETE)

Plans:
- [x] 01-01-PLAN.md — Monorepo scaffold with Turborepo, Next.js 15, shared packages
- [x] 01-02-PLAN.md — NativeWind v4 + Tailwind CSS with cosmic glassmorphism theme
- [x] 01-03-PLAN.md — Security headers middleware and responsive layout foundation

---

### Phase 2: Authentication

**Goal**: Users can securely create accounts, log in, and maintain persistent sessions via Clerk

**Depends on**: Phase 1

**Requirements**:
- AUTH-01: User can register with email and password
- AUTH-02: User receives email verification after signup
- AUTH-03: User can log in with email and password
- AUTH-04: User can reset password via email link
- AUTH-05: User session persists across browser refresh
- AUTH-06: User can log out
- SEC-09: Rate limiting on sign-in attempts (Clerk built-in)
- SEC-10: Rate limiting on verification attempts (Clerk built-in)
- SEC-11: All protected routes use auth.protect() middleware
- SEC-12: Session tokens are HttpOnly, Secure, SameSite cookies
- SEC-17: All API routes validate authentication before processing

**Success Criteria**:
- [ ] User can register with email, receives verification email, and completes signup
- [ ] User can log in and session persists across browser refresh
- [ ] User can reset password via email link when forgotten
- [ ] User can log out from any authenticated page
- [ ] Protected routes redirect unauthenticated users to login

**Research**: Complete (02-RESEARCH.md)
**Plans**: 3 plans in 2 waves

Plans:
- [x] 02-01-PLAN.md — Clerk SDK setup, clerkMiddleware replacing Phase 1 CSP, ClerkProvider with Bulgarian localization
- [x] 02-02-PLAN.md — Combined auth page (/auth) with cosmic background and Stellaeum branding
- [x] 02-03-PLAN.md — Protected routes, user menu with logout, session expiry modal, API protection

---

### Phase 3: Birth Data & Database

**Goal**: Users can input and edit birth data with Bulgarian city search, stored encrypted with Row Level Security

**Depends on**: Phase 2

**Requirements**:
- BIRTH-01: User can enter birth date
- BIRTH-02: User can enter birth time (with "unknown" option)
- BIRTH-03: User can search and select Bulgarian city/village
- BIRTH-04: System resolves city to latitude/longitude coordinates
- BIRTH-05: Birth data is encrypted at rest in database
- BIRTH-06: User can edit their birth data
- SEC-02: Birth data encrypted at rest (database-level)
- SEC-06: RLS (Row Level Security) enabled on ALL tables containing user data
- SEC-07: RLS policies use JWT claims for user identification
- SEC-08: No table allows public access without RLS policy
- SEC-18: Input validation on all user-submitted data (Zod schemas)
- SEC-19: No PII sent to analytics or third-party services
- SEC-21: Database backups encrypted

**Success Criteria**:
- [ ] User can enter birth date, time (or mark unknown), and search Bulgarian cities
- [ ] City search returns coordinates (latitude/longitude) for selected location
- [ ] User can view and edit their saved birth data
- [ ] Database query for another user's data returns empty (RLS working)
- [ ] Invalid input (bad dates, malformed data) is rejected with clear error

**Research**: Complete (03-RESEARCH.md)
**Plans**: 5 plans in 4 waves (COMPLETE)

Plans:
- [x] 03-01-PLAN.md — @stellaeum/db package with Drizzle schema, RLS policies, Supabase client factory
- [x] 03-02-PLAN.md — Bulgarian city seed data and search API endpoint
- [x] 03-03-PLAN.md — Zod validation schemas and birth data CRUD API routes
- [x] 03-04-PLAN.md — Birth data wizard UI with city search
- [x] 03-05-PLAN.md — Dashboard integration with birth data display and edit

---

### Phase 3.1: Bugfixes & Landing Page (INSERTED)

**Goal**: Fix critical bugs discovered during testing and create proper landing page with navigation

**Depends on**: Phase 3

**Issues to Fix**:
- BUG-01: Two logout buttons displayed in UI
- BUG-02: JSON parsing error ("Unexpected token '<'") - HTML returned instead of JSON
- BUG-03: /birth-data accessible without authentication
- BUG-04: City search API fails when not logged in
- BUG-05: Remaining Latin text elements need Cyrillic conversion
- FEAT-01: Landing page with navigation tabs (Features, Pricing, About)

**Success Criteria**:
- [x] Only one logout button visible
- [x] No JSON parsing errors - APIs return proper JSON or redirect
- [x] /birth-data redirects to /auth when not logged in
- [x] City search only accessible to authenticated users
- [x] All visible text is in Bulgarian Cyrillic
- [x] Landing page has proper navigation tabs and structure

**Research**: None needed
**Plans**: 3 plans in 1 wave (COMPLETE)

Plans:
- [x] 03.1-01-PLAN.md — Route protection and API fixes (BUG-02, BUG-03, BUG-04)
- [x] 03.1-02-PLAN.md — UI bugfixes (BUG-01 duplicate logout, BUG-05 Latin text)
- [x] 03.1-03-PLAN.md — Landing page with navigation tabs (FEAT-01)

---

### Phase 4: Astrology Engine & Charts

**Goal**: Users see their natal chart with interactive planet exploration and Big Three prominently displayed

**Depends on**: Phase 3.1

**Requirements**:
- CHART-01: System calculates natal chart via Swiss Ephemeris (server-side)
- CHART-02: User sees interactive natal chart visualization
- CHART-03: User can tap planets to see interpretation
- CHART-04: User sees Big Three (Sun, Moon, Rising) prominently
- CHART-05: Chart displays all 10 major planets with positions

**Success Criteria**:
- [x] User with birth data sees calculated natal chart within seconds of request
- [x] Chart visualization shows all 10 planets positioned correctly
- [x] User can tap/click any planet to see interpretation popup
- [x] Big Three (Sun, Moon, Rising) are visually prominent above other planets
- [x] Chart renders correctly on both desktop and mobile viewports

**Research**: Complete (04-RESEARCH.md)
**Plans**: 4 plans in 4 waves (COMPLETE)

Plans:
- [x] 04-01-PLAN.md — @stellaeum/astrology package with sweph bindings and calculation utilities
- [x] 04-02-PLAN.md — Chart calculation API route with database caching
- [x] 04-03-PLAN.md — Interactive chart visualization with D3.js and Big Three cards
- [x] 04-04-PLAN.md — Planet interpretation popups with placeholder text

---

### Phase 5: AI Oracle

**Goal**: Users receive AI-generated personalized readings citing their specific planetary positions, with topic restrictions based on subscription tier

**Depends on**: Phase 4

**Requirements**:
- AI-01: User sees AI-generated interpretation with their chart
- AI-02: Free users get general personality reading
- AI-03: Premium users can request love/relationships reading
- AI-04: Premium users can request career/purpose reading
- AI-05: Premium users can request health/wellness reading
- AI-06: AI readings cite specific degree positions

**Success Criteria**:
- [ ] Free user sees general personality reading generated from their chart
- [ ] Free user attempting love/career/health reading sees upgrade prompt
- [ ] Premium user can request and receive love, career, or health readings
- [ ] All readings cite specific degree positions (e.g., "Your Sun at 15 degrees Leo...")
- [ ] Readings feel personalized, not generic horoscope content

**Research**: Complete (05-RESEARCH.md)
**Plans**: 3 plans in 3 waves (COMPLETE)

Plans:
- [x] 05-01-PLAN.md — Database schema (users + ai_readings tables) and Oracle prompt utilities
- [x] 05-02-PLAN.md — Streaming API route (Gemini), readings/teaser endpoints, client hook
- [x] 05-03-PLAN.md — Oracle UI components, chart page integration, cross-highlighting

---

### Phase 6: Daily Horoscope

**Goal**: Users receive personalized daily horoscopes based on transits to their natal chart, with morning push notification

**Depends on**: Phase 4

**Requirements**:
- DAILY-01: User sees daily horoscope personalized to their chart
- DAILY-02: Horoscope updates each day
- DAILY-03: User can view yesterday's horoscope
- DAILY-04: User receives morning push notification with horoscope

**Success Criteria**:
- [ ] User sees personalized daily horoscope different from other users
- [ ] Horoscope content changes each day (yesterday shows different content)
- [ ] User can navigate to view yesterday's horoscope
- [ ] User who enabled notifications receives morning push with horoscope preview

**Research**: Complete (06-RESEARCH.md)
**Plans**: 3 plans in 2 waves

Plans:
- [x] 06-01-PLAN.md — Transit calculation, DB schema (daily_transits + daily_horoscopes), streaming generation API
- [x] 06-02-PLAN.md — Horoscope UI components, client hook, yesterday navigation, dashboard integration
- [x] 06-03-PLAN.md — Web Push notifications: service worker, subscribe/unsubscribe API, cron job, opt-in banner

---

### Phase 7: Payments

**Goal**: Users can purchase, manage, and cancel premium subscriptions via Stripe with automatic access grant/revoke

**Depends on**: Phase 2

**Requirements**:
- PAY-01: User can view premium subscription options
- PAY-02: User can purchase subscription via Stripe
- PAY-03: System grants premium access after successful payment
- PAY-04: User can cancel subscription
- PAY-05: System revokes premium access after subscription ends

**Success Criteria**:
- [ ] User sees clear premium subscription pricing and benefits
- [ ] User can complete Stripe checkout and immediately access premium features
- [ ] User can view subscription status and cancel from settings
- [ ] After subscription ends, premium features are locked with upgrade prompt

**Research**: Complete (07-RESEARCH.md)
**Plans**: 3 plans in 3 waves

Plans:
- [x] 07-01-PLAN.md — Stripe SDK setup, DB schema (users columns + webhook idempotency table), checkout API, /pricing page with monthly/annual toggle
- [x] 07-02-PLAN.md — Webhook handler for subscription lifecycle events (checkout, update, delete, invoice), /subscription/success page with activating state
- [x] 07-03-PLAN.md — Subscription management /settings page (cancel, reactivate, portal), reusable UpgradePrompt component, dashboard and horoscope upgrade integration

---

### Phase 8: Launch Prep

**Goal**: Landing page attracts and converts visitors, GDPR compliance enables trust, audit logging enables debugging

**Depends on**: Phase 7

**Requirements**:
- LAND-01: User sees landing page with stars background and placeholder motto
- LAND-02: User sees pricing comparison (free vs premium features)
- LAND-03: User sees feature showcase explaining app value
- LAND-04: User can navigate to login or registration from landing
- SEC-03: Privacy policy accessible from landing and settings
- SEC-04: User can request data export (GDPR)
- SEC-05: User can request account deletion (GDPR)
- SEC-20: Audit logging for sensitive operations

**Success Criteria**:
- [ ] Landing page loads with stars background, pricing table, and feature showcase
- [ ] User can navigate from landing to sign-up or login
- [ ] Privacy policy is accessible from landing footer and settings page
- [ ] User can request data export and account deletion from settings
- [ ] Sensitive operations (login, data access, deletion) appear in audit logs

**Research**: Complete (08-RESEARCH.md)
**Plans**: 3 plans in 2 waves

Plans:
- [x] 08-01-PLAN.md — Landing page hero with starfield, Lucide icon feature showcase with Premium badges, CTA touchpoints, footer privacy link
- [x] 08-02-PLAN.md — Privacy policy page, GDPR privacy settings (data export + account deletion), hard-delete cron, users soft-delete columns
- [x] 08-03-PLAN.md — Audit logging schema, fire-and-forget helper, integration into all sensitive API routes

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 3.1 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-01-21 |
| 2. Authentication | 3/3 | Complete | 2026-01-25 |
| 3. Birth Data & Database | 5/5 | Complete | 2026-01-26 |
| 3.1 Bugfixes & Landing Page | 3/3 | Complete | 2026-01-31 |
| 4. Astrology Engine & Charts | 4/4 | Complete | 2026-02-01 |
| 5. AI Oracle | 3/3 | Complete | 2026-02-15 |
| 6. Daily Horoscope | 3/3 | Complete | 2026-02-15 |
| 7. Payments | 3/3 | Complete | 2026-02-17 |
| 8. Launch Prep | 3/3 | Complete | 2026-02-19 |

**Total Plans:** 29
**Requirements Coverage:** 54/54 (100%)

---

## Requirements Coverage Map

| Requirement | Phase | Category |
|-------------|-------|----------|
| LAND-01 | 8 | Landing |
| LAND-02 | 8 | Landing |
| LAND-03 | 8 | Landing |
| LAND-04 | 8 | Landing |
| AUTH-01 | 2 | Auth |
| AUTH-02 | 2 | Auth |
| AUTH-03 | 2 | Auth |
| AUTH-04 | 2 | Auth |
| AUTH-05 | 2 | Auth |
| AUTH-06 | 2 | Auth |
| BIRTH-01 | 3 | Birth |
| BIRTH-02 | 3 | Birth |
| BIRTH-03 | 3 | Birth |
| BIRTH-04 | 3 | Birth |
| BIRTH-05 | 3 | Birth |
| BIRTH-06 | 3 | Birth |
| CHART-01 | 4 | Chart |
| CHART-02 | 4 | Chart |
| CHART-03 | 4 | Chart |
| CHART-04 | 4 | Chart |
| CHART-05 | 4 | Chart |
| AI-01 | 5 | AI |
| AI-02 | 5 | AI |
| AI-03 | 5 | AI |
| AI-04 | 5 | AI |
| AI-05 | 5 | AI |
| AI-06 | 5 | AI |
| DAILY-01 | 6 | Daily |
| DAILY-02 | 6 | Daily |
| DAILY-03 | 6 | Daily |
| DAILY-04 | 6 | Daily |
| PAY-01 | 7 | Pay |
| PAY-02 | 7 | Pay |
| PAY-03 | 7 | Pay |
| PAY-04 | 7 | Pay |
| PAY-05 | 7 | Pay |
| SEC-01 | 1 | Security |
| SEC-02 | 3 | Security |
| SEC-03 | 8 | Security |
| SEC-04 | 8 | Security |
| SEC-05 | 8 | Security |
| SEC-06 | 3 | Security |
| SEC-07 | 3 | Security |
| SEC-08 | 3 | Security |
| SEC-09 | 2 | Security |
| SEC-10 | 2 | Security |
| SEC-11 | 2 | Security |
| SEC-12 | 2 | Security |
| SEC-13 | 1 | Security |
| SEC-14 | 1 | Security |
| SEC-15 | 1 | Security |
| SEC-16 | 1 | Security |
| SEC-17 | 2 | Security |
| SEC-18 | 3 | Security |
| SEC-19 | 3 | Security |
| SEC-20 | 8 | Security |
| SEC-21 | 3 | Security |
| UI-01 | 1 | UI |
| UI-02 | 1 | UI |
| UI-03 | 1 | UI |

---

*Roadmap created: 2026-01-21*
*Phase 1 planned: 2026-01-21*
*Phase 1 complete: 2026-01-21*
*Phase 2 planned: 2026-01-22*
*Phase 2 complete: 2026-01-25*
*Phase 3 planned: 2026-01-25*
*Phase 3 complete: 2026-01-26*
*Phase 3.1 planned: 2026-01-31*
*Phase 3.1 complete: 2026-01-31*
*Phase 4 planned: 2026-02-01*
*Phase 6 planned: 2026-02-15*
*Phase 6 complete: 2026-02-15*
*Phase 7 complete: 2026-02-17*
*Phase 8 planned: 2026-02-19*
*Phase 8 complete: 2026-02-19*
*Milestone: v0.1 MVP — COMPLETE*

---

## v1.0 milestone — mobile-led launch

### Overview

v0.1 closed the web MVP. v1.0 is the mobile-led commercial launch: native iOS + Android apps via Expo, paywall-driven freemium revenue, and Bulgarian soft-launch (50–100 users) before GA. Source-of-truth UX framing lives in `.planning/research/MOBILE_UX_RESEARCH.md §10`; per-phase execution lives under `.planning/phases/phase-{a,b,c,d}-*/` with sub-round close summaries (SR `n` close docs at each Phase A SR boundary).

Speed-mode discipline preserved: investigation pass before any code in a sub-round, founder ratifies in one response, sub-commits execute sequentially, TypeScript green between commits, founder verification only at sub-round close.

### Phases

- [x] **Phase A: Mobile scaffold** (2026-04-18 → 2026-05-09, ~3 weeks) — Auth, first fetch, rename, birth-data wizard, horoscope, chart, Oracle, infra batch. **Exit criterion:** TestFlight build navigates 5 tabs, renders chart, opens Oracle. Closed per documented exit criteria.
- [ ] **Phase B: Mobile parity + Кръг** (OPEN 2026-05-09, substantially advanced as of 2026-08-13, not closed) — Two parallel streams: Stream P ports all missing web features to mobile per `MOBILE-WEB-PARITY-GAP.md` — most of it now shipped (Днес, Карта, Ритъм/diary, most of Ти, RevenueCat SDK plumbing); remaining work (Кръг port, subscription/paywall UI, push delivery) sequenced as a batch ledger in `.planning/COMPLETION-TRACKER.md`. Stream K ports Кръг features as friend ships them on web — superseded 2026-08-04, now folded into Stream P's Кръг-port batch (see `STREAM-K-PORT-LOG.md`). Soft-launch quality bar reframed 2026-05-09 to **full web parity less Friends groups (deferred to future research)**. **Soft-launch milestone** at end of Phase B: TestFlight + Google Play internal track, 50–100 Bulgarian users.
- [ ] **Phase C: Remaining premium features** (~8–12 weeks) — Crush reports, couples linked, yearly forecast, deep synastry, **Friends groups research**. Native retention plumbing: home-screen widgets, biometric anchored quick-open, expanded notification taxonomy.
- [ ] **Phase D: Web reposition** — Bulgarian SEO acquisition funnel, shareable chart surfaces, desktop becomes read-only-ish, Oracle chat remains on web.

### Phase A — Mobile scaffold (COMPLETE)

**Goal:** Native iOS app reachable in Expo Go on real iPhone with the chart-and-Oracle clauses of the TestFlight DOD satisfied, plus the launch-readiness infra additions per `MOBILE_UX_RESEARCH.md §13.5`.

**Sub-round trail:** SR 1 (auth foundation) → SR 2 (first fetch) → SR 3 (Stellaeum rename) → SR 4 (birth-data wizard) → SR 5 (chart calc + horoscope + Bulgarian copy audit) → SR 6 (chart visualization) → SR 7 (mobile Oracle) → SR 8 (launch-readiness infra: Sentry + feature flags + push permission scaffold). SR 9 (EAS Dev Client + TestFlight + biometric, bundled per REVISIT-1) deferred to Phase B close.

**Outcome:** Chart-bearing users on iOS open Oracle from any tab, browse saved readings instantly from cache, generate fresh readings on tap, hit the daily cap with a clear Bulgarian text notice, and return through the topic grid. Sentry receives errors with `errorId` tags. Feature-flag kill switches gate the three AI features (Днес hero, Oracle, push). Push permission scaffold prompts after first successful Oracle reading with bulgarian-skill-calibrated copy, stashes token in AsyncStorage on grant.

**Sub-round close docs:** `.planning/phases/phase-a-mobile-scaffold/SUB-ROUND-{1,2,3,4,7,8}-CLOSE.md`. (5 and 6 are documented in the SR 6 handoff doc rather than dedicated close summaries.)

### Phase B — Mobile parity + Кръг (OPEN, substantially advanced 2026-08-13)

**Status correction 2026-08-13:** the "Stream P sub-round investigation... Awaiting founder ratification before any code commits" line below is stale — ratification happened and most of Stream P (batches P.1 through P.10 per the parity doc) has since shipped. See `.planning/phases/phase-b-mobile-parity/MOBILE-WEB-PARITY-GAP.md` for the row-by-row state and `.planning/COMPLETION-TRACKER.md` for the current batch ledger driving what's left. The narrative below is kept for historical context on how Phase B was originally scoped, not as a live status.

**Goal:** Soft-launch invites go out to 50–100 Bulgarian users on a mobile app at FULL web parity (less Friends groups, deferred to future research). One complete revenue loop validated end-to-end via the soft-launch milestone — install → birth data → use the full feature surface (chart, Oracle, daily horoscope with streaming, lunar diary, recommendations, crystals collection, astrology guide, Кръг compatibility, paid features) → convert to premium via RevenueCat → receive push notifications at the user's pattern-time. **Soft-launch milestone closes Phase B.**

**Two parallel streams** per founder ratification 2026-05-09:

- **Stream P (Parity)** — port all missing web features to mobile per `.planning/phases/phase-b-mobile-parity/MOBILE-WEB-PARITY-GAP.md`. Single source of truth for Stream P scope, status tracked per-item. Toni's primary work.
- **Stream K (Кръг)** — port Кръг features as friend ships them on web. Per-port reactive investigation pass when each feature lands. Sequence dictated by friend's web shipping order. Friends groups deferred to future research.

**Soft-launch milestone (end of Phase B):**

- TestFlight internal beta + Google Play internal track open
- 50–100 Bulgarian users invited (founder network + targeted recruitment)
- Real push delivery, real RevenueCat purchases, real synastry feedback, real diary use, real recommendations engagement collected before GA
- SR 9 (EAS Dev Client + TestFlight provisioning + biometric `expo-local-authentication`, bundled per REVISIT-1) fires alongside the soft-launch cut as Stream P P.17
- Apple Developer Program enrollment must complete before P.17 (founder track during Stream P middle weeks)

**Carry-forward from Phase A close:**

- REVISIT-25 (RevenueCat code-side scaffold) lands in Stream P P.15 (renamed from "Phase B opener" — RevenueCat sequencing depends on parity work order)
- REVISIT-26 (push_tokens schema + RLS + registration endpoint) lands in Stream P P.16
- REVISIT-27 (Expo Go push token retrieval verification) closes when P.17's Dev Client build lands
- Telemetry vendor wiring (PostHog selected at Phase A close ratification) opens Stream P P.13 with the 10-event taxonomy from `phase-b-mobile-parity/HANDOFF-2026-05-09.md`
- REVISIT-23 (web Oracle cap-reached silent failure) — promoted to active scope as Stream P web-touching item; founder + friend coordination required

**Stream P sub-round investigation:** initial layering surfaced 2026-05-09 (~18 sub-rounds covering Днес/Карта/Ритъм/Ти tab parity batches + sub-routes + infra + SR 9 + soft-launch verification). Awaiting founder ratification before any code commits. See `phase-b-mobile-parity/HANDOFF-2026-05-09.md` and the parity gap inventory.

**Stream K sub-round investigation:** NOT pre-planned. Friend's coordination conversation (gating Stream P start) also informs Stream K shipping order expectations. Per-port log lives at `phase-b-mobile-parity/STREAM-K-PORT-LOG.md` (created when first Кръг port lands).

### Phase C — Remaining premium features

**Goal:** Five additional paid wedges shipping post-soft-launch, plus native retention plumbing (widgets, biometric-anchored quick-open, expanded notification taxonomy). Out of scope for now; detailed planning at Phase B close.

### Phase D — Web reposition

**Goal:** Web becomes a Bulgarian SEO content acquisition funnel + read-only chart viewer + Oracle chat surface, complementing the native apps as primary product. Detailed planning at Phase C close. Pre-launch gates from `.planning/PRE_LAUNCH_PREREQS.md` cluster here (telemetry post-launch tuning, color-contrast audit, GDPR/ToS final pass).

### Phase A trail timestamps

*Phase A planned: 2026-04-18*
*SR 1 (auth foundation) complete: 2026-05-03*
*SR 2 (first fetch) complete: 2026-05-03*
*SR 3 (Stellaeum rename) complete: 2026-05-03*
*SR 4 (birth-data wizard) complete: 2026-05-07*
*SR 5 (chart calc + horoscope + Bulgarian copy audit) complete: 2026-05-08*
*SR 6 (chart visualization) complete: 2026-05-08*
*SR 7 (mobile Oracle) complete: 2026-05-09*
*SR 8 (launch-readiness infra) complete: 2026-05-09*
*Phase A close ratification: 2026-05-09*
*Milestone: v1.0 mobile-led launch — Phase B substantially advanced as of 2026-08-13, see COMPLETION-TRACKER.md*
