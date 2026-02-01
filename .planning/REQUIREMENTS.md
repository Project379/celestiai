# Requirements: Celestia AI

**Defined:** 2026-01-21
**Core Value:** Users return daily for precise, personalized readings that feel like wisdom from a knowledgeable friend who happens to know the stars.

## v0.1 Requirements

Requirements for MVP web launch. Each maps to roadmap phases.

### Landing & Marketing

- [ ] **LAND-01**: User sees landing page with stars background and placeholder motto
- [ ] **LAND-02**: User sees pricing comparison (free vs premium features)
- [ ] **LAND-03**: User sees feature showcase explaining app value
- [ ] **LAND-04**: User can navigate to login or registration from landing

### Authentication

- [x] **AUTH-01**: User can register with email and password
- [x] **AUTH-02**: User receives email verification after signup
- [x] **AUTH-03**: User can log in with email and password
- [x] **AUTH-04**: User can reset password via email link
- [x] **AUTH-05**: User session persists across browser refresh
- [x] **AUTH-06**: User can log out

### Birth Data

- [ ] **BIRTH-01**: User can enter birth date
- [ ] **BIRTH-02**: User can enter birth time (with "unknown" option)
- [ ] **BIRTH-03**: User can search and select Bulgarian city/village
- [ ] **BIRTH-04**: System resolves city to latitude/longitude coordinates
- [ ] **BIRTH-05**: Birth data is encrypted at rest in database
- [ ] **BIRTH-06**: User can edit their birth data

### Natal Chart

- [x] **CHART-01**: System calculates natal chart via Swiss Ephemeris (server-side)
- [x] **CHART-02**: User sees interactive natal chart visualization
- [x] **CHART-03**: User can tap planets to see interpretation
- [x] **CHART-04**: User sees Big Three (Sun, Moon, Rising) prominently
- [x] **CHART-05**: Chart displays all 10 major planets with positions

### AI Oracle

- [ ] **AI-01**: User sees AI-generated interpretation with their chart
- [ ] **AI-02**: Free users get general personality reading
- [ ] **AI-03**: Premium users can request love/relationships reading
- [ ] **AI-04**: Premium users can request career/purpose reading
- [ ] **AI-05**: Premium users can request health/wellness reading
- [ ] **AI-06**: AI readings cite specific degree positions

### Daily Horoscope

- [ ] **DAILY-01**: User sees daily horoscope personalized to their chart
- [ ] **DAILY-02**: Horoscope updates each day
- [ ] **DAILY-03**: User can view yesterday's horoscope
- [ ] **DAILY-04**: User receives morning push notification with horoscope

### Payments

- [ ] **PAY-01**: User can view premium subscription options
- [ ] **PAY-02**: User can purchase subscription via Stripe
- [ ] **PAY-03**: System grants premium access after successful payment
- [ ] **PAY-04**: User can cancel subscription
- [ ] **PAY-05**: System revokes premium access after subscription ends

### Privacy & Security - Core

- [x] **SEC-01**: All PII transmitted over HTTPS
- [ ] **SEC-02**: Birth data encrypted at rest (database-level)
- [ ] **SEC-03**: Privacy policy accessible from landing and settings
- [ ] **SEC-04**: User can request data export (GDPR)
- [ ] **SEC-05**: User can request account deletion (GDPR)

### Privacy & Security - Database

- [ ] **SEC-06**: RLS (Row Level Security) enabled on ALL tables containing user data
- [ ] **SEC-07**: RLS policies use JWT claims for user identification
- [ ] **SEC-08**: No table allows public access without RLS policy

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
- [ ] **SEC-18**: Input validation on all user-submitted data (Zod schemas)

### Privacy & Security - Data Protection

- [ ] **SEC-19**: No PII sent to analytics or third-party services
- [ ] **SEC-20**: Audit logging for sensitive operations
- [ ] **SEC-21**: Database backups encrypted

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
| LAND-01 | Phase 8 | Pending |
| LAND-02 | Phase 8 | Pending |
| LAND-03 | Phase 8 | Pending |
| LAND-04 | Phase 8 | Pending |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 2 | Complete |
| BIRTH-01 | Phase 3 | Pending |
| BIRTH-02 | Phase 3 | Pending |
| BIRTH-03 | Phase 3 | Pending |
| BIRTH-04 | Phase 3 | Pending |
| BIRTH-05 | Phase 3 | Pending |
| BIRTH-06 | Phase 3 | Pending |
| CHART-01 | Phase 4 | Complete |
| CHART-02 | Phase 4 | Complete |
| CHART-03 | Phase 4 | Complete |
| CHART-04 | Phase 4 | Complete |
| CHART-05 | Phase 4 | Complete |
| AI-01 | Phase 5 | Pending |
| AI-02 | Phase 5 | Pending |
| AI-03 | Phase 5 | Pending |
| AI-04 | Phase 5 | Pending |
| AI-05 | Phase 5 | Pending |
| AI-06 | Phase 5 | Pending |
| DAILY-01 | Phase 6 | Pending |
| DAILY-02 | Phase 6 | Pending |
| DAILY-03 | Phase 6 | Pending |
| DAILY-04 | Phase 6 | Pending |
| PAY-01 | Phase 7 | Pending |
| PAY-02 | Phase 7 | Pending |
| PAY-03 | Phase 7 | Pending |
| PAY-04 | Phase 7 | Pending |
| PAY-05 | Phase 7 | Pending |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 3 | Pending |
| SEC-03 | Phase 8 | Pending |
| SEC-04 | Phase 8 | Pending |
| SEC-05 | Phase 8 | Pending |
| SEC-06 | Phase 3 | Pending |
| SEC-07 | Phase 3 | Pending |
| SEC-08 | Phase 3 | Pending |
| SEC-09 | Phase 2 | Complete |
| SEC-10 | Phase 2 | Complete |
| SEC-11 | Phase 2 | Complete |
| SEC-12 | Phase 2 | Complete |
| SEC-13 | Phase 1 | Complete |
| SEC-14 | Phase 1 | Complete |
| SEC-15 | Phase 1 | Complete |
| SEC-16 | Phase 1 | Complete |
| SEC-17 | Phase 2 | Complete |
| SEC-18 | Phase 3 | Pending |
| SEC-19 | Phase 3 | Pending |
| SEC-20 | Phase 8 | Pending |
| SEC-21 | Phase 3 | Pending |
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 1 | Complete |
| UI-03 | Phase 1 | Complete |

**Coverage:**
- v0.1 requirements: 54 total
- Mapped to phases: 54
- Unmapped: 0

---
*Requirements defined: 2026-01-21*
*Last updated: 2026-01-25 after Phase 2 completion*
