# Celestia AI

## What This Is

A premium, subscription-based astrology application for the Bulgarian market. Combines Swiss Ephemeris astronomical precision with AI-powered personalized readings. The experience is sophisticated and grounded — serious insight without being heavy, engaging without being frivolous.

## Core Value

Users return daily for precise, personalized readings that feel like wisdom from a knowledgeable friend who happens to know the stars.

## Current Milestone: v0.1 MVP

**Goal:** Validate the concept with a web-first Bulgarian MVP — landing page, auth, birth chart + AI Oracle, daily horoscope, and Stripe payments.

**Target features:**
- Landing page with pricing comparison and feature showcase
- Secure authentication (Clerk) with GDPR compliance
- Birth data input with Bulgarian city coordinates
- Interactive natal chart + AI Oracle reading (first value moment)
- Daily personalized horoscope with morning push notification
- Freemium paywall: free=general reading, premium=love/career/health
- Stripe web payments (€9.99/mo)

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

### Out of Scope

- iOS app — deferred to v1.0 after web validation
- English localization — add after Bulgarian MVP validated
- iOS payments (RevenueCat/IAP) — comes with iOS app
- Android app — deferred until iOS validated
- Synastry (compatibility charts) — post-MVP feature
- Journal feature — post-MVP engagement feature
- Daily streak system / gamification — growth feature, not launch
- Shareable quote images — social loop, add after user base exists
- Ads integration — unnecessary complexity for free tier at launch
- Multiple house systems — ship with Placidus only, add Koch/Whole Sign later
- Live transit tracking — realtime feature for later milestone
- Advanced transit alerts — basic morning horoscope only for v0.1

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
*Last updated: 2026-01-21 after v0.1 milestone definition*
