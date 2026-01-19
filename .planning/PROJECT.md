# Celestia AI

## What This Is

A premium, subscription-based astrology application for the Bulgarian market. Combines Swiss Ephemeris astronomical precision with AI-powered personalized readings, delivered through Web and iOS from a single universal codebase. The experience is sophisticated and grounded — serious insight without being heavy, engaging without being frivolous.

## Core Value

Users return daily for precise, personalized readings that feel like wisdom from a knowledgeable friend who happens to know the stars.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Universal authentication (Clerk) with Web cookies + iOS tokens
- [ ] Birth data input with Bulgarian city/village coordinates
- [ ] Natal chart generation via Swiss Ephemeris (swisseph-wasm, server-side)
- [ ] Interactive star chart visualization (Skia on iOS, D3/Canvas on web)
- [ ] AI Oracle readings (Gemini/GPT-5) with precise degree citations
- [ ] Bulgarian + English language support
- [ ] "Cosmic glassmorphism" UI theme (dark backgrounds, glass effects)
- [ ] Daily cosmic weather push notifications (iOS)
- [ ] Freemium model: basic chart free, premium features €9.99/mo
- [ ] Web payments via Stripe
- [ ] iOS payments via RevenueCat (IAP)
- [ ] Web app deployment
- [ ] iOS TestFlight build

### Out of Scope

- Android app — deferred until iOS validated
- Synastry (compatibility charts) — post-MVP feature
- Daily streak system / gamification — growth feature, not launch
- Shareable quote images — social loop, add after user base exists
- Ads integration — unnecessary complexity for free tier at launch
- Multiple house systems — ship with Placidus only, add Koch/Whole Sign later
- Live transit tracking — realtime feature for later milestone

## Context

- **Market**: Bulgaria adopted Euro on Jan 1, 2026. Pricing in EUR.
- **Cultural**: Subtle nod to Bulgarian spiritual heritage (Petar Dunov/White Brotherhood) in tone, not explicit branding. The AI should feel wise and supportive, not mystical or dramatic.
- **Tone**: Serious but warm. Not pop-astrology ("Mercury retrograde ruined my life!"), not clinical either. Think: insightful friend with deep knowledge.
- **Technical baseline**: PRD and implementation docs exist in `/docs/` with detailed architectural decisions.
- **Accounts needed**: Apple Developer, Stripe, Supabase, RevenueCat, Clerk — none set up yet.

## Constraints

- **Tech stack**: Turborepo monorepo, Solito (Next.js 15 + Expo SDK 52), Clerk, Supabase, Drizzle ORM, NativeWind v4, swisseph-wasm — already decided per PRD
- **Platform priority**: iOS first for mobile beta (TestFlight), Android follows
- **WASM placement**: Swiss Ephemeris calculations run server-side via API routes, not in mobile bundle
- **Localization**: Bulgarian (Cyrillic) as primary, English as secondary

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web + iOS for MVP, Android deferred | Faster validation, iOS has cleaner beta process | — Pending |
| Stripe + RevenueCat split | Stripe handles web, RevenueCat handles IAP complexity | — Pending |
| Server-side WASM | Keep mobile bundle lean, calculations are heavy | — Pending |
| Placidus-only house system | Simplify MVP, most common system in Bulgaria | — Pending |
| Skip ads at launch | Complexity not worth it for free tier initially | — Pending |

---
*Last updated: 2026-01-19 after initialization*
