# Stellaeum AI

**Refreshed 2026-08-13 — see git history for the prior stale snapshot.** This
file sat frozen at its 2026-05-09 "Phase B opened" status through Phases 3-8
shipping; see `.planning/VERIFICATION-SURFACE-GAPS.md` item 4. For a
continuously-maintained view of what's shipped vs. open, see
`.planning/COMPLETION-TRACKER.md` — this file's narrative sections below are
corrected but are not re-verified on every future change the way the
tracker is.

## What This Is

A premium, subscription-based astrology application for the Bulgarian market. Combines Swiss Ephemeris astronomical precision with AI-powered personalized readings. The experience is sophisticated and grounded — serious insight without being heavy, engaging without being frivolous.

## Core Value

Users return daily for precise, personalized readings that feel like wisdom from a knowledgeable friend who happens to know the stars.

## Current Milestone: v1.0 — mobile-led launch

**Status (as of 2026-08-13):** v0.1 web MVP complete (M1–M4 + supporting workstreams §7–§10). Phase A of the mobile-launch track closed per documented exit criteria. **Phase B (parity + Кръг) is in progress, substantially advanced, not closed** — Stream P has shipped Днес, Карта, Ритъм/lunar diary, most of Ти (crystals, recommendations, guide, GDPR settings), and RevenueCat SDK/identity plumbing (see `.planning/phases/phase-b-mobile-parity/MOBILE-WEB-PARITY-GAP.md`, refreshed 2026-08-13, for the row-by-row state). Still open within Phase B: the full Кръг mobile port (not started, ~2,200 LOC web reference, no design pass done on the web UI it would port from), subscription-management UI on mobile, the RevenueCat paywall/purchase flow, and push notification delivery. See `.planning/COMPLETION-TRACKER.md` for the live batch ledger driving the remaining work.

- **Stream P (Parity):** port all missing web features to mobile per `.planning/phases/phase-b-mobile-parity/MOBILE-WEB-PARITY-GAP.md`. The implicit "v1.0 = chart-and-Oracle-only on mobile" assumption from Phase A's exit criteria was reversed; soft launch invites can't go out to 50–100 Bulgarian users with mobile that's missing diary, recommendations, astrology guide, crystals collection, subscription management, etc. Toni's primary work for the duration of Phase B.
- **Stream K (Кръг):** originally scoped as a reactive per-feature port as web features shipped. Superseded 2026-08-04 — a friend independently built and merged a complete Circle backend+UI to web in one shot (`STREAM-K-PORT-LOG.md` "Port 1"), so this is now a single, larger, from-scratch mobile port against that shipped surface rather than an incremental cadence. Founder ruling 2026-08-13: port against the existing (undesigned) web UI for functional parity now, redesign pass after — do not wait for design. Friends groups still deferred to future research, not in v1.0 scope.

**Phase landscape** (per `.planning/research/MOBILE_UX_RESEARCH.md §10` + 2026-05-09 reframe):

- **Phase A — Mobile scaffold (COMPLETE, ~3 weeks).** Auth, first fetch, rename, birth-data wizard, horoscope, chart, Oracle, infra batch (Sentry + feature flags + push perms). Exit criterion as written: TestFlight build navigates 5 tabs, renders chart, opens Oracle. ✓.
- **Phase B — Mobile parity + Кръг (OPEN, substantially advanced as of 2026-08-13).** Two streams in parallel; most of Stream P has shipped (see status line above and `.planning/COMPLETION-TRACKER.md`). Remaining Stream P/K work is now sequenced as a batch ledger rather than open-ended sub-rounds — see the tracker for the current batch order. **Soft-launch milestone:** TestFlight + Google Play internal track, 50–100 Bulgarian users at end of Phase B, with FULL web parity less Friends groups. SR 9 (EAS Dev Client + TestFlight + biometric, bundled per REVISIT-1) fires at end of Phase B alongside soft launch.
- **Phase C — Remaining premium features (~8–12 weeks).** Crush reports, couples linked, yearly forecast, deep synastry. Native-only retention wedges: home-screen widgets, biometric auth, expanded notification taxonomy. **Friends groups research happens here.**
- **Phase D — Web reposition.** Bulgarian SEO content acquisition funnel, shareable chart surfaces, desktop becomes read-only-ish, Oracle chat remains on web.

**v0.1 web milestone (M1–M4, COMPLETE 2026-02-19):** landing page, auth, birth chart + AI Oracle, daily horoscope, Stripe payments. Detailed phase trail in `.planning/ROADMAP.md` v0.1 section.

## Requirements

### Validated

(None yet — ship to validate)

### Active

v0.1 web scope below is complete (M1–M4, 2026-02-19) — checkboxes updated
2026-08-13 to match; verified against `.planning/ROADMAP.md`'s v0.1 phase
trail and the live app, not assumed from the milestone date alone. Active
v1.0 mobile-launch work is tracked in `.planning/COMPLETION-TRACKER.md`,
not as new checkboxes here.

- [x] Landing page with stars background, pricing comparison, free vs premium features
- [x] Secure authentication via Clerk (web cookies)
- [x] User registration and login flows
- [x] Birth data input (date, time, location) with Bulgarian city/village coordinates
- [x] Encrypted birth data storage (at rest and in transit)
- [x] Natal chart generation via Swiss Ephemeris (native `sweph`, server-side — not swisseph-wasm, corrected per CLAUDE.md)
- [x] Interactive natal chart visualization (SVG, tap-to-explore — react-native-svg on mobile, D3-driven SVG on web, not Skia/Canvas, corrected per CLAUDE.md)
- [x] AI Oracle readings displayed with chart
- [x] Topic-restricted AI: free=general, premium=love/career/health
- [x] Daily personalized horoscope based on natal chart
- [x] Basic push notifications (morning horoscope) — web Web Push live; mobile delivery still open, see COMPLETION-TRACKER.md
- [x] Freemium model with premium tier
- [x] Stripe web payments integration
- [x] GDPR-compliant data handling and privacy policy
- [x] Bulgarian language UI
- [x] Dark, atmospheric UI theme
- [x] Web app deployment

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

- **Tech stack**: Turborepo monorepo, Next.js 15 + Expo SDK 54 (Solito), Clerk, Supabase, NativeWind v4, native `sweph` for Swiss Ephemeris — see CLAUDE.md for the current, maintained stack reference; `packages/db`/Drizzle was removed in favor of raw Supabase migrations, corrected here 2026-08-13
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
