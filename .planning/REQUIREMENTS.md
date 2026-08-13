# Requirements: Stellaeum AI

**Defined:** 2026-01-21
**Refreshed 2026-08-13 — see git history for the prior stale snapshot.** LAND/BIRTH/AI/DAILY/PAY/most SEC items sat marked "Pending" through Phases 3, 5, 6, 7, and 8 actually shipping; see `.planning/VERIFICATION-SURFACE-GAPS.md` item 4. Checkboxes below verified against `.planning/ROADMAP.md`'s phase-close docs and, where cheap, against the live code — not flipped from the phase number alone. See `.planning/COMPLETION-TRACKER.md` for the continuously-verified view.
**Core Value:** Users return daily for precise, personalized readings that feel like wisdom from a knowledgeable friend who happens to know the stars.

## v0.1 Requirements

Requirements for MVP web launch. Each maps to roadmap phases.

### Landing & Marketing

- [x] **LAND-01**: User sees landing page with stars background and placeholder motto
- [x] **LAND-02**: User sees pricing comparison (free vs premium features)
- [x] **LAND-03**: User sees feature showcase explaining app value
- [x] **LAND-04**: User can navigate to login or registration from landing

### Authentication

- [x] **AUTH-01**: User can register with email and password
- [x] **AUTH-02**: User receives email verification after signup
- [x] **AUTH-03**: User can log in with email and password
- [x] **AUTH-04**: User can reset password via email link (web only — Clerk's stock `<SignIn>` component includes this for free. Mobile uses fully custom auth screens on `useSignIn`/`useSignUp` and has no forgot-password screen or link anywhere in `(public)`. Corrected 2026-08-04, see CHECKPOINT-2026-08-04.md §3.)
- [x] **AUTH-05**: User session persists across browser refresh
- [x] **AUTH-06**: User can log out

### Birth Data

- [x] **BIRTH-01**: User can enter birth date
- [x] **BIRTH-02**: User can enter birth time (with "unknown" option)
- [x] **BIRTH-03**: User can search and select Bulgarian city/village
- [x] **BIRTH-04**: System resolves city to latitude/longitude coordinates
- [x] **BIRTH-05**: Birth data is encrypted at rest in database (Supabase-managed at-rest encryption)
- [x] **BIRTH-06**: User can edit their birth data

### Natal Chart

- [x] **CHART-01**: System calculates natal chart via Swiss Ephemeris (server-side)
- [x] **CHART-02**: User sees interactive natal chart visualization
- [x] **CHART-03**: User can tap planets to see interpretation
- [x] **CHART-04**: User sees Big Three (Sun, Moon, Rising) prominently
- [x] **CHART-05**: Chart displays all 10 major planets with positions

### AI Oracle

- [x] **AI-01**: User sees AI-generated interpretation with their chart
- [x] **AI-02**: Free users get general personality reading
- [x] **AI-03**: Premium users can request love/relationships reading
- [x] **AI-04**: Premium users can request career/purpose reading
- [x] **AI-05**: Premium users can request health/wellness reading
- [x] **AI-06**: AI readings cite specific degree positions

### Daily Horoscope

- [x] **DAILY-01**: User sees daily horoscope personalized to their chart
- [x] **DAILY-02**: Horoscope updates each day
- [x] **DAILY-03**: User can view yesterday's horoscope
- [x] **DAILY-04**: User receives morning push notification with horoscope (web Web Push delivery live via `cron/daily-horoscope`; mobile Expo push delivery still open — scaffold only, no end-to-end wiring, see `.planning/COMPLETION-TRACKER.md`)

### Payments

- [x] **PAY-01**: User can view premium subscription options
- [x] **PAY-02**: User can purchase subscription via Stripe
- [x] **PAY-03**: System grants premium access after successful payment
- [x] **PAY-04**: User can cancel subscription
- [x] **PAY-05**: System revokes premium access after subscription ends

### Privacy & Security - Core

- [x] **SEC-01**: All PII transmitted over HTTPS
- [x] **SEC-02**: Birth data encrypted at rest (database-level, Supabase-managed)
- [x] **SEC-03**: Privacy policy accessible from landing and settings
- [x] **SEC-04**: User can request data export (GDPR) — web + mobile, see `apps/web/app/api/gdpr/export`
- [x] **SEC-05**: User can request account deletion (GDPR) — web + mobile, 30-day grace period, see `apps/web/app/api/gdpr/delete-account`

### Privacy & Security - Database

- [~] **SEC-06**: RLS (Row Level Security) enabled on ALL tables containing user data — one known gap open, see `.planning/SECURITY-MODEL.md`: `crystal_recommendations` has RLS disabled in production (not currently exploitable — service-role-only access path — but the fix migration is written and not yet applied)
- [x] **SEC-07**: RLS policies use JWT claims for user identification
- [~] **SEC-08**: No table allows public access without RLS policy — same `crystal_recommendations` gap as SEC-06

### Privacy & Security - Authentication

- [x] **SEC-09**: Rate limiting on sign-in attempts (Clerk built-in)
- [x] **SEC-10**: Rate limiting on verification attempts (Clerk built-in)
- [x] **SEC-11**: All protected routes use auth.protect() middleware
- [x] **SEC-12**: Session tokens are HttpOnly, Secure, SameSite cookies

### Privacy & Security - Application

- [x] **SEC-13**: Content Security Policy (CSP) headers configured
- [x] **SEC-14**: X-Frame-Options: DENY header (prevent clickjacking)
- [x] **SEC-15**: X-Content-Type-Options: nosniff header
- [x] **SEC-16**: Referrer-Policy: strict-origin-when-cross-origin header
- [x] **SEC-17**: All API routes validate authentication before processing
- [x] **SEC-18**: Input validation on all user-submitted data (Zod schemas)

### Privacy & Security - Data Protection

- [x] **SEC-19**: No PII sent to analytics or third-party services — PostHog never installed (see `.planning/PRE_LAUNCH_PREREQS.md`); Sentry runs with `sendDefaultPii: false` on both platforms
- [x] **SEC-20**: Audit logging for sensitive operations — `logAuditEvent` calls throughout `apps/web/app/api/**`
- [~] **SEC-21**: Database backups encrypted — [inferred] Supabase platform default, not independently re-verified this pass

### UI/UX

- [x] **UI-01**: App uses "cosmic glassmorphism" dark theme
- [x] **UI-02**: All UI text in Bulgarian
- [x] **UI-03**: Responsive design works on desktop and mobile browsers

## v1.0 Requirements

Deferred to full release after MVP validation.

### iOS App

- **IOS-01**: iOS app available on TestFlight
- **IOS-02**: Native iOS push notifications
- **IOS-03**: RevenueCat IAP integration
- **IOS-04**: Biometric authentication (Face ID / Touch ID)

### Localization

- **LOC-01**: English language UI
- **LOC-02**: Language switcher in settings

### Advanced Features

- **ADV-01**: Journal feature for mood tracking
- **ADV-02**: Compatibility/synastry charts
- **ADV-03**: Advanced transit alerts (beyond morning horoscope)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Android app | Deferred until iOS validated |
| Live astrologer chat | High operational cost, AI Oracle covers this |
| Gamification/streaks | Growth feature, not core value |
| Shareable quote images | Social loop, add after user base exists |
| Ads integration | Unnecessary complexity for free tier |
| Multiple house systems | Placidus only for MVP, add later |
| Live transit tracking | Realtime feature for later milestone |
| Tarot integration | Scope creep, not core astrology value |
| Social features/community | Moderation complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAND-01 | Phase 8 | Complete |
| LAND-02 | Phase 8 | Complete |
| LAND-03 | Phase 8 | Complete |
| LAND-04 | Phase 8 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete (web only — mobile gap, see line 22) |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 2 | Complete |
| BIRTH-01 | Phase 3 | Complete |
| BIRTH-02 | Phase 3 | Complete |
| BIRTH-03 | Phase 3 | Complete |
| BIRTH-04 | Phase 3 | Complete |
| BIRTH-05 | Phase 3 | Complete |
| BIRTH-06 | Phase 3 | Complete |
| CHART-01 | Phase 4 | Complete |
| CHART-02 | Phase 4 | Complete |
| CHART-03 | Phase 4 | Complete |
| CHART-04 | Phase 4 | Complete |
| CHART-05 | Phase 4 | Complete |
| AI-01 | Phase 5 | Complete |
| AI-02 | Phase 5 | Complete |
| AI-03 | Phase 5 | Complete |
| AI-04 | Phase 5 | Complete |
| AI-05 | Phase 5 | Complete |
| AI-06 | Phase 5 | Complete |
| DAILY-01 | Phase 6 | Complete |
| DAILY-02 | Phase 6 | Complete |
| DAILY-03 | Phase 6 | Complete |
| DAILY-04 | Phase 6 | Complete (web); mobile delivery open, see COMPLETION-TRACKER.md |
| PAY-01 | Phase 7 | Complete |
| PAY-02 | Phase 7 | Complete |
| PAY-03 | Phase 7 | Complete |
| PAY-04 | Phase 7 | Complete |
| PAY-05 | Phase 7 | Complete |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 3 | Complete |
| SEC-03 | Phase 8 | Complete |
| SEC-04 | Phase 8 | Complete |
| SEC-05 | Phase 8 | Complete |
| SEC-06 | Phase 3 | One gap open — see SECURITY-MODEL.md |
| SEC-07 | Phase 3 | Complete |
| SEC-08 | Phase 3 | One gap open — see SECURITY-MODEL.md |
| SEC-09 | Phase 2 | Complete |
| SEC-10 | Phase 2 | Complete |
| SEC-11 | Phase 2 | Complete |
| SEC-12 | Phase 2 | Complete |
| SEC-13 | Phase 1 | Complete |
| SEC-14 | Phase 1 | Complete |
| SEC-15 | Phase 1 | Complete |
| SEC-16 | Phase 1 | Complete |
| SEC-17 | Phase 2 | Complete |
| SEC-18 | Phase 3 | Complete |
| SEC-19 | Phase 3 | Complete |
| SEC-20 | Phase 8 | Complete |
| SEC-21 | Phase 3 | Complete (inferred, platform default) |
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 1 | Complete |
| UI-03 | Phase 1 | Complete |

**Coverage:**
- v0.1 requirements: 54 total
- Mapped to phases: 54
- Unmapped: 0
- Complete: 52 of 54; 2 with a known open gap (SEC-06/SEC-08, `crystal_recommendations` RLS — see SECURITY-MODEL.md); DAILY-04 complete on web with mobile delivery still open

---
*Requirements defined: 2026-01-21*
*Last updated: 2026-01-25 after Phase 2 completion*
*Refreshed: 2026-08-13 — see header note*
