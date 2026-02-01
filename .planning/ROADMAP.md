# Roadmap: Celestia AI v0.1

## Overview

Celestia AI v0.1 delivers a web-first Bulgarian astrology MVP. The journey starts with monorepo foundation and security headers, progresses through authentication and birth data collection, builds the core astrology engine with interactive charts, layers AI-powered readings and daily horoscopes, integrates Stripe payments, and concludes with landing page polish and GDPR compliance. Eight phases, 54 requirements, zero enterprise theater.

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
- [ ] **Phase 4: Astrology Engine & Charts** - Swiss Ephemeris server-side, interactive visualization
- [ ] **Phase 5: AI Oracle** - AI-powered personalized readings with tier restrictions
- [ ] **Phase 6: Daily Horoscope** - Personalized daily content with push notifications
- [ ] **Phase 7: Payments** - Stripe integration, subscription lifecycle management
- [ ] **Phase 8: Launch Prep** - Landing page, GDPR compliance, audit logging, final polish

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
- [x] 02-02-PLAN.md — Combined auth page (/auth) with cosmic background and Celestia branding
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
- [x] 03-01-PLAN.md — @celestia/db package with Drizzle schema, RLS policies, Supabase client factory
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
- [ ] User with birth data sees calculated natal chart within seconds of request
- [ ] Chart visualization shows all 10 planets positioned correctly
- [ ] User can tap/click any planet to see interpretation popup
- [ ] Big Three (Sun, Moon, Rising) are visually prominent above other planets
- [ ] Chart renders correctly on both desktop and mobile viewports

**Research**: Complete (04-RESEARCH.md)
**Plans**: 4 plans in 4 waves

Plans:
- [ ] 04-01-PLAN.md — @celestia/astrology package with sweph bindings and calculation utilities
- [ ] 04-02-PLAN.md — Chart calculation API route with database caching
- [ ] 04-03-PLAN.md — Interactive chart visualization with D3.js and Big Three cards
- [ ] 04-04-PLAN.md — Planet interpretation popups with placeholder text

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

**Research**: Likely (AI prompt engineering, tier-based access)
**Research topics**: Gemini/GPT-5 API integration, prompt engineering for astrological accuracy, caching strategy
**Plans**: TBD

Plans:
- [ ] 05-01: AI service integration (Gemini/GPT-5) with prompt templates
- [ ] 05-02: General reading generation for all users
- [ ] 05-03: Premium topic readings (love, career, health) with tier gate

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

**Research**: Likely (transit calculations, web push notifications)
**Research topics**: Daily transit calculation approach, caching strategy, Web Push API for browser notifications
**Plans**: TBD

Plans:
- [ ] 06-01: Daily transit calculation and horoscope generation
- [ ] 06-02: Horoscope display with yesterday navigation
- [ ] 06-03: Web push notification setup for morning delivery

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

**Research**: Likely (Stripe subscription webhooks)
**Research topics**: Stripe Checkout integration, webhook handling for subscription lifecycle, subscription_tier database updates
**Plans**: TBD

Plans:
- [ ] 07-01: Stripe products/prices setup and checkout integration
- [ ] 07-02: Webhook handling for subscription lifecycle events
- [ ] 07-03: Subscription management UI (status, cancel)

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

**Research**: Unlikely (established patterns)
**Plans**: TBD

Plans:
- [ ] 08-01: Landing page with hero, pricing comparison, feature showcase
- [ ] 08-02: Privacy policy page and GDPR request handling
- [ ] 08-03: Audit logging implementation for sensitive operations

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
| 4. Astrology Engine & Charts | 0/4 | Planned | - |
| 5. AI Oracle | 0/3 | Not started | - |
| 6. Daily Horoscope | 0/3 | Not started | - |
| 7. Payments | 0/3 | Not started | - |
| 8. Launch Prep | 0/3 | Not started | - |

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
*Milestone: v0.1 MVP*
