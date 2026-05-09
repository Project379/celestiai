# Phase A Close Ratification — Strategic Items Tracking

**Created:** 2026-05-09 at Phase A close ratification.
**Purpose:** Capture the strategic items that aren't in scope for now-execution but need committed timeline before Phase B opens. Each item has an owner, a target window, and a success criterion. Founder reviews this doc at Phase B opening to confirm prerequisites are met.

**Halt discipline:** Phase B does NOT auto-fire on this commit landing. Founder explicitly opens Phase B SR 1 (Кръг native-primary investigation pass) when ready — likely after a 2–3 day rest break and the friend coordination conversation.

---

## 1. Cost envelope check on OpenRouter

**Owner:** founder
**Target window:** complete before SR 9 fires (Phase B close, ~6–8 weeks)
**Status:** not started

### Scope

Cross-references `PRE_LAUNCH_PREREQS.md` item 5 (OpenRouter rate-limits + cost envelope). Two-state projection needed:

- **Current state — Llama-only.** All AI calls today (Днес daily horoscope + Oracle readings) hit `meta-llama/llama-3.3-70b-instruct` via OpenRouter. Verify quota, document per-model rate-limit policy (requests/min, tokens/min), measure cost-per-reading from production logs across the SR 5–7 verification windows.
- **Projected state — mixed-model.** Phase B+ plans Gemini for Oracle readings (per `MOBILE_UX_RESEARCH.md` Phase B notes — Gemini's tone better fits the warm-mystical Oracle voice; Llama stays on daily horoscope where speed matters). Project blended cost envelope at expected soft-launch traffic (50–100 users × N readings/user × cost-per-reading).

### Action items

- Pull OpenRouter dashboard data for the past 3 weeks (SR 5 onward — fresh AI traffic only)
- Set OpenRouter spend alerts at three thresholds: weekly burn ceiling, monthly cap, daily anomaly
- Document the projection in a short note (~2 paragraphs) added to this file or to `PRE_LAUNCH_PREREQS.md` item 5
- Resolve `PRE_LAUNCH_PREREQS.md` item 5a (AI provider fallback strategy) — graceful degradation vs second-provider failover. Current state: zero fallback, single-provider single-point-of-failure. Founder product call.

### Success criterion

A short cost-envelope note exists in this file or in PRE_LAUNCH_PREREQS item 5, projecting blended-model spend at soft-launch traffic and confirming it fits within the founder's pre-launch burn ceiling. OpenRouter spend alerts active in the dashboard.

---

## 2. Telemetry vendor decision — PostHog selected

**Owner:** founder + Claude (wiring lands in Phase B opener)
**Target window:** wire in Phase B opening sub-round
**Status:** vendor selected (PostHog), wiring deferred

### Scope

Cross-references `PRE_LAUNCH_PREREQS.md` item 1. The choice is locked at Phase A close ratification — **PostHog**. Web + mobile both wire to the same PostHog project so signup-funnel events span both surfaces with a single user identity.

### Initial event taxonomy (10 events)

Founder ratification 2026-05-09: ship the minimum viable taxonomy first; defer richer events until questions arise from the data. The 10 events:

| # | Event | Properties | Surface |
|---|---|---|---|
| 1 | `app_opened` | `platform: ios\|android\|web`, `cold_start: bool` | both |
| 2 | `wizard_started` | `platform` | both |
| 3 | `wizard_step_completed` | `step: 'date'\|'time'\|'location'\|'confirm'`, `platform` | both |
| 4 | `wizard_completed` | `platform`, `time_known: bool` | both |
| 5 | `chart_viewed` | `platform`, `is_first_view: bool` | both |
| 6 | `oracle_opened` | `platform`, `has_chart: bool` | both |
| 7 | `oracle_topic_selected` | `topic: 'general'\|'love'\|'career'\|'health'`, `cache_hit: bool`, `platform` | both |
| 8 | `oracle_reading_generated` | `topic`, `tier: 'free'\|'premium'`, `platform` | both |
| 9 | `oracle_cap_reached` | `cap`, `tier`, `platform` | both |
| 10 | `push_permission_prompted` + `push_permission_response` | `granted: bool`, `platform: ios\|android` | mobile-only |

**What's NOT in the taxonomy yet:** A/B test variants, screen-level page views, scroll depth, time-on-screen, per-component interactions. Defer until questions arise.

### Action items

- Founder creates PostHog project (EU region for GDPR data-residency parity with Sentry)
- Phase B opener investigation pass surfaces PostHog wiring scope — likely a `usePostHog` hook on mobile, `posthog-js` on web, `apps/{mobile,web}/lib/analytics/track.ts` thin wrapper
- Bulgarian Privacy Policy must include analytics processor disclosure (PostHog as data processor) — gates GDPR/ToS item below

### Success criterion

PostHog project exists in EU region. Phase B opener wires the 10-event taxonomy on both surfaces. First end-to-end signup funnel event (`app_opened` → `wizard_started` → ... → `chart_viewed`) lands in the PostHog dashboard with correct user identity.

---

## 3. Apple Developer Program enrollment

**Owner:** founder
**Target window:** begin within 2 weeks of Phase A close (by 2026-05-23); complete before SR 9 fires (~6–8 weeks)
**Status:** not started; pending decision on individual vs organization account

### Scope

Cross-references REVISIT-1 (now reclassified to "end of Phase B per soft-launch milestone"). Apple Developer Program enrollment is the gating action for SR 9 (EAS Dev Client + TestFlight + biometric, bundled). Without it: no Dev Client, no TestFlight, no soft launch.

### Decision pending: individual vs organization

| Path | Cost | Lead time | Tradeoff |
|---|---|---|---|
| Individual | $99/year | ~1 week (instant for many applicants) | App listed under founder's personal name |
| Organization | $99/year + D-U-N-S number | ~1–2 weeks for D-U-N-S lookup + ~1 week for Apple review | App listed under company name; required if app handles regulated data or if founder plans to add team members later |

For a Bulgarian astrology app at soft-launch scale (50–100 users), **individual is sufficient**. Organization makes sense if:
- A registered company entity already exists and matches the bundle identifier `com.stellaeum.app`
- Founder plans to add team members to App Store Connect within Phase C–D
- Bulgarian data-protection regulation requires the developer entity to match the data controller named in the Privacy Policy (founder to verify with legal review during GDPR/ToS work below)

### Action items

- Founder picks individual vs organization (founder action, no Claude Code work)
- Founder enrolls at https://developer.apple.com/programs/ within 2 weeks of Phase A close
- Founder receives Apple Developer team ID; provides to Claude when SR 9 planning begins
- Apple App Store product config begins in parallel (RevenueCat dashboard products, entitlements, offerings — REVISIT-25 references the 1–2 week lead time)

### Success criterion

Apple Developer team ID + RevenueCat App Store product IDs available before SR 9 planning fires at Phase B middle weeks. Otherwise SR 9 stalls and the soft-launch milestone slips.

---

## 4. GDPR/ToS engagement

**Owner:** founder + legal review
**Target window:** Bulgarian Privacy Policy + ToS draft live by Phase B middle weeks (~3–4 weeks in); processor contracts confirmed before TestFlight external testing opens
**Status:** not started

### Scope

Cross-references `PRE_LAUNCH_PREREQS.md` item 7. **Apple requires a Privacy Policy URL for external TestFlight testing** — gates Phase B soft launch, not SR 9 internal build. Internal TestFlight (founder + close circle) doesn't need it; external TestFlight (the 50–100 Bulgarian users invited to soft launch) does.

### Required artifacts

- **Bulgarian Privacy Policy** — drafted in Bulgarian (bulgarian-skill calibration if Claude assists) with native-speaker legal review. Discloses every processor:
  - Clerk (auth + 2FA + OAuth)
  - Supabase (database + storage)
  - OpenRouter + underlying model providers (Llama / Gemini)
  - Stripe (web payments)
  - Sentry (error monitoring — EU region per data-residency)
  - **RevenueCat** (mobile payments — Phase B opener install, REVISIT-25)
  - **PostHog** (analytics — Phase B opener wiring per item 2 above)
  - **Apple Push Notification Service** (push delivery — Phase B work, REVISIT-26)
- **Bulgarian Terms of Service** — drafted in Bulgarian, native-speaker legal review, references the Privacy Policy
- **Processor contracts (DPAs)** — Data Processing Agreements with each of the eight processors above. Most providers ship template DPAs; founder signs one per provider
- **Cookie consent banner on web** — only required if PostHog is configured to use tracking cookies; PostHog supports cookieless mode (uses localStorage), which avoids the banner. Founder picks at PostHog config time

### Action items

- Founder engages a Bulgarian-language privacy lawyer (~3–4 weeks into Phase B is a reasonable engagement window — gives time for legal back-and-forth before soft launch)
- Founder confirms each processor's DPA template is signed/acknowledged
- Privacy Policy URL goes live on the web product (`/privacy` route — shipped in §8.2 GDPR work but copy is currently English placeholder; needs Bulgarian rewrite)
- Mobile app's iOS Settings link points to the same web URL (Apple requires it accessible from in-app)

### Success criterion

`https://stellaeum.bg/privacy` (or whatever the production URL is) returns Bulgarian Privacy Policy + ToS. Eight processor DPAs signed. App Store Connect Privacy Policy URL field populated. Mobile in-app link to Privacy works on iOS + Android.

---

## 5. Friend coordination on web premium features

**Owner:** founder
**Target window:** schedule conversation within 1 week of Phase A close (by 2026-05-16); merge plan resolved before Phase B SR 1 fires
**Status:** not started

### Scope

The branch `mobile-parallel-test` has substantial unpushed-then-pushed-2026-05-09 work that diverged from `origin/main`. Friend's `origin/main` work on web premium features (post-Phase 7 / Phase 8) may have continued in parallel during Phase A; merge plan needs to be resolved before Phase B opens any web-touching sub-round (e.g., REVISIT-23 web cap-reached parity work in mid-Phase B).

### Action items

- Founder schedules friend conversation within 1 week (by 2026-05-16)
- Surface findings to this doc:
  - Friend's branch state — is `origin/main` still where it was at 2026-02-19 SR 8.3 close, or has work continued?
  - In-flight web work — what's happening on the web product post-Phase 8 audit logging?
  - Merge plan — straight merge, rebase, or branch-by-branch reconciliation?
  - Coordination cadence going forward — does friend need read access to mobile-parallel-test for cross-surface awareness, or is solo Claude execution OK with periodic syncs?
- If a merge is needed, schedule it before Phase B SR 1 (Кръг native-primary investigation pass) — Phase B's first web-touching sub-round (REVISIT-23 parity, mid-phase) is the latest viable window

### Success criterion

A short note appended to this file capturing: friend's current branch state, in-flight web work, agreed merge plan with target date, ongoing coordination cadence.

---

## Founder reference notes (during ratification)

This section logs founder commentary added during Phase A close ratification that doesn't fit the items above but should be preserved for future planning:

- **Reclassification ambiguity flagged:** Founder referenced "REVISIT-23 (TestFlight)" in the close ratification spec. The actual REVISIT-23 in the file is "Web Oracle cap-reached path fails silently" (web parity gap). REVISIT-1 covers Apple Developer enrollment + EAS Dev Client + TestFlight as a bundled item. Both possible interpretations (founder-meant-REVISIT-1's-TestFlight vs founder-meant-REVISIT-23-pulled-forward-to-Phase-B) were applied — REVISIT-1 trigger updated to end-of-Phase-B, REVISIT-23 trigger pulled forward to Phase B middle weeks. Founder confirms or corrects at Phase B opening.

- **Bulgarian copy discipline preserved across all docs:** Planning docs are English (internal); user-facing strings are Bulgarian (calibrated). No drift introduced in this sweep.

---

## Phase A → Phase B handoff readiness checklist

When founder is ready to open Phase B SR 1, confirm:

- [ ] **Cost envelope check** — projection note exists, OpenRouter spend alerts active
- [ ] **PostHog project** — created, EU region, ready for Phase B opener to wire
- [ ] **Apple Developer enrollment** — started (individual vs organization decided), team ID expected within 1–2 weeks of SR 9 planning
- [ ] **GDPR/ToS engagement** — Bulgarian-language lawyer engaged (or scheduled) before Phase B middle weeks
- [ ] **Friend coordination** — conversation held, branch state known, merge plan agreed
- [ ] **Phase A close summary reviewed** — `.planning/phases/phase-a-mobile-scaffold/SUB-ROUND-8-CLOSE.md` verification matrix run on iPhone, no surprises
- [ ] **Founder rest** — 2–3 day break taken (Phase A's ~3-week sprint earned it)

If all green, Phase B SR 1 (Кръг native-primary investigation pass) opens. Speed-mode discipline preserved: investigation pass first, founder ratifies in one response, sub-commits execute sequentially, halt only for the listed triggers.

---

*Document generated 2026-05-09 at Phase A close ratification. Updated as items resolve.*
