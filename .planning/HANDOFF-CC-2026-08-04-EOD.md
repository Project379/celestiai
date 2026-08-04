=== CONTEXT HANDOFF — Stellaeum, checkpoint day, EAS setup started ===

Repo: Stellaeum, Bulgarian-language astrology SaaS. Next.js web + Expo SDK 54
mobile in a pnpm/Turborepo monorepo. Branch: main (single-branch strategy
since 2026-08-04, see prior handoff). Solo founder + Petko (web/Кръг,
inactive since 2026-05-03), Claude Code as implementer.

=== WHAT TODAY WAS ===

Full project checkpoint (CHECKPOINT-2026-08-04.md), requested after branch
consolidation surfaced repeated doc-vs-code gaps (RLS, PostHog, parity docs).
Investigated web completeness, mobile parity, cross-platform gaps, an
ordered port backlog, UI/design scope, founder infra track, and compliance
readiness — all measured against running code and gates, not trusted from
.planning docs. Headline finding: web holds up better than feared (every
golden-path step is real, not stubbed); mobile is at parity on 8 of 10 major
features, with Кръг and subscription UI as the two real gaps, both smaller
in scope than originally framed (Кръг needs no visualization rewrite — the
web UI is plain forms/lists, not D3/Canvas). Full detail in the checkpoint
doc; do not re-summarize it here, read it directly.

=== THE PATTERN, NAMED PLAINLY ===

Every gate turned on today found a real problem immediately, four for four:
lockfile mismatch, CRLF corruption in copy-lock.json, missing @types/node,
and `pnpm lint` (never part of CI) surfacing 6 real errors the moment it was
wired into `check:all`. A fifth instance surfaced mid-afternoon outside CI
entirely: mobile Sentry has been a no-op since install, for two independent
reasons (REVISIT-64) — same silent-fallback shape as the OPENROUTER_API_KEY
naming collision. The standing lesson: a gate that has never been run is not
evidence of a clean codebase, it's an unknown. Assume anything ungated is
probably hiding something until proven otherwise, not the other way around.

=== SHIPPED AND PUSHED TODAY (all on main, confirmed green in CI, watched live) ===

1. Three doc corrections (CLAUDE.md's Skia claim, REQUIREMENTS.md's
   mobile-password-reset gap, PRE_LAUNCH_PREREQS.md's stale GDPR row).
2. Two real lint errors fixed (`packages/core`), `pnpm lint` added as the
   final step of `check:all` — it was never gated before today.
3. Vitest added to `apps/web` for the first time. Stripe + RevenueCat
   webhook test suites built (41 cases, 4 files, 873 LOC) — the two payment
   paths where a silent failure takes money and delivers nothing; RevenueCat
   had never been tested end to end at all. `pnpm run test` now also runs as
   part of `check:all`. Areas 3-6 from the testing proposal (chart calc,
   Oracle quota, GDPR delete, rate limiting) are sized in CHECKPOINT §9.3
   but deliberately deferred until after the Кръг port — founder decision,
   not an oversight.
4. Apple privacy manifest question resolved (not just flagged) — no
   PrivacyInfo.xcprivacy needed to hand-author right now; folded into the
   first EAS iOS build's acceptance criteria instead. See CHECKPOINT §9.4.
5. EAS build investigation (CHECKPOINT §9.8) — confirmed an Android dev
   build is achievable today with zero Apple involvement, via EAS cloud
   build (needs neither Apple credentials nor a local Android SDK).

Six commits pushed mid-afternoon after sitting local-only for a stretch —
explicitly flagged by the founder as the same risk pattern that cost hours
earlier in the session (uncommitted/unpushed work + unverified CI = the
disease this whole day was about). Don't let that recur: push and watch CI
promptly, don't batch a full day's commits unpushed.

=== EAS SETUP — IN PROGRESS, NOT YET BUILT ===

`npx eas-cli login` + `npx eas-cli build:configure` run by the founder
directly (real EAS account, real project). Generated `apps/mobile/eas.json`
(three profiles: development/preview/production) and added
`extra.eas.projectId` to `apps/mobile/app.json` — reviewed line-by-line
before anything was committed, per the founder's explicit "no tool silently
edits config" instruction. Added on review, before commit: explicit
`"android": {"buildType": "apk"}` on the `preview` profile (removes doubt
about what future builds produce if EAS defaults ever change), and
`"ios": {"simulator": false}` on `development`/`preview` (states plainly
these are real-device iOS builds once Apple credentials exist — no fourth
simulator-only profile added, since nobody on this team currently has a Mac
to run one on; add that profile explicitly if that changes).

**`appVersionSource: "remote"` — the habit going forward:** EAS tracks the
real build number/version code on its own servers, not by reading or
writing `app.json`. `app.json`'s version fields can silently drift from
what's actually been submitted, and that's expected, not a bug — hand-
editing them does nothing, EAS overrides with the remote value. Before any
submission, check the real number with `eas build:version:get --platform
ios` (or `android`) rather than trusting `app.json`. A mismatch here
surfaces as a duplicate-version rejection at submission time, not earlier —
cheap to avoid by checking, expensive to discover at App Store review.

**REVISIT-64 filed** (`.planning/phases/phase-a-mobile-scaffold/
REVISIT-TRIGGERS.md`) — mobile Sentry has produced zero events since
install: the DSN env var was misnamed (`NEXT_PUBLIC_SENTRY_DSN` instead of
`EXPO_PUBLIC_SENTRY_DSN` in `.env.local`, fixed today) AND `SENTRY_ORG`/
`SENTRY_PROJECT` still point at web's project slug (`javascript-nextjs`) —
a dedicated mobile Sentry project under `celestia-ul` likely doesn't exist
yet. Not launch-blocking by itself, but every day it stays open is a day of
zero crash visibility on real-device testing that's about to start. Close
before treating the first round of device testing as having working crash
reporting.

`apps/mobile/.env.example` corrected to document `EXPO_PUBLIC_SENTRY_DSN`
and `EXPO_PUBLIC_API_BASE` (both previously undocumented there) and to drop
two dead `EXPO_PUBLIC_SUPABASE_*` lines — mobile has zero `@supabase/
supabase-js` usage anywhere; it talks to Supabase exclusively through
apps/web's API routes, and the old lines implied a direct connection that
never existed.

=== WHERE TODAY ENDED ===

`EXPO_PUBLIC_API_BASE` — parked deliberately, not forgotten. The founder is
getting an Android emulator set up tonight/tomorrow; the 10.0.2.2
(emulator's alias for the host machine's localhost) vs. LAN-IP question
gets settled once the emulator exists, before the actual build runs. Do not
pre-decide this — it depends on which the emulator setup actually needs.

Verified but not yet acted on: `next dev` already binds to all interfaces by
default (confirmed via `Get-NetTCPConnection` showing `::` and a successful
curl to the LAN IP) — no `--hostname 0.0.0.0` flag needed if the LAN-IP path
is chosen instead of the emulator alias. Existing Windows Firewall rules
already allow inbound Node.js traffic on Private+Public profiles.

Sentry ORG/PROJECT and the three `EXPO_PUBLIC_*` runtime env vars
(`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_BASE`,
`EXPO_PUBLIC_SENTRY_DSN`) have exact `eas env:create` commands specified in
this session's transcript — not yet run. RevenueCat env vars are
deliberately left as the placeholder for this first build (see checklist).

`.planning/ANDROID-PREVIEW-TEST-CHECKLIST.md` written today — the ordered
on-device test sequence for the first preview build, what "working" looks
like per screen, and the explicit expected-failure list (RevenueCat
`ERR-MOB-RC-003`, Кръг's static stub, Премиум's "coming soon" stub, Sentry
not reporting until REVISIT-64 closes) so none of those get chased as bugs.
Also covers log capture for a build with no dev menu: `adb logcat` (already
part of the Android SDK/emulator tooling, no extra install), with Expo Go as
a second-line fallback specifically for isolating JS-logic bugs from
native-module bugs — not a full substitute, since several installed
modules (RevenueCat, Sentry's native half, expo-apple-authentication,
passkeys) cannot load inside Expo Go at all.

=== WHAT TOMORROW STARTS WITH ===

1. Emulator setup, with Google Play Services image (needed for push
   notification testing — bare AOSP images can't register FCM tokens).
2. Settle `EXPO_PUBLIC_API_BASE`: 10.0.2.2 vs LAN IP, based on what the
   actual emulator setup needs.
3. Set the three `EXPO_PUBLIC_*` env vars via `eas env:create --environment
   preview` (commands already specified, not yet run).
4. `npx eas-cli build --platform android --profile preview` — first real
   binary this app has ever produced outside Expo Go.
5. Walk `.planning/ANDROID-PREVIEW-TEST-CHECKLIST.md` in order.
6. Separately, whenever convenient: RevenueCat Test Store dashboard setup
   (unblocks real RevenueCat testing on a future build) and REVISIT-64
   (Sentry project + org/project EAS env vars, unblocks crash visibility on
   a future build). Neither blocks tomorrow's build or test pass.

=== EVERYTHING ELSE FROM PRIOR HANDOFFS IS UNCHANGED ===

See HANDOFF-CC-2026-08-03-EOD.md for the standing-discipline section
(halt boundary, standing answers, what does not relax) — still in effect,
nothing here supersedes it. This handoff only adds today's checkpoint,
gate-hardening, and EAS-setup-in-progress state.
