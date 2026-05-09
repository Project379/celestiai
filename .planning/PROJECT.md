# Stellaeum AI

## What This Is

A premium, subscription-based astrology application for the Bulgarian market. Combines Swiss Ephemeris astronomical precision with AI-powered personalized readings. The experience is sophisticated and grounded — serious insight without being heavy, engaging without being frivolous.

## Core Value

Users return daily for precise, personalized readings that feel like wisdom from a knowledgeable friend who happens to know the stars.

## Current Milestone: v1.0 — mobile-led launch

**Status (as of 2026-05-09):** v0.1 web MVP complete (M1–M4 + supporting workstreams §7–§10). Phase A of the mobile-launch track is complete pending close ratification — chart visualization (SR 6) and Oracle (SR 7) ship on iOS via Expo Go, and the launch-readiness infra (SR 8) added Sentry, feature-flag kill switches, and the push notification permission scaffold. Phase B opens next with the Кръг native-primary work, paywall, and soft-launch milestone.

**Phase landscape** (per `.planning/research/MOBILE_UX_RESEARCH.md §10`):

- **Phase A — Mobile scaffold (~2 weeks, COMPLETE).** Auth, first fetch, rename, birth-data wizard, horoscope, chart, Oracle, infra batch (Sentry + feature flags + push perms). Exit criterion: TestFlight build navigates 5 tabs, renders chart, opens Oracle. ✓.
- **Phase B — Кръг native-primary (~4–6 weeks, NEXT).** Add-person flow, synastry calc API, free Sun/Moon/Rising compatibility, first paid feature «Днешен ден в твоя кръг», RevenueCat paywall, push at user pattern-time. **Soft-launch milestone:** TestFlight + Google Play internal track, 50–100 Bulgarian users at end of Phase B. SR 9 (EAS Dev Client + TestFlight + biometric, bundled per REVISIT-1) fires at end of Phase B alongside soft launch.
- **Phase C — Remaining 5 premium features (~8–12 weeks).** Crush reports, couples linked, friends groups, yearly forecast, deep synastry. Native-only retention wedges: home-screen widgets, biometric auth, expanded notification taxonomy.
- **Phase D — Web reposition.** Bulgarian SEO content acquisition funnel, shareable chart surfaces, desktop becomes read-only-ish, Oracle chat remains on web.

**v0.1 web milestone (M1–M4, COMPLETE 2026-02-19):** landing page, auth, birth chart + AI Oracle, daily horoscope, Stripe payments. Detailed phase trail in `.planning/ROADMAP.md` v0.1 section.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Landing page with stars background, pricing comparison, free vs premium features
- [ ] Secure authentication via Clerk (web cookies)
- [ ] User registration and login flows
- [ ] Birth data input (date, time, location) with Bulgarian city/village coordinates
- [ ] Encrypted birth data storage (at rest and in transit)
- [ ] Natal chart generation via Swiss Ephemeris (swisseph-wasm, server-side)
- [ ] Interactive natal chart visualization (D3.js/Canvas, tap-to-explore)
- [ ] AI Oracle readings (Gemini/GPT-5) displayed with chart
- [ ] Topic-restricted AI: free=general, premium=love/career/health
- [ ] Daily personalized horoscope based on natal chart
- [ ] Basic push notifications (morning horoscope)
- [ ] Freemium model with €9.99/mo premium tier
- [ ] Stripe web payments integration
- [ ] GDPR-compliant data handling and privacy policy
- [ ] Bulgarian language UI
- [ ] "Cosmic glassmorphism" UI theme (dark backgrounds, glass effects)
- [ ] Web app deployment

### Out of Scope (for v0.1, now folded into v1.0 mobile-launch)

- iOS app — Phase A complete (Expo SDK 54, Clerk auth, chart visualization, Oracle screen). TestFlight cut at end of Phase B per soft-launch milestone.
- iOS payments (RevenueCat/IAP) — Phase B opener (REVISIT-25 logs the deferred SDK install + dashboard config in parallel).
- Synastry (compatibility charts) — Phase B core feature (Кръг native-primary).
- Android app — initial track is iOS via TestFlight; Google Play internal track joins at Phase B soft launch.

### Out of Scope (still deferred)

- English localization — Bulgarian-only through Phase D.
- Journal feature — post-launch engagement.
- Daily streak system / gamification — growth feature, not launch.
- Shareable quote images — social loop, add after user base exists.
- Ads integration — unnecessary complexity for free tier at launch.
- Multiple house systems — ship with Placidus only, add Koch/Whole Sign later.
- Live transit tracking — realtime feature for later milestone.
- Advanced transit alerts — daily horoscope + lunar phase events only through Phase B; richer notification taxonomy lands in Phase C.

## Context

- **Market**: Bulgaria adopted Euro on Jan 1, 2026. Pricing in EUR.
- **Cultural**: Subtle nod to Bulgarian spiritual heritage (Petar Dunov/White Brotherhood) in tone, not explicit branding. The AI should feel wise and supportive, not mystical or dramatic.
- **Tone**: Serious but warm. Not pop-astrology ("Mercury retrograde ruined my life!"), not clinical either. Think: insightful friend with deep knowledge.
- **Technical baseline**: PRD and implementation docs exist in `/docs/` with detailed architectural decisions.
- **Accounts needed**: Stripe, Supabase, Clerk — need to set up for web MVP.
- **Privacy positioning**: Security and privacy-first is a competitive differentiator vs Co-Star and others.

## Constraints

- **Tech stack**: Turborepo monorepo, Next.js 15, Clerk, Supabase, Drizzle ORM, NativeWind v4, swisseph-wasm — already decided per PRD
- **Platform**: Web-first for v0.1, iOS follows in v1.0
- **WASM placement**: Swiss Ephemeris calculations run server-side via API routes only
- **Localization**: Bulgarian only for v0.1
- **Security**: All PII (birth data, auth) encrypted at rest and in transit; GDPR compliant; no data shared with third parties; clear privacy policy; audit-ready logging

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web-first for v0.1 | Faster validation, simpler deployment, no App Store review | — Pending |
| Bulgarian-only for v0.1 | Focus on target market, reduce localization scope | — Pending |
| Topic-restricted freemium | Free=general reading, Premium=life areas; proves value before paywall | — Pending |
| Interactive chart in v0.1 | Tap-to-explore adds polish and engagement, worth the effort | — Pending |
| Privacy-first positioning | Differentiator vs Co-Star; GDPR compliance; trust-building | — Pending |
| Server-side WASM | Keep bundle lean, calculations are heavy | — Pending |
| Placidus-only house system | Simplify MVP, most common system in Bulgaria | — Pending |
| Basic push only | Morning horoscope notification; no complex transit alerts for v0.1 | — Pending |

---
*Last updated: 2026-05-09 after Phase A close (mobile scaffold)*
*Previous: 2026-01-21 after v0.1 milestone definition*
