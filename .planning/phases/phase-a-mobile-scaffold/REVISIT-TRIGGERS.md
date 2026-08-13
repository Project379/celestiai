---
phase: Phase A — Mobile Scaffold
sub-round: 1 (auth foundation)
created: 2026-04-28
status: living document — append as new triggers accumulate
---

# Revisit Triggers — Phase A Mobile

Deferred installs, version pins, and infrastructure scoped out of the current
sub-round, each paired with the named condition that should trigger
re-evaluation. Sourced from sub-round 1 commit 1.1 ratifications.

## 1. Biometric + EAS Dev Client + TestFlight (bundled)

**Deferred:** `expo-local-authentication`, EAS Dev Client setup, TestFlight
distribution.

**Trigger (RECLASSIFIED 2026-05-09 at Phase A close ratification):**
**End of Phase B — fires alongside the soft-launch milestone, not late
Phase C / early Phase D as originally scoped.** TestFlight cut is the
soft-launch milestone (50–100 Bulgarian users via TestFlight + Google
Play internal track), not the GA submission gate. Apple Developer
Program enrollment ($99/year, requires registered entity) drives the
trigger date — **founder action: begin enrollment within 2 weeks of
Phase A close (by 2026-05-23 at the latest), complete before SR 9 fires
at Phase B close (~6–8 weeks out).**

The original "late Phase C / early Phase D" framing assumed TestFlight
was a GA-submission gate; the soft-launch reframe pulls it forward by
~2–3 months. Apple Developer enrollment lead time is 1–2 weeks for
individual accounts, longer for organization accounts requiring D-U-N-S
number lookup; founder picks individual vs organization at enrollment
start (see `.planning/PHASE-A-CLOSE-RATIFICATION.md`).

**Sub-round when ready:** SR 9 at end of Phase B (planned scope: EAS
build config + TestFlight provisioning + `expo-local-authentication`
runtime wiring on the sign-in / settings screens). REVISIT-27 (push
token retrieval verification post-Dev Client) closes in the same SR 9
window.

**Phases A and most of B continue running in Expo Go on real iPhone**
(unchanged from original framing); Phase B ends with the SR 9 build
that opens TestFlight distribution.

**Why bundled:** biometric requires Dev Client (Expo Go cannot exercise
`expo-local-authentication`); Dev Client requires EAS; EAS practically
requires Apple Developer for iOS distribution. Decoupling creates
partial-state intermediate sub-rounds that don't ship user value.
Bundling = single closure event when enrollment completes.

**Re-add path:**
- `pnpm exec expo install expo-local-authentication`
- Add `expo-local-authentication` plugin to `app.json` with `faceIDPermission`
  Bulgarian copy (calibrate via bulgarian-skill at the time)
- `eas init` + EAS build configuration
- TestFlight provisioning

**Status addendum (2026-07-22, MOBILE-ALPHA-REDESIGN sequencing pass):** this REVISIT's own founder-action deadline ("begin enrollment within 2 weeks of Phase A close, by 2026-05-23 at the latest") has passed — enrollment is confirmed still not started as of this addendum, roughly two months past that internal target. Re-confirmed as the critical-path blocker for P.15 (RevenueCat sandbox testing), P.17/SR9 (this item — EAS/TestFlight/biometric), and by dependency P.18 (soft-launch readiness gate). Zero code dependency, unknown external duration once started. Highest-priority founder-track item in the current sequencing plan — see `.planning/research/MOBILE_ALPHA_REDESIGN.md` §7 for the full P-chain interleaving this blocks.

## 2. Sign in with Apple — runtime feature deferred (peer installed for bundle compat)

**Status:** `expo-apple-authentication ~7.2.4` installed in the commit-1.3-prep
fix round (see drift #20 in `09-01-PRECISION-FLOOR.md`). Peer is required at
compile time because `@clerk/expo` statically analyzes a dynamic `import("expo-apple-authentication")`
in `hooks/useSignInWithApple.ios.js:51`. Runtime feature (Sign in with
Apple button on sign-in screen) is NOT wired.

**Trigger to wire runtime feature:** Sign in with Apple feature request
lands. Likely Phase B+ when OAuth provider list expands. Apple requires
this if any other OAuth provider is offered on iOS, so likely co-arrives
with item 3.

**Wire-up path:** add iOS entitlement config in `app.json` ios section +
implement `useSignInWithApple()` hook on sign-in screen.

## 3. OAuth providers (Google, Microsoft, etc.) — runtime feature deferred (peers installed for bundle compat)

**Status:** `expo-web-browser ~14.2.0` and `expo-auth-session ~6.2.1`
installed in the commit-1.3-prep fix round (see drift #20). Peers are
required at compile time because `@clerk/expo` statically analyzes
dynamic imports of them in `hooks/useOAuth.js:55`, `hooks/useSSO.js:53`,
and a synchronous `require("expo-web-browser")` in
`provider/ClerkProvider.js:280` (gated by `if (isWeb())`). Runtime
features (OAuth provider buttons on sign-in screen) are NOT wired.

**Trigger to wire runtime feature:** First OAuth provider feature
request lands. Google sign-in commonly first. Phase B+.

**Wire-up path:** Clerk dashboard provider config + `useOAuth()` or
`useSSO()` hook wiring on sign-in screen. The Expo CLI auto-added
`expo-web-browser` plugin to `app.json` plugins array on install — no
additional plugin config needed.

## 4. Passkeys — runtime feature deferred (peer installed for bundle compat)

**Status:** `@clerk/expo-passkeys ^1.0.17` installed in the
commit-1.3-prep fix round (see drift #20). Peer is required at compile
time because `@clerk/expo/passkeys/index.js:24` synchronously requires
it. Runtime feature (passkey enrollment + auth) is NOT wired.

**Trigger to wire runtime feature:** Passkey support feature request
lands. Post-launch enhancement; low priority pre-launch.

**Wire-up path:** add `__experimental_passkeys` config to ClerkProvider
+ implement passkey hooks on sign-in / settings screens.

## 5. Reanimated v4 bump — landed at SDK 54 upgrade (was: deferred to Phase B)

**Status:** `react-native-reanimated@~4.1.7` + `react-native-worklets@0.5.1`
installed at the SDK 53 → 54 upgrade commit. Original deferral to Phase B
Skia work was forced earlier than planned by SDK 54 alignment — SDK 54
ships with Reanimated 4 by default. Migration cost was zero (no Reanimated
worklet API usage anywhere in `apps/mobile/`); the bump was free, just
installed and moved on.

**Trigger fired:** SDK 54 forcing function (see drift #21 in
`09-01-PRECISION-FLOOR.md`). Phase A sub-round 1 commit 1.3 verification
round-trip 4 — Expo Go on iPhone refused SDK 53 project, forcing
project-side bump to SDK 54, which forced Reanimated 4 alignment.

**Wire-up status for Phase B Skia work:** when Skia rendering work begins
in Phase B (chart visualization, gesture-driven Кръг premium spine,
animated transit indicators), Reanimated 4 is already in place with the
worklets peer correctly installed. `babel-preset-expo` (now ~54.0.10)
handles the Reanimated plugin configuration automatically. No additional
bumps expected for Phase B Skia work.

## 6. 2FA challenge flow — implementation shipped, paid-feature gated

**Status:** `apps/mobile/app/(public)/two-factor.tsx` shipped in sub-round
1.4-2fa (commit `3c7c318`) and the surrounding sign-in branching is wired
in `sign-in.tsx` to route on `signIn.status === 'needs_second_factor'`.
TOTP, SMS phone code, and backup code strategies are all implemented with
strategy switching, with Bulgarian copy calibrated in 1.4d. Code is
production-ready; runtime path is currently unreachable.

**Why unreachable:** Clerk Multi-Factor Authentication is a paid-plan
feature and is not included on the Hobby plan currently in use. Without
MFA enabled at the Clerk dashboard level, no user account can be enrolled
in 2FA, so `signIn.status === 'needs_second_factor'` never returns from
`signIn.password()`. The branch is defensively wired but inert.

**Trigger:** Clerk plan upgrade (Pro or higher) for production launch, OR
explicit business decision to defer 2FA to post-launch and remove the
unreachable code paths. Sub-round 1.7 verification surfaced this; founder
ratified keep-as-is for upgrade-readiness.

**Sub-round when ready:** Post-Clerk-upgrade verification — re-run
sub-round 1.7 verification matrix Phase 5 (2FA flow) end-to-end with a
test user enrolled in TOTP. No code changes expected; just confirm the
existing implementation works against the live MFA endpoint. If
Clerk's API shape has changed since 1.4-2fa shipped, fold corrections
into the verification commit.

**Re-add path (if removed instead of upgraded):**
- Delete `apps/mobile/app/(public)/two-factor.tsx`
- Remove the 2FA branching block from `sign-in.tsx`'s `handleSignIn`
- Remove the `(public)` group's two-factor screen entry from
  `app/_layout.tsx` if explicitly declared

## 7. Color contrast audit — pre-launch accessibility-vs-brand decision — CLOSED-BY-DECISION 2026-07-21

**Resolution (PRE-LAUNCH-POLISH-BATCH close 2026-07-21):** Founder ratified keeping the muted brand palette as-is — no tone bumps now. The vague "Phase D" trigger below is what let this item orphan for 8+ sub-rounds without a concrete re-fire condition, so this REVISIT closes by decision and is superseded by **REVISIT-52** (filed this close), which carries a concrete trigger: before public App Store submission (not TestFlight), OR first accessibility complaint, OR any external accessibility requirement surfacing (EU Accessibility Act applicability check). See REVISIT-52 below for the full replacement filing. Original investigation context retained below for historical reference.

---

**Deferred:** Comprehensive color-contrast audit against WCAG AA / AAA
across the mobile UI palette.

**Status:** Slate-500 (and similar muted tones used for eyebrows, helper
text, hints, and the sign-out button label) on the `#08060f` background
likely fails WCAG AA contrast for normal-sized text. The aesthetic
matches the warm-poetic Celestia brand voice (low-contrast, intimate,
candle-lit feel) and is consistent across web and mobile surfaces. The
trade-off has not been deliberately made — the muted palette evolved
organically from the brand brief without an accessibility lens applied.

**Trigger:** Pre-public-launch (Phase D close, before App Store
submission). May trigger earlier if:
- Bulgarian or EU accessibility regulation requires WCAG AA compliance
  for paid services (founder to verify with legal review for Bulgarian
  market)
- A user with visual-accessibility needs reports unreadable copy during
  beta or testing
- Apple App Store review surfaces accessibility concerns at submission

**Sub-round when ready:** Phase D accessibility pass. Audit each muted
color usage and decide per-context: keep brand aesthetic with mitigation
(e.g., system-level "Increase Contrast" iOS / Android settings honored
automatically by NativeWind tokens), bump tones to AA-compliant
equivalents (e.g., slate-500 → slate-400 for body text, slate-300 for
helpers), or split into a brand-mode vs. accessibility-mode toggle.

**Why deferred:** This is a deliberate accessibility-vs-brand tension
that needs a product decision, not a mechanical fix. Unilaterally
bumping all muted colors would override the brand language without
founder input. Surfacing here so the decision is made before launch
rather than discovered at App Store review.

## 8. Hardcoded mobile streak footer drift from web vocabulary — CLOSED-BY-PRIOR-WORK 2026-07-21

**Resolution (PRE-LAUNCH-POLISH-BATCH investigation 2026-07-21):** Verified via grep — the hardcoded «· серия 12 ·» placeholder no longer exists anywhere in `apps/mobile/app/(authed)/(tabs)/index.tsx`. P.6-b's crystal streak surfaces (`CrystalOfTheDayCard.tsx`, `DailyStreakPanel.tsx`) already ship the correct web vocabulary verbatim: `'1 ден'` for day 1, `` `${streak.current} поредни дни` `` for N>1. This was fixed incidentally as a side effect of P.6's crystal collection work, not a dedicated fix — closing here since no further action is needed. Original investigation context retained below for historical reference.

---

**Status:** `apps/mobile/app/(authed)/(tabs)/index.tsx` contains a hardcoded
streak footer reading «· серия 12 ·». Web's actual streak rendering on
the production Crystal-of-the-Day full-card (`apps/web/components/crystals/
CrystalOfTheDayCard.tsx:63`) uses a different vocabulary entirely:
- Day 1: «1 ден»
- Day N (N>1): «{N} поредни дни»

The mobile footer was placeholder text that misled the sub-round 2.4
calibration of the Crystal tile streak format toward «серия N» — neither
web tile nor web full-card uses that vocabulary anywhere. Sub-round 2.5-fix-2
removed streak from the Crystal tile entirely (mirrors web tile's choice),
which dissolved the immediate visual mismatch — but the footer drift
remains.

**Trigger:** When the streak footer becomes data-driven (likely sub-round
3+ when streak data wires to a dedicated streak surface). Don't treat
the hardcoded «· серия 12 ·» as canonical — align to web's «1 ден» /
«{N} поредни дни» format with proper Bulgarian count-form handling at
that point.

**Sub-round when ready:** Whichever sub-round wires the dynamic streak
footer. Calibration follows web vocabulary; bulgarian-skill discipline
applies if any mobile-specific adaptation is needed (e.g., footer width
constraints).

**Why documented:** This drift caused 2.4 to miscalibrate streak phrasing
(picked «серия N» based on the hardcoded footer's apparent convention).
Future founder/maintainer shouldn't repeat the mistake by treating the
placeholder as a source of truth. Going-forward discipline (ratified
sub-round 2.5): for shared mobile/web data surfaces, mobile mirrors web's
existing Bulgarian vocabulary; mobile-specific surfaces get
bulgarian-skill calibration.

## 9. Sentry org slug rename — blocked on plan tier — CLOSED-BY-DECISION 2026-07-21

**Resolution (PRE-LAUNCH-POLISH-BATCH close 2026-07-21):** Founder ratified keeping the celestia-prefixed Sentry org slug permanently. It's cosmetic-only (internal dashboard identifier, zero user-facing impact) and not worth a plan upgrade or org-migration risk. If a future business reason makes the internal slug matter (e.g. a compliance audit citing brand names), that's a new REVISIT filed at that time, not a reopening of this one. Original investigation context retained below for historical reference.

---

**Status:** During sub-round 3 (Stellaeum rename) Layer 2 dashboard work,
founder attempted to rename the Sentry org slug from the celestia-prefixed
identifier. Sentry's plan tier requires migration to rename org slugs;
the rename is blocked without either upgrading the plan or migrating to
a new Sentry org. Project name within the org was renamed cosmetically
(no DSN change).

**Trigger:** Phase D pre-launch decision — accept the cosmetic
stuck-name OR plan migration. Cost-benefit weighs Sentry plan upgrade
vs. brand-consistency value of an internal org slug never seen by users.

**Sub-round when ready:** Dedicated Sentry migration task or
accept-and-document as historical drift.

**Re-add path (if migrated):** create new Sentry org at the desired
slug, update SENTRY_ORG and SENTRY_PROJECT env vars in deployment
secrets, swap DSNs (org-bound), confirm error events flow into the new
org, retire the old org.

## 10. Test email domain `@celestia-ai.dev` — kept as historical — CLOSED-BY-DECISION 2026-07-21

**Resolution (PRE-LAUNCH-POLISH-BATCH close 2026-07-21):** Founder ratified keeping `@celestia-ai.dev` as a stable test fixture indefinitely. Paying to register and maintain a Stellaeum-branded domain just to rename an arbitrary, never-user-facing test identifier is waste. Verified unchanged at investigation — `apps/web/scripts/m3-uat-harness.mjs:37,1405` still reference the domain. If a future need for owning `@stellaeum.dev` emerges (e.g. transactional email sending), that's a new REVISIT, not a reopening of this one. Original investigation context retained below for historical reference.

---

**Status:** UAT harness (`apps/web/scripts/m3-uat-harness.mjs:37,1405`)
test email domains kept as `m3uat@celestia-ai.dev` and
`m3uat-cascade@celestia-ai.dev` per sub-round 3 ratification 10. Kept
as-is despite the Stellaeum rename because they are arbitrary
identifiers in test infrastructure — never user-facing — and renaming
requires registering `@stellaeum.dev` (~$10–15 + DNS + email-receiving
setup) for what is functionally a stable test fixture.

**Trigger:** Domain registration costs covered AND test infra cleanup
priority justifies the touch. Likely when Phase D pre-launch surfaces
test-infrastructure polish.

**Sub-round when ready:** Dedicated test infra cleanup task.

**Re-add path:** Register a domain (likely `stellaeum.dev` or related),
update Clerk dashboard email-allowlist for the new domain, change the
two harness lines + any associated test-user ensure helpers, retire the
old domain.

## 11. GitHub repository rename `Project379/celestiai` → TBD — CLOSED-BY-DECISION 2026-07-21

**Resolution (PRE-LAUNCH-POLISH-BATCH close 2026-07-21):** Founder ratified keeping `Project379/celestiai`. It's internal-only with zero user-facing impact, and the rename cascade (GitHub Actions secrets, README badges, external issue/PR links) is a real cost for a purely cosmetic gain. Verified unchanged at investigation via `git remote -v`. **If the repo ever goes public or is shown externally, that triggers a new REVISIT filed at that time** — this item does not stay standing-OPEN waiting for that. Original investigation context retained below for historical reference.

---

**Status:** GitHub repo at `github.com/Project379/celestiai` retains
the original `celestiai` slug. The single tracked code reference at
`packages/core/tsconfig.json:7` (a `STRICTNESS_DEFERRED` comment
linking to issue #8) was preserved as-is per sub-round 3 ratification 5
because the URL doesn't change with the code rename — and the linked
issue is itself historical context.

**Trigger:** When public visibility matters (Phase D approach) OR when
the brand-consistency value outweighs the URL-stability cost
(GitHub repo rename touches: all clone URLs, all GitHub Actions
secrets/permissions, all README badges, all linked issues/PRs from
external sources, the URL in `packages/core/tsconfig.json:7`).

**Sub-round when ready:** Dedicated GitHub admin task. Repo rename is
mechanically simple; the cascade through external references is the
cost.

**Re-add path:** GitHub repo Settings → Rename → confirm. Update remote
URLs in local clones (`git remote set-url`). Update
`packages/core/tsconfig.json:7` comment. Audit GitHub Actions secrets
that reference the old repo path (`secrets.GITHUB_TOKEN` is automatic;
custom secrets may be repo-pathed). Update any external references
(third-party docs, badges, README links from forks).

## 12. Web account deletion confirmation copy mismatch — CLOSED 2026-05-12

**Resolution (B.0g-1 close 2026-05-12, commit `64e616d`):** Investigation
discovered the four mismatched touchpoints are all rendered by Clerk's
hosted `UserProfile` component via the vendored `@clerk/localizations`
bg-BG bundle — the strings live in `node_modules/@clerk/localizations/dist/bg-BG.js`,
not our codebase. The `userProfile.deletePage` section ships
title/actionDescription/confirm button as «Изтриване на акаунта»
(verbal-noun) but the input placeholder as «Изтрий акаунта»
(imperative), so users typing the placeholder ghost text fail the match
check. Fix path: override the single Clerk localization key in
`apps/web/app/layout.tsx`'s ClerkProvider via `{ ...bgBG,
formFieldInputPlaceholder__confirmDeletionUserAccount: 'Изтриване на
акаунта' }` spread pattern. Vendor-string override, not codebase copy
edit. Founder smoke-tested 2026-05-12: all four touchpoints unify on the
verbal-noun form, type-to-confirm now accepts the placeholder text the
user reads. Original investigation context retained below for historical
reference.

---

**Status:** The account-deletion confirmation flow on web has a copy
mismatch between the type-to-confirm prompt and the button label. The
prompt asks the user to type «Изтриване на акаунта» (verbal-noun form,
"Deletion of the account") to confirm, but the button label reads
«Изтрий акаунта» (imperative verb form, "Delete the account"). A user
typing what's printed on the button — the natural action — fails the
match check.

**Trigger:** Pre-launch UX pass, OR whenever the account-deletion
surface is next touched.

**Sub-round when ready:** Dedicated web-side polish sub-round, OR fold
into the next sub-round that touches account/settings UI on web.

**Fix path:** Pick one form and use it consistently — either rephrase
the prompt to align with the button, or relabel the button to align
with the prompt. bulgarian-skill calibration to confirm the chosen
form reads naturally in the surrounding context.

**Why documented:** Surfaced during sub-round 4.0 founder web
walkthrough preparing for the mobile birth-wizard ground-truth
gathering. Out-of-scope for sub-round 4 but is a launch-blocker if
not addressed before public release.

## 13. Birth date validation error references internal schema format — CLOSED-BY-FIX 2026-07-21

**Resolution (PRE-LAUNCH-POLISH-BATCH close 2026-07-21, mechanical commit):** Both `birthDataSchema` occurrences of the regex error in `packages/core/src/charts/schemas.ts` (lines 51 and 158) now emit «Моля, изберете дата на раждане» — matching the existing required-field message — instead of leaking the internal `YYYY-MM-DD` storage format. Fix propagates to both web and mobile automatically via the shared schema. TS-green verified. Original investigation context retained below for historical reference.

---

**Status:** The `birthDate` field's regex validation in
`packages/core/src/charts/schemas.ts` (lifted from
`apps/web/lib/validators/birth-data.ts` in sub-round 4.1) emits the
error «Датата трябва да е във формат YYYY-MM-DD». The message
references the internal storage format the user never sees — browsers
present locale-formatted dates (DD.MM.YYYY in Bulgarian locales) via
the native picker; mobile presents native iOS/Android pickers.
The user has no way to "produce" a YYYY-MM-DD string and shouldn't
need to know the format exists.

**Trigger:** Pre-launch UX polish, OR whenever birth-data error UX is
next revisited.

**Sub-round when ready:** Dedicated UX polish sub-round, OR fold into
a sub-round that touches the shared schema. Edit is mechanical:
replace the regex `error` with «Моля, изберете дата на раждане»
(matching the existing required-field message) or a similar
user-friendly Bulgarian phrasing.

**Why documented:** Surfaced during sub-round 4.0 founder web
walkthrough. The path is latent rather than active (native pickers
on both surfaces cannot produce a malformed string), but the message
is incorrect if/when it surfaces. Single-line fix corrects both web
and mobile via the shared schema — concrete benefit of the 4.1 lift.

## 14. Web landing splash heading overflow at default viewport — STILL OPEN, structural finding pending visual confirmation (2026-07-21)

**Investigation note (PRE-LAUNCH-POLISH-BATCH 2026-07-21):** The exact heading string described below («Звездите имат какво да ти кажат.» as a single clippable line) no longer exists in that form. `apps/web/components/landing/LandingPage.tsx:41-46` now renders the heading as two separate `<span className="block">` lines ("Звездите имат" / "какво да ти кажат.") inside a `max-w-3xl` centered container with no `overflow-hidden` ancestor found — structurally this doesn't have the single-line-clip failure mode originally described, and looks like it was already fixed by an unrelated landing-page redesign. **However, no browser tool was available this session to actually render and confirm this at any viewport — per the explicit instruction not to close on structural inference alone, this item stays OPEN.** Whoever next has browser access should do a 30-second check (resize to common desktop widths, confirm the two-line heading isn't clipped) and close this with a CLOSED-BY-PRIOR-WORK note if confirmed, or reopen investigation if the clipping persists in the new structure. Original investigation context retained below for historical reference.

---

**Status:** The landing-page splash heading «Звездите имат какво да
ти кажат.» renders with the trailing «кажат.» portion clipped on the
right side at default desktop viewport widths. Likely causes: a
`max-width` or container `overflow-hidden` constraint cutting the
gradient/clip-path text; insufficient inline-padding compensation;
or a `bg-clip-text` gradient mask that fails at sub-pixel positioning
at certain viewport widths.

**Trigger:** Pre-launch landing-page polish, OR whenever the landing
splash component is next touched. May surface earlier as a
public-visibility concern if landing traffic begins before the
polish sub-round.

**Sub-round when ready:** Dedicated landing-page sub-round, OR fold
into a Phase D launch-readiness pass.

**Fix path:** Inspect the splash heading container's CSS — likely
candidates: a `max-w-*` Tailwind utility that is too tight, an
`overflow-hidden` cascade from a parent decorative container, or a
`bg-clip-text` gradient that fails to render the final glyph at
certain widths. Browser dev tools width-resize can isolate the
breakpoint at which clipping starts. Fix with a wider container,
additional `pr-*` inline padding, or a different gradient-text
technique.

**Why documented:** Surfaced during sub-round 4.0 founder web
walkthrough. User-visible at the very first impression of the brand
but out-of-scope for mobile birth-wizard work. Logged for a dedicated
landing-page polish pass.

## 15. Clerk application display name still references «celestia» — CLOSED 2026-05-12

**Resolution (out-of-band founder operational task 2026-05-12, no commit
hash):** Founder updated the Clerk Dashboard Application settings →
display name field from «celestia» to «Stellaeum». No code change
required — the display name is a Clerk-side configuration value read at
runtime by Clerk-hosted UI surfaces (password re-entry modal, hosted
account pages). Founder smoke-tested 2026-05-12 alongside the B.0g chain:
the password re-entry modal and other Clerk-hosted surfaces now display
«Stellaeum». Closed-by-operational-action; closure logged here during
B.0g close to keep the REVISIT lifecycle on a single timeline. Original
investigation context retained below for historical reference.

---

**Status:** During sub-round 4.3 founder verification of mobile sign-up
+ sign-in flows, the Clerk-managed password re-entry modal displayed
the application name as «celestia» rather than the renamed
«Stellaeum». The sub-round 3 Layer 2 dashboard rename pass missed the
application/display name setting in the Clerk dashboard — it is a
separate field from the internal project name and from URL slugs.

**Trigger:** Discovered during sub-round 4 verification.

**Sub-round when ready:** Founder dashboard task (~2 min).
NOT blocking sub-round 4 mobile birth-wizard work.

**Fix path:** Clerk dashboard → Application settings → set
application/display name to «Stellaeum». No code change.

**Why documented:** Founder-observed user-visible drift from the
brand rename. Easy fix but easy to lose track of without a logged
item.

## 16. Mobile sign-up form missing firstName + lastName — CLOSED 2026-05-12

**Resolution (B.0g-2 close 2026-05-12, commit `a75f873`):** Added «Име»
and «Фамилия» TextInputs to `apps/mobile/app/(public)/sign-up.tsx`
custom signup form (mobile uses custom UI, not Clerk's prebuilt
`<SignUp>` like web — only mobile-side fix needed). Labels mirror Clerk
bgBG `formFieldLabel__firstName` / `formFieldLabel__lastName` verbatim
per D2 mirror discipline (no net-new strings). Both fields client-side
required via `canSubmit` gate; passed to `signUp.create({ firstName,
lastName, emailAddress, password })`. Founder concurrently toggled
Clerk Dashboard "Require first and last name" to ON 2026-05-12 — names
are now server-side required, so the client-side requirement enforces
matching state. Founder smoke-tested 2026-05-12: fresh signup collects
both names, Clerk accepts the payload, Днес greeting block renders the
real firstName instead of the «Потребител» fallback, «Ти» tab name
displays correctly without the email-prefix fallback. Original
investigation context retained below for historical reference.

---

**Status:** Web sign-up form requires `firstName` and `lastName`
fields at signup; mobile sign-up (`apps/mobile/app/(public)/sign-up.tsx`,
sub-round 1.4b) collects only `emailAddress` and `password`. New
mobile users land in the app without a profile name and cannot fill
it without a manual edit step later. Real divergence between web
and mobile auth surfaces; not caught at sub-round 1.4b verification.

**Trigger:** Pre-launch UX consistency pass, OR whenever the mobile
auth flow is next touched.

**Sub-round when ready:** Mobile auth polish sub-round (could fold
into a future "mobile UX consistency" sub-round).

**Fix path:** Add `firstName` and `lastName` `TextInput` fields to
`apps/mobile/app/(public)/sign-up.tsx`, mirroring web's signup form
layout. Pass them to `signUp.create({ emailAddress, password,
firstName, lastName })`. Bulgarian copy mirrors web's existing labels
(shared surface → direct mirror).

**Why documented:** Surfaced during sub-round 4 founder verification
while creating fresh test accounts. Web/mobile parity ought to be
tighter; missing fields create downstream profile-display issues
(e.g., the `Ти` tab's name display falls back to email-prefix).

## 17. Web TIME_RANGES hour string formatting asymmetry — CLOSED-BY-FIX 2026-07-21

**Resolution (PRE-LAUNCH-POLISH-BATCH close 2026-07-21, mechanical commit):** Normalized the evening range's hour string from `'18:00–23:59'` to `'18 - 24'` in both `apps/web/components/birth-data/TimeStep.tsx` and mobile's mirrored `apps/mobile/app/(authed)/wizard/time.tsx` `TIME_RANGES` array — now all four ranges use the consistent hyphen+HH format. (A separate, already-internally-consistent `TIME_RANGE_LABELS` map in `apps/mobile/app/(authed)/wizard/confirm.tsx` uses full `HH:MM–HH:MM` for all four ranges including evening's `23:59` boundary — that one was not touched; it isn't the asymmetry this REVISIT described.) TS-green verified. Original investigation context retained below for historical reference.

---

**Status:** The shared `TIME_RANGES` data source on web uses inconsistent
hour-string formatting across the four ranges:

- morning: `'06 - 12'`
- afternoon: `'12 - 18'`
- evening: `'18:00–23:59'` ← different format (HH:MM with en-dash)
- night: `'00 - 06'`

The evening range uses an en-dash + HH:MM format while the other three
use a hyphen + HH format. Mobile mirrors web verbatim per shared-surface
mirror discipline (sub-round 2.5 ratification), so the inconsistency
surfaces on mobile as well. Pre-existing web bug not introduced by mobile
sub-round 4.4.

**Trigger:** Pre-launch UX consistency pass, OR whenever `TIME_RANGES`
is next touched on web.

**Sub-round when ready:** Web-side data normalization. Pick one format
(likely `'18 - 24'` to match the others, or normalize all four to
`'HH:MM–HH:MM'`). bulgarian-skill calibration only if framing copy
around the value changes. Mobile inherits the change automatically via
shared mirror discipline.

**Why documented:** Surfaced during sub-round 4.4 mobile time-step
verification. Not blocking sub-round 4 because the asymmetry exists
on the web surface that mobile is mirroring; correcting it
unilaterally on mobile would create web/mobile drift, which is the
opposite of what the mirror discipline intends.

## 18. iOS exact-time picker — custom built; revisit if Apple Developer enrollment unblocks Path B

**Status:** `apps/mobile/components/wizard/TimePicker.tsx` (sub-round 4.4-fix-9, ~190 lines) replaces `@react-native-community/datetimepicker` mode='time' on iOS after 8 hypothesis-driven fix attempts on the library failed. Two-column FlatList wheel picker (hours 00-23, minutes 00-59), HH:MM strings throughout (no Date objects, no timezone surface), `Haptics.selectionAsync()` per snap tick, center selection band overlay, commit-on-any-dismiss semantic. Android keeps the existing imperative `DateTimePickerAndroid.open()` for parity with working production code (D-4.4-fix9-1 ratification).

**Why custom-built:** The community library's iOS mode='time' implementation re-anchors any inbound Date to 1970-01-01 internally and exhibits at least three distinct failure modes (controlled-component snap-back, JS-vs-native version-mismatch when JS upgraded ahead of Expo Go's bundled native, range-constraint when value is epoch-anchored). Path B (library swap to `react-native-date-picker`) was investigated during the saga and rejected for two reasons: (a) Expo Go incompatibility — requires Dev Client which requires Apple Developer enrollment per REVISIT-TRIGGERS item 1; (b) open RN 0.81 + New Architecture crash issues against the latest 5.0.13 release with no maintainer response on the issue tracker.

**Trigger to revisit:** Apple Developer Program enrollment lands (currently REVISIT-TRIGGERS item 1 deferred to Phase D). With Dev Client available, `react-native-date-picker` becomes a viable swap. The custom picker is fine to keep; reconsidering only if visual consistency with the date picker (which still uses `@react-native-community/datetimepicker`) becomes a UX concern, OR if a dedicated polish sub-round wants to replace both the date and time pickers with a single library for parity.

**Sub-round when ready:** Phase D pre-launch UI polish OR dedicated mobile picker-parity sub-round. NOT blocking sub-round 4 close — current implementation works correctly.

**Re-add path (if migrating to `react-native-date-picker`):**
- `pnpm exec expo install react-native-date-picker` from `apps/mobile`
- Verify RN 0.81 + Fabric crashes (issues #945, #937, #940) resolved in current release
- Replace `apps/mobile/components/wizard/TimePicker.tsx` with library's `<DatePicker modal mode="time" .../>`
- Optionally migrate Android time picker (currently on community datetimepicker) for parity
- Verify Bulgarian locale + 24-hour mode + dark theme via library props

**Why documented:** Saga consumed ~7 hours of fix-attempt cycles before custom build resolved it. Future Claude session encountering similar library-vs-native mismatch on iOS picker should consider custom build as a first-class option after 2-3 failed fix attempts, not as a last resort. Lessons captured in `SUB-ROUND-4-CLOSE.md` "Picker saga retrospective" section.

## 19. VirtualizedList nested in ScrollView warning in CitySearch

**Status:** RN dev tools surfaces "VirtualizedLists should never be nested inside plain ScrollViews with the same orientation" warning when the city autocomplete dropdown is open. Source: `apps/mobile/components/wizard/CitySearch.tsx`'s `FlatList` (dropdown results, max 280px height with `nestedScrollEnabled`) renders inside `apps/mobile/app/(authed)/wizard/location.tsx`'s parent `ScrollView`. Performance warning only — app functions normally, warning is dismissible.

**Why deferred:** Cities list is bounded (`/api/cities/search` returns max 20 results per query per `apps/web/app/api/cities/search/route.ts:26`). Virtualization defeat is negligible at this size. Refactoring location.tsx to avoid the nested-scroll pattern would require either (a) replacing the parent `ScrollView` with `FlatList` using `ListHeaderComponent`/`ListFooterComponent` for the static content, OR (b) moving the CitySearch dropdown outside the ScrollView via Modal/portal pattern. Both are non-trivial changes orthogonal to sub-round 4's wizard-shippability goal.

**Trigger:** Dedicated wizard polish sub-round OR user feedback flagging lag in city autocomplete on slower devices. Could surface earlier if React Native deprecates the warning to an error in a future RN version.

**Sub-round when ready:** Dedicated mobile polish or perf sub-round.

**Fix path:**
- Option A: `location.tsx` `ScrollView` → `FlatList` with `data=[1]` and the wizard content rendered via `ListHeaderComponent`. CitySearch's FlatList becomes a sibling, not nested.
- Option B: Move CitySearch dropdown into a Modal-style overlay using RN's `Modal` component. Search input stays in the parent ScrollView, dropdown renders as a separate native window.
- Option C: Accept as performance trade-off given small list size; suppress warning in dev builds via `LogBox.ignoreLogs(['VirtualizedLists should never be nested'])` if visual noise becomes a focus issue.

**Why documented:** Surfaced during sub-round 4.7 verification. Not blocking; not bug-class severity. Future maintainer evaluating mobile perf should know this is an acknowledged trade-off, not a missed warning.

## 23. Web Oracle cap-reached path fails silently (post 2026-04-20 cap-gate refactor) — CLOSED 2026-05-10

**Resolution (B.0f-2-fix-1 close 2026-05-10):** Web hook `useOracleReading.ts` refactored from `useCompletion` (opaque error.message format, SDK-version-dependent) to manual fetch + ReadableStream + AbortController, mirroring mobile's pattern. 429 responses are now parsed as JSON before any stream-reader path is entered, and `code: 'CAP_REACHED'` maps to a structured `generationError: { kind: 'cap-reached', cap }` discriminated union exactly like mobile's hook. Web `CapReachedNotice` ported from `apps/mobile/components/oracle/CapReachedNotice.tsx` to `apps/web/components/oracle/CapReachedNotice.tsx` (web JSX + Tailwind adaptation; same Bulgarian copy, same accessibility-text role). Bulgarian copy unified across both surfaces with Variant 2 monthly framing (B.0f-2-fix-1 ratification): «Изчерпа {cap} безплатни четения за този месец. Звездите ще говорят отново идния месец.» — replaces mobile's prior daily-framed copy now that B.0f-1 made the cap monthly. `OraclePanelGlobal.tsx` destructures `generationError` and renders `<CapReachedNotice>` between the empty-state and stream branches; dead `LockedTopicTeaser` import + render block dropped. Original investigation context retained below for historical reference.

---

**Status:** `apps/web/components/oracle/OraclePanelGlobal.tsx` destructures
`useOracleReading()` but does NOT render its `error` state. When a free-tier
user hits the daily cap, `/api/oracle/generate` returns 429 with body
`{ code: 'CAP_REACHED', cap, tier }`; `useCompletion` rejects, `error` is
set on the hook, and the panel shows nothing. The pre-refactor scaffolding
— `LockedTopicTeaser` + `lockedTopicShown` state — is still in the file
but `setLockedTopicShown(topic)` is never called from any code path.

Mobile (sub-round 7.4) actively wires the same 429 response into a
`CapReachedNotice` text-only surface, intentionally diverging from web
to ship a usable cap-reached state. Per founder ratification (SR 7
discussion): mobile leads here; web catches up later.

**Trigger (RECLASSIFIED 2026-05-09 at Phase A close ratification):**
**Phase B middle weeks — fires before soft-launch milestone, not "next
time someone touches OraclePanelGlobal" as originally scoped.** Soft
launch invites 50–100 Bulgarian users to both TestFlight and the live
web product; web users hitting the cap-reached state with no UI
feedback is a real soft-launch UX gap (web is still the discovery
surface for the founder's network and SEO acquisition is on the v1.0
roadmap). Mobile's CapReachedNotice serves as the parity reference;
porting the text-only notice to web is mechanical (~30 LOC).

The reclassification ambiguity flagged at Phase A close (founder noted
"REVISIT-23 (TestFlight)" which doesn't match this item's actual web
cap-reached scope — see PHASE-A-CLOSE-RATIFICATION.md note) is the
trigger to revisit alongside Phase B's web-parity sub-round.

**Sub-round when ready:** Phase B web-parity sub-round, mid-phase. Could
batch with: deciding the fate of dead `LockedTopicTeaser` scaffolding
(delete or revive in a different shape), and wiring an equivalent
text-only notice on web. NOT a launch-blocking hard correctness gate
but is a soft-launch UX completeness item.

**Fix path:**
- Detect 429 + `code: 'CAP_REACHED'` in `useOracleReading.ts` (web hook)
  and expose a typed cap-reached error similar to the mobile hook's
  `GenerationError` discriminated union.
- Render that state in `OraclePanelGlobal.tsx` next to (or instead of)
  the saved-reading view when active.
- Decide: reuse the existing `LockedTopicTeaser` blur+CTA component
  (and wire a real upgrade path), OR mirror mobile's text-only notice
  for parity until paywall surfaces are unified.
- Delete the dead `lockedTopicShown` state if option B.

## 24. iOS edge-swipe and Android hardware back bypass Oracle reading-view back handler — CLOSED-BY-FIX 2026-07-21

**Resolution (PRE-LAUNCH-POLISH-BATCH close 2026-07-21, mechanical commit):** Implemented Option A from the filed fix path — `apps/mobile/app/(authed)/oracle.tsx`'s `OracleScreenInner` now wires `navigation.addListener('beforeRemove', ...)` (via `useNavigation()` from `expo-router`) in a `useEffect`. When `activeTopic` is set, the listener calls `e.preventDefault()` and `clearActiveTopic()` instead of letting the pop proceed — catching iOS edge-swipe-back and Android hardware back through the same code path the existing `headerLeft` tap uses. TS-green verified; device-level gesture verification still owed (see close smoke-test checklist). Original investigation context retained below for historical reference.

---

**Status:** SR 7.8 added a custom `headerLeft` to the Oracle screen that
branches on `activeTopic` — when a reading is open, the header back
arrow clears local state and returns to the topic grid; otherwise it
falls back to `router.back()` and pops to dashboard. This works for the
visible header arrow but does NOT intercept two other back affordances:

- **iOS edge-swipe-back gesture.** Swiping from the left edge while
  inside a reading triggers the native pop animation directly through
  `expo-router`'s underlying `react-native-screens` stack — it skips the
  React-side `headerLeft` handler entirely. Result: user is popped to
  dashboard instead of returning to the topic grid.
- **Android hardware back button.** The system back button fires through
  `BackHandler` and `navigation.goBack()`, which also bypasses the
  custom `headerLeft`. Same end-state as iOS edge-swipe.

`apps/mobile/app/(authed)/oracle.tsx` renders both topic grid and
reading view inline gated by `activeTopic` local state from
`useOracleReading`; the only path that observes that state is the
`headerLeft` button.

**Why deferred:** Founder spec for SR 7.8 explicitly scoped to "back
arrow only." SR 7 is closing on the visible-header behavior; SR 7.8
commit body documents the gap. Not a regression — the inline-state
pattern is novel to SR 7, so this is "incomplete" rather than "broken".
Real users will encounter it: iOS users swiping back is common.

**Trigger:** Post-Phase-A polish OR user feedback flagging "Oracle back
gesture pops me to Днес." Could surface earlier if SR 8 push notifications
deep-link into a specific topic and a back-gesture-pop UX gap creates a
loop.

**Sub-round when ready:** Dedicated mobile UX polish round, OR fold into
SR 8 if push deep-links land there.

**Fix path (two viable options):**

- *Option A (recommended): hijack the navigation event.* Use
  `useFocusEffect` + `navigation.addListener('beforeRemove', ...)` in
  `OracleScreenInner`. When `activeTopic` is set, call
  `e.preventDefault()` and `clearActiveTopic()` instead. Catches both
  edge-swipe and hardware back through the same code path. ~20 LOC.
- *Option B: split into two routes.* Move the reading view out of
  `oracle.tsx` and into `oracle/[topic].tsx`. Topic grid pushes
  `oracle/love`, reading view is a real route, native back stack handles
  everything. Larger refactor (~80 LOC + URL-state plumbing) but removes
  the inline-state-vs-navigation impedance mismatch entirely. Pairs well
  with eventual deep-link support from push notifications.

**Why documented:** Surfaced during SR 7 verification (chart-bearing
account, iOS), founder ratified scoping SR 7.8 to header-only and
filing the gesture/hardware-back gap here. Future maintainer touching
the Oracle screen should know the inline-state-gated pattern has known
gaps the route-split fix would close cleanly.

## 25. RevenueCat SDK install + provider scaffold deferred to Phase B opening sub-round

**Status:** SR 8 originally scoped 8.4 as a code-side scaffold for
`react-native-purchases` (RevenueCat SDK install + provider context +
`Purchases.configure()` at app root, ~60 LOC). Deferred per founder
ratification 2026-05-09 in favor of moving the install to the Phase B
opening sub-round.

**Why deferred:** SDK churn risk over the ~6–8-week gap between Phase A
close and Phase B paywall work. The provider does nothing useful until
Phase B's "Днешен ден в твоя кръг" paywall opens; installing it now
just means we'd ship JS bundle weight for code that has no callers,
plus we'd need to track and apply any breaking SDK updates between
install and use. RevenueCat publishes regular SDK updates; pinning a
6-8-week-old version at Phase B opening would force a forced upgrade
on the founder before paywall code lands.

The actual lead-time work (RevenueCat dashboard config — products,
entitlements, offerings + Apple App Store product config) is
founder-track, not code, and proceeds in parallel during Phase A
close. Apple App Store product config has 1–2 week lead time per the
SR 8 brief; founder begins this when Apple Developer Program
enrollment lands.

**Trigger:** Phase B opens. The first sub-round of Phase B should
either be the RevenueCat code-side scaffold (~60 LOC: SDK install +
`<RevenueCatProvider>` component + `Purchases.configure()` with
platform-split keys per ratified D10), OR fold it into the same commit
as the first paywall UI sub-round if they're cohesive — founder call
at Phase B planning.

**Sub-round when ready:** Phase B opener. Decision points carried
forward from D9/D10:
- D9: dedicated `<RevenueCatProvider>` component vs top-level wrap in
  `apps/mobile/app/_layout.tsx`. Default ratification: dedicated
  provider component (mirrors Clerk's structure).
- D10: `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` + `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
  with `Platform.select()` per RevenueCat best practice.

**Re-add path:**
- `pnpm exec expo install react-native-purchases` from `apps/mobile`
- Verify SDK 54 + RN 0.81 + Reanimated 4 compat at Phase B time
  (Context7 docs check before install, per the halt-trigger discipline)
- Wire `<RevenueCatProvider>` per D9 ratification
- Wire `Purchases.configure({ apiKey: Platform.select({ ios: ..., android: ... }) })`
  per D10
- Founder loads RevenueCat dashboard config (entitlements, offerings)
  before paywall UI work

**Why documented:** Founder ratified the deferral 2026-05-09 in the SR 8
investigation thread. SR 8 closes Phase A's launch-readiness infra DOD
minus this one item — Phase B opener is the explicit trigger so the
deferral doesn't go quiet between rounds.

## 26. push_tokens schema + RLS + token registration endpoint design — CLOSED 2026-08-03 (P.16)

**Resolution (P.16 build, 2026-08-03):** `push_tokens` table + RLS shipped in `supabase/migrations/20260803070000_push_tokens.sql` (columns match the spec below exactly: `id, user_id, token, platform, device_id, registered_at, revoked_at, last_sent_at`; FK to `users.clerk_id` ON DELETE CASCADE, mirroring `push_subscriptions`). `POST /api/push/register` added at `apps/web/app/api/push/register/route.ts`, upserting on `(user_id, device_id)`. Mobile-side: `registerPushToken()` in `maybePromptPushPermission.ts` now calls it after the AsyncStorage stash. Delivery: the existing `daily-horoscope` cron extended with a `sendMobilePush()` step (Expo push via `expo-server-sdk`, DeviceNotRegistered receipts revoke the token). Cleanup cascade: `cleanup-deleted-accounts` cron now also deletes `push_tokens` rows for a deleted user, matching its existing per-table delete style. Classified USER_DATA in `.planning/SECURITY-MODEL.md`. End-to-end delivery to a real device is unverified until P.17/SR9 (Dev Client) per REVISIT-27 — schema/RLS/endpoint/cron logic were verified without a device (see P.16 close notes).

**Status:** SR 8.3 scaffolds the iOS/Android push permission flow
(`apps/mobile/lib/notifications/maybePromptPushPermission.ts`), but per
founder D7 modification 2026-05-09 the token retrieval result lives in
AsyncStorage only — no Supabase migration, no `push_tokens` table, no
backend registration endpoint. Token stash key:
`@stellaeum/push_token`.

**Why deferred:** Phase A's §13.5 requirement is "permission scaffold
(no notifications yet, just the plumbing)" — token storage on the
device satisfies the scaffold scope. Backend integration only matters
when Phase B's push delivery work opens, and the schema decision is
non-trivial:

- Token has metadata (platform iOS/Android, device id, registered_at,
  revoked_at lifecycle) that doesn't fit a JSONB array on `users`
- Multi-device support (same user on iPhone + iPad) needs a 1:N table,
  not a column
- Revocation handling (token rotation, app uninstall) needs a
  registration endpoint that can mark old tokens as revoked
- Cleanup cadence (stale tokens older than N days with no successful
  send) is a separate cron concern

Designing all of this now without a concrete delivery target risks
shipping schema that doesn't match Phase B's actual push needs.

**Trigger:** Phase B push delivery sub-round opens. Per
`MOBILE_UX_RESEARCH.md §10` Phase B exit criteria, push fires daily
horoscope at the user's pattern-time (23.5h rule), so the schema +
endpoint must land before that.

**Sub-round when ready:** First Phase B push-delivery sub-round.
Likely scope:
- Supabase migration: `push_tokens` table with columns
  `(id, user_id, token, platform, device_id, registered_at,
  revoked_at, last_sent_at)` + RLS so users can only see their own
  tokens
- API route `POST /api/push/register` accepting `{ token, platform,
  device_id }` from the mobile client, upserting on
  `(user_id, device_id)`
- Mobile-side: extend `maybePromptPushPermission` to call
  `/api/push/register` after AsyncStorage stash on grant; or add a
  separate sync hook that runs on app open to upload any locally
  stashed token
- Cleanup cron extending `cleanup-deleted-accounts` GDPR cascade
  pattern to also revoke tokens on account deletion

**Why documented:** Token registration is the gate between scaffolded
permission and actual push delivery. SR 8.3 commit message references
this revisit; logging here so the schema design isn't a surprise at
Phase B opening.

## 27. Push token retrieval verification post-Dev Client

**Status:** `getExpoPushTokenAsync` rejects on Expo Go SDK 49+ — the
call requires a Dev Client / standalone build. SR 8.3's scaffold catches
the rejection via `logError('ERR-MOB-PUSH-005', err)` and keeps the
`@stellaeum/notif_prompted` flag set on the device, which means the
prompt won't re-fire even though token retrieval silently failed.

This is by design for the SR 8 scaffold scope: the permission prompt
itself is verifiable in Expo Go (system API works), and the failure
path is logged. But the token retrieval branch — the actual
`getExpoPushTokenAsync` → AsyncStorage stash → Sentry breadcrumb chain —
is unverified in Phase A.

**Trigger (CONFIRMED 2026-05-09 at Phase A close ratification):**
**SR 9 EAS Dev Client build at end of Phase B, alongside the soft-launch
milestone.** REVISIT-1 was reclassified to the same trigger window —
both items fire together at the Phase B close SR 9 build. The original
handoff doc placed SR 9 (EAS + TestFlight + biometric, bundled per
REVISIT-1) at "late Phase C / early Phase D, before App Store
submission." Phase A close ratification confirmed the reframe: TestFlight
cut is the soft-launch milestone (50–100 Bulgarian users), not GA
submission, so SR 9 pulls forward by ~2–3 months.

REVISIT-1, REVISIT-23, and this item were all examined in the Phase A
close planning sweep (this commit). Trigger conditions now reflect the
actual sequence: REVISIT-1 → SR 9 at Phase B close; REVISIT-23 → Phase B
mid-phase web-parity sub-round; REVISIT-27 → SR 9 alongside REVISIT-1.

**Sub-round when ready:** SR 9 (Phase B close) — EAS Dev Client build
+ TestFlight provisioning + biometric (`expo-local-authentication`).
At that point, push token retrieval becomes testable end-to-end:

1. Manual reset on the test device:
   `AsyncStorage.removeItem('@stellaeum/notif_prompted')` and
   `AsyncStorage.removeItem('@stellaeum/push_token')`
2. Generate a fresh Oracle reading on the Dev Client / TestFlight build
3. Confirm Alert pre-prompt fires
4. Tap «Да, разказвай ми» → confirm iOS system dialog appears
5. Tap "Allow" → confirm AsyncStorage gets a real
   `ExponentPushToken[xxx]` value
6. Confirm Sentry breadcrumb posts "Push token registered" (info
   level)

If the EAS projectId is missing in `app.json` extra.eas at that point,
the scaffold logs a warning breadcrumb and exits cleanly — that's the
expected behavior pre-`eas init`. After `eas init`, the projectId
should be picked up automatically.

**Why documented:** Without this revisit, the token-retrieval branch
could ship to TestFlight unverified. The SR 8 commit body documents the
limitation but a separate REVISIT entry ensures the verification step
isn't lost in the Phase B push-delivery noise.

## 28. Recommendations state Supabase migration — cross-device sync

**Status:** Phase B Stream P P.7 ports `apps/web/components/stories/*` and `apps/web/lib/stories/catalog.ts` to mobile, and per founder ratification D7 (2026-05-09) uses **AsyncStorage** for the per-user `read/saved/skipped` state map — mirroring web's current localStorage stage (`stellaeum.stories.state.v1` storage key). The web `useStoryList.ts` docstring explicitly calls itself the "backend-swap boundary."

**Known trade-off accepted at Phase B opening:** web ↔ mobile state will NOT sync. A user who marks a recommendation as "read" on web will not see that state reflected on mobile, and vice versa. This is a deliberate Stream P ship-velocity trade-off — backend lift is a Phase C/D opt-in, not a Stream P requirement.

**Optional Stream P decision (P.7 investigation):** add an in-app notice clarifying the device-local persistence (e.g., «Препоръките ти се запомнят на това устройство») vs accept silent drift. Founder picks during P.7 investigation pass.

**Trigger:** Phase C/D revisits cross-device sync. Concrete signals that should drive prioritization:

- User feedback flagging "I marked X as read on web but it shows unread on mobile"
- Soft-launch users who use both surfaces report the friction
- A broader cross-device state-sync workstream opens (e.g., reading-history elsewhere in the app needing sync)

**Sub-round when ready:** A dedicated Stream-K-or-Phase-C migration sub-round. Likely scope:

- Supabase migration: `recommendation_state` table with columns `(user_id, recommendation_id, status, updated_at)` + RLS so users only see their own
- API route `GET/POST /api/recommendations/state` for read/write
- Replace `useStoryList` hook body on both surfaces — keep call sites unchanged, swap storage from localStorage/AsyncStorage to API-backed
- Migration path for existing local state: on first authenticated read, push existing local state to server (one-shot upload), then the server is canonical
- GDPR cascade: extend `cleanup-deleted-accounts` cron to drop `recommendation_state` rows on account delete

**Re-add path:** the `useStoryList` hook signature is the swap boundary — both surfaces consume it, both can be updated in one commit on each surface.

**Why documented:** Founder ratified the AsyncStorage choice with explicit acknowledgment of the silent-drift trade-off. Logging here so the migration isn't surprise scope when cross-device sync demand surfaces.

## 29. PostHog telemetry expansion to new mobile surfaces

**Status:** Phase B Stream P P.13 wires PostHog with the **10-event taxonomy locked at Phase A close ratification** (`app_opened`, `wizard_started`, `wizard_step_completed`, `wizard_completed`, `chart_viewed`, `oracle_opened`, `oracle_topic_selected`, `oracle_reading_generated`, `oracle_cap_reached`, `push_permission_prompted`/`response`). Per founder ratification D10 (2026-05-09): no event additions during Stream P.

**Acknowledged scope gap:** the 10-event taxonomy was locked before the Phase B parity reframe. New mobile surfaces shipping in Stream P (diary at P.4, recommendations at P.7, crystals collection at P.6, astrology guide at P.8, account settings at P.10, subscription management at P.9, pricing/Премиум destination at P.11) currently have **zero PostHog event coverage**. This is intentional — adding events for surfaces that don't yet exist would lock taxonomy against unbuilt UI; soft-launch users are the ones who generate the meaningful data.

**Trigger:** **4 weeks post-soft-launch when usage patterns are visible.** Concrete signals:

- PostHog dashboard shows surfaces with high traffic but no event coverage (the team can't answer questions about engagement on diary / recommendations / etc.)
- Soft-launch retention investigation needs cross-surface funnel data the current 10 events don't provide
- A specific paid-feature conversion question requires events that aren't in the taxonomy yet

**Sub-round when ready:** Phase C event expansion sub-round. Likely candidate events (NOT locked, surface in expansion sub-round investigation):

- `diary_entry_started`, `diary_entry_saved` (P.4 surface)
- `recommendation_opened`, `recommendation_marked_read`, `recommendation_dismissed` (P.7)
- `crystal_collected` (already partly covered via Crystal of the Day; expansion = collection-view interactions)
- `guide_section_viewed` (P.8)
- `settings_changed`, `account_deletion_requested`, `gdpr_export_requested` (P.10)
- `subscription_status_viewed`, `subscription_managed` (P.9)
- `paywall_shown`, `paywall_dismissed`, `paywall_converted` (P.11)
- `push_notification_tapped`, `push_notification_dismissed` (P.16 + delivery)

**Why documented:** Founder ratified the 10-event lock with explicit acknowledgment that new surfaces need coverage later. Logging here so the expansion isn't surprise scope at the 4-week post-soft-launch retro.

## 30. apps/web/lib/supabase/server.ts JWT fallback + public.ts cleanup (B.0e) — CLOSED 2026-05-09

**Resolution (B.0e close 2026-05-09):** Investigation pass found `createServerSupabaseClient` had **zero callers** in apps/web — the Phase 3 plan had aspirationally said "all API routes use it," but execution diverged to `createServiceSupabaseClient` + manual `user_id` filter universally. Founder ratified Option A: delete `server.ts` outright (rather than modernize it to the third-party-auth pattern), strip `public.ts` debug logs, and fold doc updates into the same sub-round (`RENAME.md` Pattern A claim superseded; `DATA_FETCHING_INVENTORY.md` line 181 marked deleted; `SECURITY-MODEL.md` gained a "Server-side access pattern" section). Doc-debt sweep across older planning docs filed as REVISIT-31. Mobile-side audit filed as REVISIT-32. Halt triggers preserved — neither surfaced. Original investigation context retained below for historical reference.

---

**Status:** Surfaced during B.0d audit 2026-05-09 while reading the Supabase factory map. Two concerns in the same file family:

**Concern A — `server.ts` JWT fallback path may be silently broken.**

```ts
// apps/web/lib/supabase/server.ts
let token: string | null = null
try {
  token = await session.getToken({ template: 'supabase' })
  console.log('[Supabase Server] Got Supabase token:', !!token)
} catch (e) {
  console.log('[Supabase Server] No Supabase JWT template, using default token')
  token = await session.getToken()
}

if (!token) {
  console.log('[Supabase Server] No token available, using anon client with userId header')
}
```

The function tries to fetch a Clerk JWT with the 'supabase' template, falls back to the default Clerk token if absent, falls back further to anon-client-no-token if both fail. Per SR 3 Layer 2 dashboard work, the 'supabase' template was created in Clerk on 2026-01-31 (Pattern A confirmed). But after the SR 3 Stellaeum rename + various Clerk dashboard touchpoints since, the template's existence and shape are unverified. **Current callers of `createServerSupabaseClient()` likely silently fall through to the default-token branch and may be sending tokens Supabase doesn't accept as auth context for RLS evaluation.**

This was masked pre-B.0d because most server-side queries used `createServiceSupabaseClient()` (service role bypass), so RLS state didn't matter. With B.0d's RLS lockdown in effect, any caller still using `createServerSupabaseClient()` against an RLS-protected table will silently get `[]` if the Clerk JWT template fallback is wrong.

**Concern B — `public.ts` debug `console.log` artifacts.**

```ts
// apps/web/lib/supabase/public.ts
console.log('[Supabase] URL present:', !!supabaseUrl, 'Key present:', !!supabaseAnonKey)
// ...
console.error('[Supabase] Missing env vars:', { supabaseUrl, supabaseAnonKey: supabaseAnonKey?.slice(0, 20) + '...' })
```

Diagnostic logs left in from a debugging session. Logs the existence of env vars on every `createPublicSupabaseClient()` call — clutters server logs and partially leaks the publishable-key prefix in error paths. Not security-critical (key is public anyway) but pollutes Sentry / Vercel logs.

**Trigger:** **Fires immediately after B.0d close — queued as B.0e** per founder spec 2026-05-09. Investigation-pass-first per speed-mode discipline.

**Sub-round when ready:** B.0e. Likely scope:

1. Inventory `createServerSupabaseClient()` callers via grep — list every API route + component that uses it.
2. Verify Clerk dashboard JWT template state — does 'supabase' template still exist? What's its current shape (claims, signing algorithm)? Does the template emit `sub` correctly for Pattern A RLS policies?
3. For each caller of `createServerSupabaseClient()`: confirm the table being queried is RLS-protected via the Clerk JWT path, not service-role-bypass. If RLS-protected and JWT template is broken, those queries are silently failing under the new B.0d lockdown.
4. Decide: fix the JWT template, OR migrate all callers to `createServiceSupabaseClient()` + manual user filter (the more common pattern in the codebase already).
5. Strip `console.log` debug artifacts from `public.ts`. Replace with `logError('ERR-WEB-SUPA-001', err)` if the env-var-missing path needs reporting (Sentry already wired in §10).

**Halt triggers:** if the JWT template state surfaces a Clerk dashboard config drift that affects mobile too (mobile uses a similar template via `accessToken()` in `apps/mobile/lib/api/client.ts`), expand B.0e scope to cover both surfaces.

**Why documented:** B.0d's audit + verification showed RLS now enforces correctly. But B.0d's SECURITY-MODEL.md INTERNAL/USER_DATA classifications assume the JWT path works for browser-side queries via `useSupabaseClient()`. The server.ts path is a parallel, less-used branch that may be silently broken — needs confirmation before Stream P sub-rounds start landing code that depends on it.

## 31. .planning/ doc-debt sweep — periodic execution-vs-aspiration audit

**Status:** Filed during B.0e close 2026-05-09. The B.0e audit surfaced multiple `.planning/` documents that cite Pattern A / "supabase JWT template" as live architecture, when in fact the codebase has been on the third-party-auth pattern for some time and `createServerSupabaseClient` was dead code. Examples found in B.0e:

- `.planning/research/DATA_FETCHING_INVENTORY.md:181` — load-bearing inventory table (updated inline in B.0e)
- `.planning/archive/RENAME.md:38` — Pattern A "RESOLVED" claim (updated inline in B.0e)
- `.planning/phases/phase-a-mobile-scaffold/SUB-ROUND-1-CLOSE.md:97, 153, 169, 195` — sub-round close referencing Pattern A as the active design (historical, not updated)
- `.planning/phases/phase-a-mobile-scaffold/SUB-ROUND-2-CLOSE.md:84, 130, 149, 168, 176` — sub-round close referencing Pattern A (historical, not updated)
- `.planning/phases/phase-a-mobile-scaffold/SUB-ROUND-3-CLOSE.md:102, 147` — close doc claiming Pattern A "RESOLVED" via dashboard verification (historical, not updated)
- `.planning/phases/phase-a-mobile-scaffold/HANDOFF-2026-05-08.md:278, 303, 320` — handoff lock claim (historical, not updated)
- `.planning/phases/03-birth-data-database/03-VERIFICATION.md:64` — claim "All API routes import and call createServerSupabaseClient()" was aspirational and false at the time
- `.planning/phases/03-birth-data-database/03-RESEARCH.md:537, 559, 592` and `03-01-PLAN.md:180, 257`, `03-03-PLAN.md:32-34` — Phase 3 plan/research artifacts that defined a server.ts that was never adopted

The pattern is **plan-doc claims diverging from codebase reality** as execution proceeds. Close docs and verification reports lock in a moment-in-time view that downstream readers (and Claude's planning agents) treat as canonical. When two or three sub-rounds later the implementation has drifted, the planning docs no longer reflect it.

**Trigger:** every 4–6 weeks **OR** when a planning doc gets cited as foundational for a new sub-round (read it first, verify the claim still holds, surface drift as a halt-trigger before proceeding).

**Sub-round when ready:** opportunistic standalone sub-round, scoped narrow: pick the top 5–10 `.planning/` docs by recency / citation-frequency, verify each "as of <date>" architectural claim against the current codebase, mark superseded claims with a one-line correction note pointing to the superseding sub-round (B.0e style).

**What NOT to do:** do not rewrite history. Close docs and handoffs are historical record. Add correction notes inline (`> SUPERSEDED 2026-05-09 by B.0e — see RENAME.md`) but preserve the original text so future archaeology still works.

**Why documented:** the cost of stale planning docs compounds — by the time someone (Claude or human) cites a months-old "RESOLVED" note as load-bearing, the cost of the unverified claim can be hours of investigation or, in the worst case, a B.0d-class incident built on a foundation nobody re-checked.

## 32. Audit `apps/mobile/*` for direct Supabase-anon usage drift — CLOSED 2026-05-12

**Resolution (P.2-a close 2026-05-12, commit `0c651a5`):** Pre-flight audit in P.2's investigation pass scanned `apps/mobile/` for `from('`, `createClient`, and `useSupabaseClient` — zero callers anywhere. The lone `useSupabaseClient` hook at `apps/mobile/lib/supabase/client.ts` had no consumers (declared, never used). All mobile data fetching routes through `apps/mobile/lib/api/client.ts`'s `apiFetch` via Clerk Bearer to web API routes; mobile is structurally incapable of hitting Supabase directly. **No silent-break risk under B.0d RLS lockdown.** Pattern exactly mirrors the web `createServerSupabaseClient` situation pre-B.0e. Path B cleanup applied at P.2-a: dead `apps/mobile/lib/supabase/client.ts` + empty parent directory deleted; `@supabase/supabase-js` dropped from `apps/mobile/package.json` (~200KB+ off the mobile bundle); `pnpm-lock.yaml` updated. Original investigation context retained below for historical reference.

---

**Status:** Filed during B.0e close 2026-05-09. B.0e was scoped to web (`apps/web/lib/supabase/`) per the locked sub-round chain. The parallel mobile inventory hasn't been audited under post-B.0d conditions.

**Concern:** mobile may have direct `supabase.from('<table>').select(...)` calls using the publishable anon key — which under pre-B.0d conditions returned data freely from RLS-disabled tables. Now that the B.0d lockdown is live, those same paths return `[]` (INTERNAL/USER_DATA without auth) and the mobile app may be silently losing data. Conversely, some mobile callers may correctly route through Clerk-authed `accessToken` and work fine — the audit is to confirm which is which, not to assume drift.

**Trigger:** opportunistically during any mobile sub-round that touches data fetching (most of Stream K's Кръг ports will), **OR** before SR 9 soft-launch readiness check — whichever comes first.

**Sub-round when ready:** likely a 30–45 minute standalone audit:

1. Grep `apps/mobile/` for `from('`, `createClient(`, and `useSupabaseClient`.
2. For each reach: confirm it's authenticating via `accessToken()` callback with a live Clerk session, OR routing through an API endpoint, OR using anon for explicitly CATALOG tables (`bulgarian_cities`, `crystals`, `crystal_listings`, `crystal_vendors`).
3. Surface any direct anon read against an INTERNAL or USER_DATA table — those would be silently broken under B.0d lockdown.

**Why documented:** B.0d remediation was applied at the database layer and verified via REST-API curl audit. The web audit (B.0e) confirmed the data-fetching pattern is uniform. Mobile is the parallel surface where the same audit hasn't been performed and where a different historical implementation pattern could exist.

## 33. Orphaned `payment.webhook_received` flat audit type entry in `apps/web/lib/audit.ts` — CLOSED 2026-05-10

**Resolution (B.0f-1 close 2026-05-10):** Removed the flat `'payment.webhook_received'` line from the `AuditEventType` union in `apps/web/lib/audit.ts`. Pre-removal grep confirmed zero callers in `apps/web/` — only the union declaration itself referenced it. New `'system.payment.quota_refund_failed'` audit type added in the same commit (consumed by `apps/web/lib/subscriptions/quota.ts` decrementQuotaUsage refund-failure path). TS green pre-commit. Original surface context retained below for historical reference.

---

**Status:** Filed during B.0c-6 close 2026-05-10. B.0c-3 ported CA-0002's webhook route, which uses the hierarchical audit name `system.payment.webhook_received` instead of the prior flat `payment.webhook_received`. The flat union member at `apps/web/lib/audit.ts:23` is now orphaned — no remaining caller in the codebase imports or emits it.

**Concern:** purely a hygiene issue. A type-union entry with no producers and no consumers is dead surface area. Leaving it in place doesn't break anything; removing it tightens the type contract by one row.

**Trigger:** opportunistic — fold into any sub-round that touches `apps/web/lib/audit.ts` for other reasons (e.g., a future audit-event taxonomy expansion under D10 / REVISIT-29 PostHog wiring overlap, or a Phase C audit-event consolidation pass). Do not open a standalone sub-round for this — too small to justify the overhead.

**Sub-round when ready:** opportunistic, ~1-line edit:
1. Verify via `grep -rn "payment.webhook_received" apps/web/` that the flat name has zero callers (the CA-0002-derived hierarchical names — `system.payment.webhook_received`, `system.payment.webhook_ignored`, `system.security.stripe_ownership_mismatch` — should be the only ones in use).
2. Delete the `'payment.webhook_received'` line from the `AuditEventType` union at `apps/web/lib/audit.ts`.
3. `npx tsc --noEmit` green check.

**Why documented:** captures the intentional hierarchical-naming migration completed in B.0c-3 + leaves a low-priority cleanup hook for the next reader who touches the file. Without this note, a future reader might re-add the flat name on assumption it's still active.

## 34. Cap magnitude re-evaluation post Кръг soft-launch close (Path Z experimental framing)

**Status:** Filed during B.0f-3 close 2026-05-10. The free-tier monthly cap of 3 readings is **deliberately experimental** (Path Z framing per founder ratification at B.0f opening). Schema default `ai_readings_limit=3` IS the cap, NOT a placeholder; env-var `ORACLE_FREE_MESSAGES_PER_DAY` was deleted as canonical-source-of-truth-cleanup. The 3/month value is a soft-launch experiment chosen for the pre-Кръг window where Oracle uncap is the only premium value proposition; it is ~30× tighter than the prior effective rate (3/day ≈ 90/month) and may be too restrictive once Кръг features land and broaden the premium tier's value.

**Trigger:** post-Phase-B soft-launch close, OR 4 weeks of soft-launch usage data — whichever first.

**Decision criteria** (from PostHog telemetry once P.13 wiring lands):
- Conversion rate: free → premium attribution rate. If <2% over 4-week window, cap may be too restrictive (users churning rather than converting).
- Churn rate: 30-day retention of free users. Drop-off correlated with `oracle_cap_reached` events suggests the cap is the friction point.
- Daily active free users: aggregate engagement of free users hitting the cap-reached state. Low DAU + high cap-reached frequency = cap is product-blocking, not conversion-driving.
- `oracle_cap_reached` event frequency from PostHog (event #9 in the 10-event taxonomy — already on the locked taxonomy list per HANDOFF item 2.D10).

**Sub-round when ready:** Phase C onset OR post-soft-launch retro. Likely scope:
1. Pull PostHog data on the four metrics above for the 4-week soft-launch window.
2. Decide: keep 3/month, raise to 10/month, raise to 90/month (parity with prior daily rate), or restructure entirely (per-surface buckets, regenerations counted, etc.).
3. Update schema default via migration (single ALTER TABLE statement on `subscription_quotas`).
4. Update Bulgarian copy if cap value changes (single string interpolation already pulls from `quota.limit`, so copy auto-updates with schema).

**Why documented:** the 3/month cap is intentionally tight for soft launch but is NOT a permanent design decision. Without this REVISIT, the cap could ossify by inertia. Filing here makes the experimental nature explicit and gives future-Toni/Claude a clear reconsider trigger backed by data.

## 35. m3-uat harness disposition — rewrite vs delete

**Status:** Filed during B.0f-3 close 2026-05-10. B.0f-2 added a fail-fast `throw` at the top of `apps/web/scripts/m3-uat-harness.mjs`'s `main()` because the cap-gate test block (lines 745–~935) was predicated on the OLD `ai_readings`-row-count cap mechanism — now obsolete after B.0f-2 migrated the cap to `subscription_quotas`. The harness has not been run in 8+ sub-rounds (vestigial from milestone 3); pre-existing `.planning/phases/m3-uat/RESULTS.json` working-tree drift confirms it's not in active rotation.

**Concern:** harness is now hard-failing at first invocation. This is intentional (signals out-of-date status to anyone running it) but leaves a decision pending: rewrite the cap-gate block to pre-seed `subscription_quotas` rows via service role, OR delete the harness entirely if a proper API integration test layer (REVISIT-36) replaces it.

**Trigger:** decided alongside REVISIT-36 (API test layer evaluation), since the rewrite-vs-delete question depends on whether m3-uat is the test infrastructure going forward OR whether something modern (vitest+msw, playwright) replaces it.

**Sub-round when ready:** opportunistic — likely folded into the same sub-round that resolves REVISIT-36. Two paths:
- **Rewrite path:** ~80 LOC update to the cap-gate test block. Pre-seed `subscription_quotas` row with `ai_readings_used=ai_readings_limit` instead of `ai_readings` rows. Verify cap-reached, cache-bypass, premium-bypass, below-cap behaviors against the new mechanism. Keeps m3-uat as the regression coverage harness.
- **Delete path:** remove `apps/web/scripts/m3-uat-harness.mjs` and `.planning/phases/m3-uat/RESULTS.json` entirely. Replace coverage with whatever test layer REVISIT-36 picks. Cleanest if the new test layer covers the same scenarios.

**Why documented:** the fail-fast throw is a stopgap, not a resolution. Without this REVISIT, the harness rots in place indefinitely. Decision tied to REVISIT-36 outcome.

## 36. API integration test layer evaluation — RE-CLASSIFIED 2026-07-21 (still OPEN, needs dedicated sub-round)

**Re-classification note (PRE-LAUNCH-POLISH-BATCH investigation 2026-07-21):** The trigger below ("Phase B middle weeks") has technically fired — Stream P is 8 sub-rounds in (P.1 through P.8 closed) — but this item's shape (pick a test stack + implement ~50-100 LOC of pilot tests + wire CI) is real infrastructure work, not a mechanical polish-batch fix. **Explicitly NOT folded into PRE-LAUNCH-POLISH-BATCH** — filing this note so the next reader sees "trigger fired, but needs its own sub-round" rather than assuming it was either forgotten or already handled. Stays OPEN with REVISIT-35 gated on its outcome as before.

**Status:** Filed during B.0f-3 close 2026-05-10. Investigation during B.0f-1 confirmed `apps/web/` has no API integration test layer — no `*.test.*` or `*.spec.*` files anywhere, no `test` script in `apps/web/package.json`, no test runner deps (vitest/jest/playwright/supertest), no `__tests__/`/`tests/`/`e2e/` directories. Root `package.json`'s `"test": "turbo run test"` is effectively a no-op (no app defines a test script). `CLAUDE.md` references `npm test` and `npm run test:e2e` aspirationally — neither is wired up. **Re-verified unchanged at 2026-07-21 investigation** — still zero test files, still no test script.

**Concern:** all B.0c, B.0f, and Stream P API correctness is verified via manual smoke tests against a running dev server. This worked for the B.0 chain but doesn't scale: every new API route is a fresh manual smoke surface, every refactor risks silent regression on routes nobody re-smokes. Approach B vs C ratification debates would have been faster with regression tests; race-condition assertions on quota helpers (Pattern B) currently rely on production observation.

**Trigger:** ~~Phase B middle weeks (~weeks 3-4 of Stream P)~~ **FIRED 2026-07-21 — needs a dedicated evaluation sub-round (stack selection + pilot tests + CI wiring), not a polish-batch fold-in.** OR before SR 9 / Phase B soft launch closes — whichever first. SR 9 is the soft-launch readiness check; shipping to 50–100 Bulgarian users with no API regression coverage is the kind of thing the readiness check should flag.

**Sub-round when ready:** standalone evaluation sub-round. Scope:
1. **Pick a stack.** Three credible options: (a) **vitest + MSW** for unit + integration coverage of API routes — fast, in-process, Next.js server-action friendly; (b) **Playwright API tests** — already a partial dep candidate per CLAUDE.md, runs against a live dev server, slower but closer to real user; (c) **continue manual-smoke-only** — punt to Phase C, accept regression risk through soft launch.
2. **Pilot coverage.** Implement ~5 high-leverage tests as proof-of-concept: cap-claim race condition (Pattern B atomicity), cap-reached 429 shape, cache-hit no-decrement, premium uncapped, regenerate-exempt path. ~50–100 LOC of test code.
3. **CI wiring.** Add `apps/web/package.json` `test` script. Verify root `turbo run test` picks it up. Optionally GitHub Actions CI run on push.
4. **Close REVISIT-35.** Decide whether m3-uat harness gets rewritten (Path Rewrite) or replaced entirely (Path Delete) based on the chosen test stack's coverage.

**Why documented:** soft launch with 50–100 users + no automated regression coverage is a risk that compounds with every new sub-round. Filing this REVISIT puts the evaluation on a calendar trigger (Phase B middle weeks) rather than letting it slide until production breaks.

## 37. `useOracleReading` completion-state staleness across topic transitions

**Status:** Filed during B.0f-3 close 2026-05-10. Pre-existing bug surfaced (not caused) during B.0f-2-fix-1's hook refactor. The web `useOracleReading` hook's `completion` state stays populated across topic transitions — when user generates topic A, gets streamed text, then navigates to topic B (which has a saved reading), the panel's `showStream` condition (gating on `Boolean(completion)`) evaluates true with topic A's stale streamed text, while topic B's saved reading is masked by `showSavedReading`'s `!completion` gate. Net: user sees topic A's text labeled as topic B.

The B.0f-2-fix-1 refactor (replacing `useCompletion` with manual fetch + ReadableStream) preserved this behavior intentionally — the bug existed before the refactor; widening the refactor scope to fix it would have bloated B.0f-2-fix-1 unnecessarily.

**Trigger:** P.12 (Oracle parity polish) — natural fit since P.12 is already scoped for Oracle UX alignment between web and mobile. Mobile uses `@tanstack/react-query` with explicit mutation reset on `clearActiveTopic`, so the bug doesn't manifest there.

**Sub-round when ready:** within P.12. ~5 LOC fix: clear `completion` state in the `setActiveTopic` wrapper at `apps/web/hooks/useOracleReading.ts` (already wraps `setActiveTopicState` to clear `generationError`; just add `setCompletion('')` to the same wrapper). Alternative: clear `completion` whenever the active topic changes via a `useEffect`. Either is ~5 LOC.

**Why documented:** the bug is reproducible (generate A, navigate to B with a saved reading) and visible to soft-launch users who use multiple topics. Without filing, it stays invisible in code review since the buggy state is across-component coordination not single-file logic.

## 38. Dead `LockedTopicTeaser.tsx` file + orphan `lockedTopicShown` state cleanup — CLOSED-BY-FIX 2026-07-21

**Resolution (PRE-LAUNCH-POLISH-BATCH close 2026-07-21, mechanical commit):** Deleted `apps/web/components/oracle/LockedTopicTeaser.tsx` (confirmed zero importers via grep). Removed `lockedTopicShown`/`teaserContent`/`loadingTeaser` state and `handleRequestTeaser` from `OraclePanelGlobal.tsx`, simplified the four always-false `lockedTopicShown` conditionals (topic-picker visibility, empty-state, footer, `modalTitle`). Investigation also found `handleRequestTeaser` was the only caller of `/api/oracle/teaser` — deleting it orphaned that route too (confirmed zero other callers on web or mobile), so it was deleted in the same commit as an in-scope extension of the same cleanup. TS-green verified. Original investigation context retained below for historical reference.

---

**Status:** Filed during B.0f-3 close 2026-05-10. B.0f-2-fix-1 dropped the `LockedTopicTeaser` import + JSX render block from `OraclePanelGlobal.tsx` per founder's "~3-line removal" scope. The component file itself (`apps/web/components/oracle/LockedTopicTeaser.tsx`) remains but is now unimported from anywhere — confirmed orphan via grep. Adjacent dead state in `OraclePanelGlobal.tsx`: `lockedTopicShown` useState, `teaserContent`/`loadingTeaser` state, `handleRequestTeaser` callback. References to `lockedTopicShown` survive in conditionals (handleClose, handleTopicSelect, modalTitle, footer back-button) — always-falsy dead branches but TypeScript doesn't error.

**Concern:** dead code with stable references is the kind of thing that confuses future readers ("why is `lockedTopicShown` here? what would set it?") and obscures the actual render logic. Cumulative drift cost over time.

**Trigger:** opportunistic during P.12 (Oracle parity polish), OR fold into REVISIT-37 fix (same file, similar scope). Could also trigger if a future paywall/upgrade-flow sub-round repurposes the LockedTopicTeaser component for a new locked-feature surface — in which case this cleanup converts to a "revive in different shape" decision.

**Sub-round when ready:** ~30-line removal. Steps:
1. Delete `apps/web/components/oracle/LockedTopicTeaser.tsx`.
2. In `OraclePanelGlobal.tsx`: remove `lockedTopicShown` useState + `setLockedTopicShown` call sites (handleClose, handleTopicSelect set to null with no-op effect, footer back-button onClick).
3. Remove `teaserContent`/`loadingTeaser` state + `handleRequestTeaser` callback.
4. Simplify `modalTitle` ternary (drop the `lockedTopicShown` branch).
5. TS green check.

**Why documented:** without this REVISIT, dead code rots indefinitely. The LockedTopicTeaser component is also a tempting "scaffold to revive" target — explicit deletion forces the conversation about what should actually fill the locked-topic UX space when it's needed.

## 40. Web Oracle missing regenerate + stop button UX

**Status:** Filed during B.0f-3 close 2026-05-10. (REVISIT-39 deliberately skipped — Approach A incremental persist not needed; Approach C addresses partial-content preservation as a side effect of `consumeStream()`.) Surfaced during B.0f-2-fix-2 smoke testing: founder ran T-Norm, T-Critical-1 (abort+return), T-Critical-2 (abort+DB cache), T-Cap, T-Cache, T-Regenerate-Cooldown — all six passed. T-Stop and post-cooldown T-Regenerate were **skipped** because the web Oracle UI lacks both a regenerate button and a stop button. The backend logic for both paths is correctly implemented (regenerate-exempt skips quota in B.0f-2-fix-1; Approach C makes stop client-cosmetic-only in B.0f-2-fix-2) but unreachable via web UI today.

Pre-existing parity gap with mobile, which has both buttons.

**Concern:** the web Oracle is the soft-launch discovery surface for the founder's network and SEO acquisition. Free users hitting the cap have no in-product recourse to retry generation (regenerate button) and no in-product way to abort a slow stream (stop button). Both are mobile-parity gaps that affect soft-launch UX completeness.

**Trigger:** P.12 (Oracle parity polish) — natural fit since P.12 is already scoped for Oracle UX alignment between web and mobile.

**Sub-round when ready (P.12 scope items):**
1. **Port mobile's regenerate button to web.** Mobile's pattern is straightforward: button visible only when a saved reading exists, gates on the 24-hour cooldown via `last_regenerated_at`. Web's `OraclePanelGlobal.tsx` already has a `handleRegenerate` callback and a `canRegenerate` boolean — the button JSX is missing. ~20 LOC port.
2. **Decide on web stop button.** Approach C makes the server-side stream complete regardless of client connection state; the client's stop button is now client-cosmetic only (closes the visible stream, server keeps generating to populate cache). Two choices: (a) add a "Stop" button to web with the same cosmetic semantics — gives users a way to close the panel mid-stream without confusion; (b) skip the stop button entirely on web — less screen real estate, accepts that users use the close-X or back-button to abort. Recommend (a) for parity with mobile, with copy that frames it correctly (e.g., "Прекъсни четенето" — pause/break the reading — rather than "Stop" which implies cancellation).
3. **Re-evaluate mobile's stop button under Approach C semantics.** Mobile's existing stop button suggests cancellation but the server now completes regardless. Two choices: (a) re-label to match new semantics ("Прекъсни четенето" or similar non-cancel framing); (b) remove the button on the rationale that visible "Stop" with no cancel effect is misleading UX. Founder picks at P.12 sub-round.

**Why documented:** the founder smoke test surfaced this gap. Without filing, the regenerate/stop UX work falls between B.0f's "this is correct backend-side" and P.12's "Oracle parity polish" — risk of nobody owning it. Filing here ties it explicitly to P.12 with three sub-questions to resolve, so P.12 picks it up cleanly.

## 41. MOBILE-WEB-PARITY-GAP.md periodic staleness sweep (first instance: P.1 close 2026-05-11)

**Status:** Filed during P.1 close 2026-05-11. First concrete instance of REVISIT-31 doc-debt sweep applied to the parity-gap inventory. P.1's investigation pass surfaced three categories of spec staleness that the original 2026-05-09 enumeration missed because it was written from web's comment-target state, not as-shipped state:

1. **Item 1.6 SSE drift.** Spec described mobile-using-JSON as the gap; investigation discovered web's client had silently dropped `useCompletion` too. Both surfaces non-streaming at UX layer despite backend SSE intact. Re-classified to deferred-silent-close + Yesterday tab carved out as item 1.11.
2. **Items 1.8 (Transit) and 1.9 (Circle) static-on-web.** Spec described mobile's hardcoded data as the gap implying web is data-driven; investigation found web tiles are also static link cards with inline "Phase B: replace with real X" comments. Re-classified to done-at-parity + cross-surface REVISIT for data-driven port.
3. **Item 1.11 Yesterday tab and 1.12 tile-tap navigation surfaced as new rows.** Both visible side-by-side gaps not enumerated in the original sweep.

**Concern:** the parity-gap inventory is the single source of truth for Stream P scope. Doc staleness leads to investigation passes re-discovering the same questions or pre-investigation halt-and-surface for items already resolved. Compound cost across 18 Stream P sub-rounds.

**Trigger:** **periodic — every Stream P sub-round close performs a focused sweep of its just-closed surface's parity-gap section.** P.1-f's sweep covered Section 1; P.2-f (or single-commit P.2 close) sweeps Section 2; etc. Also fires opportunistically when spec staleness is surfaced mid-investigation.

**Cross-cutting items also surfaced during P.1 sweep (not section-specific):**

- **CrystalCard border + eyebrow font-weight divergence** (closed inline in P.1-f sweep — `apps/mobile/components/CrystalCard.tsx`). Mobile was `border-violet-stellaeum/25` + default font-weight; web is `border-amber-300/25` + `font-semibold`. Aligned to web in P.1-f.
- **Stale comment in `apps/mobile/hooks/useDailyHoroscope.ts`** referencing REVISIT-20 streaming-text-upgrade as still-active. REVISIT-20 closed via re-classification when item 1.6 closed silently in P.1-f. Comment scheduled for cleanup at next opportunistic touch (1-line edit; not urgent).
- **`PLANET_HEX_COLORS` map drift risk** (`apps/mobile/app/(authed)/(tabs)/index.tsx`) vs web's `PLANET_COLORS` Tailwind class map (`apps/web/components/horoscope/HoroscopeStream.tsx`). Both maps must agree on the per-planet color identity; drift between them produces silent visual divergence. **Possible refactor:** centralize as `PLANET_HEX_COLORS` constants in `@stellaeum/core/oracle/planet-parser` alongside `parseSentinels`; web derives Tailwind classes from the hex constants. Defer to a future cross-surface visual-consistency sub-round.
- **Ambient header restructure deferred to P.9.** When P.9 ships tier-source and flips `isPremium`, the parent View at mobile `index.tsx` ambient header should restructure from vertical stack to `flex-row justify-between` so Premium badge sits right-aligned alongside the date+lunar line (mirrors web `DashboardContent.tsx:130-148`).

**Sub-round when ready:** every Stream P sub-round close from P.2 onward includes a section-focused sweep of MOBILE-WEB-PARITY-GAP.md as the final commit step (or atomic with the close commit). Cumulative cost ~5-15 LOC per sweep; doc updates dominate.

**Why documented:** P.1's investigation overhead was high partly because the spec was stale. Future sub-rounds are tightened by sweeping the relevant section before opening the investigation pass — or, equivalently, by maintaining the doc current via close-time sweeps so the next investigation reads cleanly. This REVISIT institutionalizes the close-time sweep practice.

## 42. Mobile font stack — Cinzel Cyrillic-incompatibility + missing `font-display` equivalent

**Status:** Filed during P.1 close 2026-05-11. Surfaced during P.1-b (greeting block port). Mobile's Tailwind config (`apps/mobile/tailwind.config.js`) defines only one custom font family: `font-cinzel` → `['Cinzel']`. Cinzel is a Latin display font intended for uppercase eyebrow labels (`tracking-[0.42em] uppercase`); it has limited or no Cyrillic glyph support. Web's `font-display` (a serif loaded via Google Fonts) doesn't exist on mobile. Web's Bulgarian body text + h1 greeting use `font-display` for the serif editorial feel; mobile falls back to the platform-default sans-serif, which renders Cyrillic correctly but loses the editorial register.

**Concern:** typographic register is part of the visual identity. Founder's design language is cosmic+editorial, and the serif font is load-bearing for the editorial feel. Falling back to system sans-serif on mobile means iOS (San Francisco) and Android (Roboto) render the greeting + body text in their respective system fonts — recognizable but not editorially-distinctive.

**Trigger:** post-soft-launch typographic-polish sub-round, OR fires opportunistically if founder receives user feedback that mobile typography feels "off-brand" vs web. Not gating soft launch — Cyrillic renders cleanly in system fonts, content is readable.

**Sub-round when ready:** Phase C/D typographic polish. Steps:
1. Pick a Cyrillic-supporting serif equivalent for web's `font-display` (candidates: Cormorant, Lora, EB Garamond, Source Serif Pro — all have decent Cyrillic glyph coverage on Google Fonts).
2. Load via `expo-font` at app root (`apps/mobile/app/_layout.tsx`).
3. Add `display: ['<picked-font>']` to `apps/mobile/tailwind.config.js` fontFamily section.
4. Audit mobile components for explicit `font-cinzel` usage on mixed-case text (should be uppercase eyebrows only) — flip mixed-case usages to `font-display` once available.
5. Re-evaluate the greeting block in `apps/mobile/app/(authed)/(tabs)/index.tsx:177` (currently no font class for Cinzel-incompatibility reasons).

**Why documented:** the Cinzel limitation is invisible until you try to render mixed-case Bulgarian text in it (which P.1-b did — initial attempt had `font-cinzel` on the greeting, fell back to system sans because of glyph absence). Without filing, future contributors may repeat the mistake. Filing this also captures the broader "mobile typography is system-default sans-serif everywhere except eyebrows" state that may be worth a holistic review post-soft-launch.

## PRE-LAUNCH-POLISH-BATCH-INTENT — consolidated burn-down for OPEN-NO-TRIGGER items — FIRED AND CLOSED 2026-07-21

**Batch closure (2026-07-21):** Fired between P.8 and P.10 per its own trigger window. All 8 named items resolved: REVISIT-8 and REVISIT-13/14(partial)/17 closed by fix or prior-work; REVISIT-9/10/11 closed by explicit founder decision (keep as-is, record why); REVISIT-7 closed by decision and replaced with REVISIT-52 (concrete trigger). **REVISIT-14 is the one exception — structurally looks already fixed by an unrelated landing redesign, but no browser tool was available to visually confirm this session, so it stays OPEN pending a 30-second visual check** rather than being closed on inference. The batch also picked up two items outside its original named list (REVISIT-38, REVISIT-24 — cheap and mechanical, surfaced opportunistically during the same investigation pass) plus a doc-only fix for REVISIT-44 and a prior-work closure for REVISIT-49. Full accounting in HANDOFF's PRE-LAUNCH-POLISH-BATCH close section.

---

**Status:** Filed during B.0g close 2026-05-12 per founder ratification. The B.0g audit pass surfaced that ~33% of all OPEN REVISITs have no natural sub-round fire condition (discipline-risk pile). B.0g itself burned down the top three (REVISIT-12 launch-blocker, REVISIT-15 brand drift, REVISIT-16 auth divergence). The remaining 8 OPEN-NO-TRIGGER items cluster naturally as pre-soft-launch polish work and are formally batched here to a defined future window rather than left as orphans.

**Items in scope:**

- **REVISIT-7** — color contrast audit (accessibility-vs-brand decision)
- **REVISIT-8** — hardcoded mobile streak footer drift from web vocabulary
- **REVISIT-9** — Sentry org slug rename (Phase D plan-tier decision)
- **REVISIT-10** — test email domain `@celestia-ai.dev` rename
- **REVISIT-11** — GitHub repository rename `Project379/celestiai` → TBD
- **REVISIT-13** — birth date validation error references internal schema format
- **REVISIT-14** — web landing splash heading overflow at default viewport
- **REVISIT-17** — web TIME_RANGES hour string formatting asymmetry

**Trigger:** Phase B middle weeks — concretely **between P.6 and P.12** when soft-launch UX completeness becomes the active concern (P.6 ships Crystal collection; P.12 ships Oracle parity polish). The window is wide on purpose: the batch lands when other Stream P work creates natural touchpoints with these surfaces (e.g., REVISIT-14 landing splash can fold into any landing-page touch; REVISIT-13 birth-date error can fold into any wizard touch). **Hard deadline: before SR 9 if not absorbed earlier.** SR 9 is the soft-launch readiness check; shipping to 50–100 Bulgarian users with these 8 orphans still open is the kind of thing the readiness check should flag.

**Estimated scope:** ~150–200 LOC consolidated sweep. Most items are mechanical (REVISIT-13 single-line schema error edit, REVISIT-17 single-string normalization, REVISIT-14 CSS audit + container fix). Two require founder decisions, not code (REVISIT-7 brand-vs-AA tension; REVISIT-9 Sentry plan upgrade cost-benefit). Two require external action (REVISIT-10 domain registration; REVISIT-11 GitHub rename cascade through external references).

**Sub-round when ready:** dedicated "pre-soft-launch polish" sub-round, scoped narrow. Likely two-commit shape:

1. **Mechanical fixes commit** (~80–120 LOC): REVISIT-8, REVISIT-13, REVISIT-14, REVISIT-17 — straight code edits, TS green check, founder smoke test each surface.
2. **Founder-decision commit** (~40–80 LOC): REVISIT-7 (color contrast — needs brand-vs-AA ratification), REVISIT-9 (Sentry plan — needs cost-benefit decision), REVISIT-10/REVISIT-11 (external actions — may land as out-of-band founder tasks tracked here).

**Discipline note:** without this batch intent, the 8 items risk sitting indefinitely as orphans. The B.0g pattern (REVISIT-12/15/16 burned down together once locked to a sub-round) demonstrates that batched closure is more efficient than item-by-item triggers. Filing the intent now closes the discipline-risk loop: when Stream P reaches the P.6–P.12 window, the batch fires; if soft-launch readiness check arrives without it firing, SR 9 absorbs it.

**Why documented:** the B.0g audit pass surfaced 11 OPEN-NO-TRIGGER items (~33% of all OPEN REVISITs). Three burned down at B.0g. The remaining 8 are formally claimed here so the next REVISIT audit pass shows them as triggered (Phase B middle weeks) rather than orphaned. Compounds the close-discipline pattern: every audit pass should reduce the OPEN-NO-TRIGGER count toward zero.

## 43. Diary export truncation check at scale — Android Intent.EXTRA_TEXT limit

**Status:** Filed during P.4 close 2026-05-12. P.4-d shipped mobile diary markdown export via React Native's built-in `Share.share({ message: markdown })` API (HT 5 Option A ratification, no new dep). Android historically truncates `Intent.EXTRA_TEXT` payloads above ~50-100KB depending on receiving-app implementation; the truncation is silent (no error, just a truncated `message` body delivered to the share target). iOS doesn't have the same hard limit but very large payloads degrade share-sheet UX.

**Concern:** soft-launch users with >3 months of diary entries (typical entry ~200-400 bytes for 3 intentions; ~90 entries = ~35-50KB markdown; ~6 months = ~70-100KB) may hit the truncation threshold. Mail / Notes / Files apps each handle the truncation differently — some show truncated text without warning, some refuse to receive. **Data-loss risk** if a user exports the diary as their GDPR portability extract and silently receives partial content.

**Trigger:** **post-soft-launch when first user has >3 months of diary entries OR support ticket reports truncated export.** Verify behavior with a >90-entry corpus on real Android device + iOS device before declaring the issue actionable.

**Sub-round when ready:** post-soft-launch fix sub-round. Two mitigation paths:

1. **Base64 data URL path.** Encode markdown as `data:text/markdown;base64,<...>` and pass via Share's `url` field instead of `message`. Larger payloads survive in iOS share sheets via URL; Android handling varies but improves over EXTRA_TEXT.
2. **Adopt `expo-sharing` + `expo-file-system`.** Write markdown to a temp file, share via `Sharing.shareAsync(uri, { mimeType: 'text/markdown', UTI: 'public.plain-text' })`. Closest to web's "download a file" semantic. Conservative SDK defaults exception justified by data-loss risk if Path 1 also fails.

**Confirmation evidence needed:** before mitigation, smoke-test a 100-entry corpus on Android device, measure actual truncation threshold across Gmail / Drive / Files / Notes share targets. Without confirmed evidence, mitigation is speculative.

**Why documented:** GDPR portability is a soft-launch concern (50–100 Bulgarian users), and the failure mode is silent. Filing here surfaces it to the post-soft-launch retro instead of relying on chance discovery.

## 44. Auth-pattern harmonization sweep — `auth()` vs `requireAppUser()` across web API routes — CLOSED-BY-FIX (doc-only) 2026-07-21

**Resolution (PRE-LAUNCH-POLISH-BATCH close 2026-07-21, doc-only commit):** Founder ratified the doc-only path — no code refactor. Added a "Two valid auth-entry patterns" subsection to `.planning/SECURITY-MODEL.md` (under "Server-side access pattern") documenting both `requireAppUser()` and raw `auth()` + manual filter as correct, with explicit usage criteria (needs the `users` row / upsert guarantee → `requireAppUser()`; null-tolerant on missing `users` row → raw `auth()`). The divergence was never a bug — diary routes correctly use Pattern 2 because their lower-bound check tolerates a missing `users.created_at`. Closing the documentation-drift gap this REVISIT was actually about. Original investigation context retained below for historical reference.

---

**Status:** Filed during P.4 close 2026-05-12. P.4 investigation surfaced that the diary API routes use raw `auth()` from `@clerk/nextjs/server` + `createServiceSupabaseClient()` + manual `.eq('user_id', userId)` filter — NOT the `requireAppUser()` wrapper from `apps/web/lib/auth/guards.ts`. Both patterns are valid post-B.0c, but the HANDOFF / SECURITY-MODEL.md description of `requireAppUser` as "Standard guard at the top of every protected route" overstates standardization.

**Concern:** documentation drift between code reality (mixed auth patterns) and planning docs (claim of a single canonical pattern). A future Claude session reading SECURITY-MODEL.md as the source of truth may try to refactor routes onto `requireAppUser` without context on why some routes use the simpler raw `auth()` form — and vice versa.

The two patterns differ functionally:
- **`requireAppUser()`** — calls `auth()` + `ensureUserRecord(userId)` to upsert the `users` row if missing. Use when the route assumes a `users` row exists and may write related rows. Returns `{ userId, user }` shape.
- **Raw `auth()` + service-role + filter** — assumes Clerk gives a `userId`; doesn't guarantee a `users` row. Routes that defensively handle missing-user (like diary's `readUserCreatedAt` returning null) don't need `requireAppUser`. Returns `{ userId }` shape.

Diary uses the latter because its lower-bound check (`entry_date >= users.created_at`) is null-tolerant.

**Trigger:** pre-launch doc-debt sweep (likely batched with REVISIT-31 periodic execution) **OR** Phase C security review. NOT urgent — both patterns are correct under B.0d RLS lockdown; this is documentation discipline, not security drift.

**Sub-round when ready:** standalone audit + doc update sub-round. Scope:

1. Grep `apps/web/app/api/` for both `requireAppUser` and `auth()` callers; categorize each route.
2. Per route: confirm the choice is appropriate (does it need `ensureUserRecord`? is the route safe with missing-user?).
3. **Decide:** either harmonize all routes to one pattern (likely `requireAppUser` for safety) OR document both patterns explicitly with usage criteria in SECURITY-MODEL.md and the HANDOFF security-model summary.
4. If harmonizing: refactor the divergent routes (likely 3-8 routes). LOC scope ~50-100 depending on count.
5. If documenting both: ~30 LOC doc edit, no code change.

**Why documented:** the divergence was previously absorbed silently. Filing now ensures the next reader sees the divergence as a known state, not an oversight.

## 45. Production LLM model selection — post-Phase-A Llama 3.3 70B swap

**Status:** Filed during P.3 close 2026-05-12 per founder direction. Phase A shipped on OpenRouter's Llama 3.3 70B (provider abstraction in `apps/web/lib/llm/*`); the model selection has not been formally re-evaluated since launch and was chosen for cost/latency at Phase A scale.

**Concern:** as Phase B ships more LLM-driven surfaces (Oracle generations, daily horoscopes, potential post-P.13 telemetric model-quality metrics), the model needs re-evaluation against:
- Cost per generation at projected soft-launch scale (50–100 users × Oracle cap + daily horoscope throughput)
- Bulgarian register quality (subjective founder review; future user feedback)
- Generation speed for streaming surfaces (daily horoscope stream)
- Fallback strategy if primary provider degrades (REVISIT cross-ref: HANDOFF strategic item 1)

Candidate replacements depend on the cost/quality envelope at evaluation time — Claude Sonnet 4.6, GPT-5-class, Llama 3.3 70B variants, Mistral Large, Gemini 2.0 Pro all viable. Decision is empirical, not theoretical.

**Trigger:** **before P.13 telemetry wiring (PostHog) OR before soft-launch cost-monitoring activation, whichever first.** P.13 introduces the first observability surface to measure generation quality + cost at production; the model swap should land before that measurement window opens so the baseline measured is the production target.

**Sub-round when ready:** standalone evaluation + swap sub-round. Likely scope:

1. Cost projection over 7-day soft-launch simulation across each candidate model. Account for Oracle cap, daily horoscope throughput, regenerate-exempt path.
2. Quality review: founder runs 10 sample prompts per candidate model, scores on Bulgarian register + astrological accuracy + voice consistency (cross-ref `apps/web/lib/manifest/PROMPT_VOICE.md`).
3. Latency baseline: time-to-first-token for streaming surfaces; full-completion time for non-streaming.
4. Swap landing: OpenRouter provider config change in `apps/web/lib/llm/*` + spend alert threshold update.

**Cross-references:** PRE_LAUNCH_PREREQS.md item 5 (cost envelope check), HANDOFF strategic item 1 (OpenRouter cost), HANDOFF strategic item 5 (AI provider fallback strategy).

**Why documented:** the Phase A model choice is stable enough to ship parity work on but is not the soft-launch production model. Filing here ensures the swap evaluation happens before telemetry locks in a baseline against the wrong model.

## 46. Ритъм tab time-scale navigation restoration

**Status:** Filed during P.3 close 2026-05-12. The pre-P.3 mobile Ритъм shell had four time-scale chips (Днес/Седмица/Месец/Година) representing a multi-scale transit/forecast view that web does not currently implement. P.3-a deleted the chips per HT 2 ratification because parity scope had no backing surfaces for Седмица/Месец/Година.

**Concern:** the chip design encoded a real product idea — a transit/forecast view across multiple time scales (today's transits / weekly outlook / monthly arcs / yearly forecast). Phase C is the natural home for yearly forecasting per the parity-gap doc note at MOBILE-WEB-PARITY-GAP.md:95. Without this REVISIT, the design intent could be lost.

**Trigger:** **Phase C kickoff OR first user request for multi-scale forecasting OR explicit founder decision to implement extended-range transit views.**

**Sub-round when ready:** dedicated multi-scale forecast sub-round. Decision criteria:

1. **Restore the chips on Ритъм?** Pros: existing user-mental-model continuity. Cons: requires four content surfaces, not one.
2. **Move multi-scale to a different surface?** E.g., separate «Прогнози» tab, OR subroutes under `/rhythm/week`, `/rhythm/month`, `/rhythm/year`. Decouples the day-view from the multi-scale browse.
3. **Kill the concept entirely?** If user research at Phase C shows demand is concentrated on the day-view, multi-scale could be deferred indefinitely or abandoned.

Web has no multi-scale precedent — the decision is mobile-led product design, not parity work.

**Why documented:** the design intent is preserved here so a future Claude session or founder iteration on Phase C doesn't accidentally re-invent the multi-scale concept from scratch. The chips were a real artifact, not a placeholder; the deletion was a parity-scope-only decision.

## 47. Transit event deep-link target architecture — DEFERRED, not applicable to P.16 as built (2026-08-03)

**Resolution (P.16 investigation, 2026-08-03):** P.16's actual scope is the generic, blanket daily-horoscope notification only (matching web's existing non-personalized `daily-horoscope` cron) — the same payload for every user, deep-linking to Днес/dashboard, not a per-transit-event alert. None of the three architectural options below need deciding for that payload; there is no transit-specific push in P.16's scope to attach a deep-link decision to. **Deferred, not a live P.16 blocker** — re-open this item if/when a transit-specific push notification (e.g. «Транзитът Марс квадрат Венера е активен сега») is actually built, which is unbuilt future scope on both platforms today.

**Status:** Filed during P.3 close 2026-05-12. P.3-c shipped EventModal for transit detail (absolute View + Pressable backdrop + BackHandler per HT 4 ratification). The standalone `/rhythm/[eventId]` route on web (consumed by `TransitEventDetail.tsx`) was deferred per HT 3 — mobile ships modal only.

**Concern:** P.16 will wire push notifications. Some push notifications (e.g., «Транзитът Марс квадрат Венера е активен сега») naturally want to deep-link into a specific transit event detail. The current mobile state has no per-event URL — modal-only means the push tap target cannot be a transit-event URL directly.

**Trigger:** **P.16 investigation pass — decision MUST precede push-payload design.** Push payloads encode the URL/route to navigate on tap; choosing the wrong shape forces a rework if the deep-link target doesn't exist yet.

**Sub-round when ready:** P.16 investigation phase. Three architectural options to choose from:

1. **Scroll-to-event on /rhythm.** Push payload includes `?event=<id>`; mobile pushes /rhythm and the rhythm screen scrolls to + auto-opens the EventModal for that id. Pros: no new route, minimal mobile delta. Cons: deep-link is fragile if the event has aged out of the current overview window (the `?event=<id>` could resolve to "event no longer in feed").
2. **Standalone route /rhythm/[eventId].** Mobile adds `(authed)/rhythm/[eventId].tsx` + Stack.Screen registration. Mirror web's TransitEventDetail. Pros: stable deep-link URL, survives feed-aging via TanStack cache hit (or refetch by id, if the API supports per-event GET). Cons: requires API endpoint for per-event fetch OR fallback to refetching the full overview + filter client-side.
3. **Modal-as-route via param on /rhythm?eventId=X.** Hybrid — single route, param drives EventModal open. Pros: smaller mobile delta than (2); URL stability is encoded in the param. Cons: param-driven modal opens are stylistically odd; harder to deep-link from outside the app reliably.

Decision criteria at P.16 investigation:
- Does `/api/transits/overview` support a per-event GET, or only the full overview? If only full overview, options (1) and (3) win; option (2) requires API expansion.
- How long do transit events stay valid in the overview window? If a push fires at 9am for a transit that ages out by 5pm, the deep-link should still render the event detail. Option (2) handles this best with a per-event fetch.
- What's the push-payload size budget? Per-event fetch URL is smallest; param-driven approaches push more state into the URL.

**Why documented:** push-notification work has a hard dependency on this decision. Filing here surfaces it as a P.16 prerequisite rather than letting it surface during push-payload design (which would force a back-and-forth).

## 48. Android verification sweep — iOS-only-validated patterns

**Status:** Filed during/after P.3 close 2026-05-12 per founder direction. Every discipline pattern, overlay primitive, and runtime behavior codified across Phase A and Stream P so far has been validated on **iOS Expo Go** (the canonical fidelity check per the EOD handoff). Android has received zero deliberate verification.

**Patterns / behaviors specifically needing Android validation:**

(a) **Absolute View + Pressable backdrop + BackHandler overlay pattern.** Precedents: P.2-d NatalWheelLegend, P.3-c EventModal, B.0g-3 forced-wizard alert dialog (uses native `Alert.alert` instead; verify it too). Codified at P.3 close as the default mobile overlay. **Android hardware-back semantics + tap-out-to-dismiss + z-stacking against the tab bar** all need real-device verification.

(b) **Per-launch dismiss state via module-level `let` (B.0g-3 `lib/onboarding/dismissState.ts`).** Hot-reload semantics differ between iOS Metro + Android Metro; the `let` variable lifetime against Android's bundler reload behavior is unverified. Specifically: does an Android Expo Go reload preserve the module-level state when the JS context is rebuilt? Behavior should match iOS (state clears on cold start).

(c) **NativeWind static class scanner edge cases on Android.** P.1-c `PLANET_HEX_COLORS` hex-not-class pattern was the original workaround; any later code that used dynamic class lookups should be re-checked on Android specifically, since Android RN class-resolution paths can differ from iOS subtly (particularly around `borderColor` Tailwind variants and rgba opacity modifiers).

(d) **Reanimated worklet performance.** P.1-e sun sigil + P.2-e wheel arrival animation both ship Reanimated 4 sequences. Performance characteristic on mid-tier Android devices (Pixel 5a / mid-range Samsung) needs verification — iOS gets the worklet performance benefit consistently, Android has historically had higher GC pressure and frame-drop risk on the JS thread during withSequence chains.

(e) **react-native-svg rendering fidelity on Android.** P.2-e arrival flash, P.4-c1 ambient atmosphere overlays, P.3-b LunarPhaseCard MoonDisc + ambient overlays. RadialGradient with multiple Stops + alpha channel renders differently on Android (uses SkiaCanvasView fallback path in some configurations) vs iOS (uses CoreGraphics). Specific concerns: gradient banding, edge-case rendering on the MoonDisc terminator ellipse, possible color-space mismatches.

(f) **Any patterns added P.5–P.18.** This sweep should fire AFTER the Stream P chain is mostly complete, not mid-stream. New overlay patterns, hooks, animations, or render primitives shipping in P.5+ should land first; then the sweep audits the cumulative surface.

(g) **Android Share API truncation** (cross-ref REVISIT-43). The P.4-d Share.share({ message }) export is Android-specific risk surface; the sweep should include a >90-entry diary export test on real Android.

(h) **expo-secure-store + Clerk token cache behavior on Android.** Sign-in/sign-out/relaunch cycle through Clerk's mobile SDK. Verify token persistence across app cold-launches.

(i) **Native Alert.alert() — destructive-style button behavior** (B.0g-3 forced-wizard dismiss). iOS shows red-tinted text; Android may use system theme. Visual consistency check.

(j) **Stack.Screen header behavior + Android system gestures.** P.4-c1 wizard «Пропусни» button in headerRight; P.2 chart screen header; oracle screen header. Android system-back integration with the headerLeft + Stack push/pop semantics.

**Sizing:** **sub-round-scale (~4-8 hours methodical verification + likely some fix commits)**, NOT a half-hour smoke test. Founder direction. The sweep should produce:
1. A test matrix per surface × pattern: PASS / FAIL / N/A annotations on a real Android device.
2. Per-FAIL: instrumentation pass (per the 2-fail-attempts rule) → fix commit OR REVISIT filing for deferred patterns.
3. A close commit documenting the sweep outcome + any cross-platform divergence accepted (or fixed).

**Trigger:** **Android testing device access.** Hard-blocks Android TestFlight (no TestFlight equivalent on Android — Google Play internal testing track per HANDOFF strategic items). If founder uses an Android device personally OR acquires a test device, this sweep fires.

**Cross-references:**
- HANDOFF strategic item 3 (Apple Developer Program enrollment — iOS-only, doesn't unblock Android verification).
- REVISIT-1 (Biometric + EAS Dev Client + TestFlight bundled) — also iOS-centric; Google Play internal track is the Android equivalent and has lighter enrollment overhead than Apple Developer.
- REVISIT-43 (Android Intent.EXTRA_TEXT truncation) — a specific Android risk surface; this sweep is the natural moment to confirm-or-refute the truncation hypothesis.

**Sub-round when ready:** dedicated standalone sub-round. Should NOT fold into another sub-round — the audit-then-fix flow needs its own commit chain. Likely 2-5 commits depending on FAILs surfaced.

**Why documented:** the entire mobile codebase has been built and validated on iOS as the canonical fidelity surface (per the EOD handoff guidance + the `Expo Go on iPhone` canonical-fidelity-check note). Filing this REVISIT makes the Android-gap explicit so it doesn't surface as a surprise during Android TestFlight prep. Discipline-pattern codifications that read "default mobile overlay pattern" actually mean "default iOS-validated mobile overlay pattern" until this sweep closes — naming honesty matters for future readers and the next Claude session.

## 49. Engineering vocabulary in user-facing strings — chart.tsx «скоро в Phase B» — CLOSED-BY-PRIOR-WORK 2026-07-21

**Resolution (PRE-LAUNCH-POLISH-BATCH investigation 2026-07-21):** Verified via grep — «скоро в Phase B» and any mention of "Phase" (case-insensitive) are entirely absent from `apps/mobile/app/(authed)/(tabs)/chart.tsx` today. The placeholder block was already removed as dead code, most likely incidentally during P.2-c's chip replacement (PlanetsList/AspectsList/HousesList superseded the pre-P.2-c placeholders). No code change needed this close — closing as prior-work. Original investigation context retained below for historical reference.

---

**Status:** Filed during P.5 close 2026-05-12. P.5 ratified a new discipline pattern (codified in HANDOFF) that user-facing copy must not contain engineering-internal vocabulary — Phase names, sub-round identifiers, stream labels, etc. P.5's five new stub destinations ship per-destination calibrated copy («Кристалите ти идват скоро.», etc.).

**Concern:** the existing chart.tsx placeholder for the Details / Aspects / Houses chips (pre-P.2-c era, replaced for those chips but the surrounding pattern survived) contains the string «скоро в Phase B». This is engineering-internal vocabulary surfaced to users.

Exact location: `apps/mobile/app/(authed)/(tabs)/chart.tsx` — the «скоро в Phase B» placeholder block triggered when `chart.data && activeChip !== 'essence'` was active in the pre-P.2-c era. Verify whether this is still reachable post-P.2-c (P.2-c replaced placeholders with PlanetsList / AspectsList / HousesList for those chips; the surrounding string may now be unreachable. If unreachable, REVISIT-49 closes as a dead-code cleanup; if reachable in any edge case, it needs harmonization).

**Trigger:** opportunistically during any sub-round touching chart.tsx OR **PRE-LAUNCH-POLISH-BATCH-INTENT batch** (P.6-P.12 window, since the pattern is now codified and a sweep makes sense).

**Sub-round when ready:** ~<5 LOC string edit (or full removal if unreachable). Quick bulgarian-skill calibration on the replacement string if reachable. Steps:

1. Read chart.tsx to confirm reachability of the «скоро в Phase B» string post-P.2-c.
2. If unreachable: delete the dead block.
3. If reachable: replace with calibrated user-facing copy («Скоро.» or context-specific equivalent). Calibrate via bulgarian-skill if the new string introduces grammar/register questions.

**Why documented:** the discipline pattern was codified at P.5 close; this REVISIT captures the one known existing-codebase violation so the discipline isn't silently inconsistent. Without this REVISIT, the pattern reads "applies to new code only" — REVISIT-49 closes that gap.

## 50. AsyncStorage key naming convention harmonization — CLOSED-BY-FIX 2026-07-21

**Resolution (PRE-LAUNCH-POLISH-BATCH close 2026-07-21, mechanical commit):** All three mixed-convention consumers now use the unprefixed `stellaeum.*` convention matching web's localStorage keys and the P.7-b `useStoryList` precedent: `@stellaeum/notif_prompted` → `stellaeum.notifications.prompted.v1`, `@stellaeum/push_token` → `stellaeum.notifications.push_token.v1` (both with a one-shot `migrateKey()` helper in `maybePromptPushPermission.ts` that copies the old value forward and deletes the old key on first read, so no in-flight device state is lost), and `` `daily-horoscope:${chartId}:${date}` `` → `` `stellaeum.horoscope.daily.${chartId}.${date}.v1` `` (no migration — a cache miss on the old key just refetches, per the REVISIT's own note). Canonical convention (`stellaeum.<surface>.<artifact>.v1`) is now consistently in place across all AsyncStorage consumers. TS-green verified. Original investigation context retained below for historical reference.

---

**Status:** Filed during P.7 close 2026-05-12. P.7-b pre-flight verification of HT 3 (AsyncStorage key naming) surfaced that existing mobile AsyncStorage consumers use mixed key conventions:

- `apps/mobile/hooks/useDailyHoroscope.ts` → `daily-horoscope:${chartId}:${date}` (bare kebab-case + colon, no prefix)
- `apps/mobile/lib/notifications/maybePromptPushPermission.ts` → `@stellaeum/notif_prompted` and `@stellaeum/push_token` (both @-prefixed)

No documented "convention" exists in HANDOFF or in-code comments. The @-prefix pattern appears to come from the SR 8.3 era (per comment context) but was never formalized as a project convention.

P.7-b added a fourth consumer (`useStoryList`) with key `stellaeum.stories.state.v1` — unprefixed, matching web's localStorage convention (`stellaeum.stories.state.v1` verbatim) per HT 3 default ratification.

**Concern:** mixed conventions complicate the REVISIT-28 cross-device sync migration to Supabase at Phase C/D. A future Claude session designing the localStorage/AsyncStorage → Supabase migration table cannot rely on key shape patterns; each consumer needs to be mapped individually. Harmonization simplifies the migration and reduces the cognitive load for future readers grepping AsyncStorage usage.

**Recommended canonical:** unprefixed `stellaeum.<surface>.<artifact>` (matches web's localStorage convention used in P.4-era diary `stellaeum.manifest.entries.v1` + P.7 stories `stellaeum.stories.state.v1`).

**Trigger:** during REVISIT-28 (cross-device sync) work OR opportunistically during any sub-round touching `useDailyHoroscope.ts` or `maybePromptPushPermission.ts`. **NOT urgent** — mixed conventions are working correctly; this is documentation discipline + future-migration ergonomics.

**Sub-round when ready:** ~30-minute harmonization sweep. Scope:

1. Rename `@stellaeum/notif_prompted` → `stellaeum.notifications.prompted.v1` (or similar). On rename, migration logic: read old key, write new key, delete old key on first run.
2. Rename `@stellaeum/push_token` → `stellaeum.notifications.push_token.v1`. Same migration.
3. Rename `daily-horoscope:${chartId}:${date}` → `stellaeum.horoscope.daily.${chartId}.${date}.v1`. Migration may not be needed since the cache is regenerable on miss.
4. Document the canonical convention in HANDOFF discipline-patterns section.

**Why documented:** the discipline pattern was implicit until P.7-b's pre-flight surfaced the inconsistency. Filing here ensures the harmonization sweep happens before the cross-device sync migration locks in any particular key shape.

## 52. Accessibility audit — WCAG AA contrast pass across mobile + web

**Status:** Filed at PRE-LAUNCH-POLISH-BATCH close 2026-07-21, replacing REVISIT-7 (closed-by-decision same day). REVISIT-7's own trigger ("Phase D") was vague enough that the item sat OPEN-NO-TRIGGER for 8+ sub-rounds before being batch-closed — this replacement exists specifically to carry a concrete, checkable trigger so the same orphaning doesn't recur.

**Concern (carried forward from REVISIT-7):** slate-500 and similar muted tones used for eyebrows, helper text, hints, and the sign-out button label on the `#08060f` mobile background (and web's equivalent dark palette) likely fail WCAG AA contrast for normal-sized text. The muted, low-contrast aesthetic is a deliberate brand choice (warm-poetic, candle-lit feel) that has never been evaluated against an accessibility lens. Founder ratified keeping the palette as-is for now (2026-07-21) — this is not a decision to bump tones, it's a decision to defer the audit to a concrete future trigger.

**Trigger (concrete, replaces "Phase D"):**
- Before public App Store / Google Play submission (NOT the TestFlight / internal-track soft-launch cut — this is the public-listing gate), OR
- First accessibility complaint from a beta or soft-launch user, OR
- Any external accessibility requirement surfaces (e.g. an EU Accessibility Act applicability check for a Bulgarian consumer-facing app — founder to verify with legal review whether/when this applies)

**Sub-round when ready:** dedicated accessibility pass. Audit each muted color usage and decide per-context: keep brand aesthetic with mitigation (system-level "Increase Contrast" settings honored automatically by NativeWind/Tailwind tokens), bump specific tones to AA-compliant equivalents (e.g. slate-500 → slate-400 for body text, slate-300 for helpers), or split into a brand-mode vs. accessibility-mode toggle.

**Why documented:** REVISIT-7 demonstrated that a real accessibility-vs-brand tension filed with a vague trigger becomes permanent orphan risk. This replacement makes the re-fire condition externally checkable (App Store submission is a calendar-adjacent milestone, a complaint is an event, a legal requirement is a fact-check) rather than a phase label that drifts as planning documents get reorganized.

## 53. Custom profile-field editing (name/email/password) for mobile

**Status:** Filed at P.10 close 2026-07-21. D5's original premise ("Clerk RN `<UserProfile>` + custom app-specific section") was investigated and found unworkable: `@clerk/expo/native`'s `UserProfileView`/`useUserProfileModal` are backed by a native TurboModule (`NativeClerkModule`, confirmed via its codegen spec), unloadable in the app's current Expo Go runtime (the hook's own `isAvailable: boolean` flag exists specifically for this case), and unstyleable even once EAS Dev Client lands (no `appearance`/`elements` API, just a plain `style` prop and `isDismissable`). P.10 shipped only the custom app-specific section (sign-out, GDPR export/deletion, legal link, app version); profile-field editing (changing name, email, password) is NOT available anywhere on mobile.

**Trigger:** before soft-launch — users need a way to fix a typo'd name or change their password without deleting and recreating their account. OR opportunistically once EAS Dev Client lands (SR9), if the founder decides the native `UserProfileView` is worth adopting for this specific narrow surface despite the styling/localization gap.

**Sub-round when ready:** mirror the sign-in/sign-up custom-build precedent — hand-built RN screens against Clerk's JS-level hooks (`useUser()`, `user.update()`, Clerk's password-change API), not any prebuilt Clerk UI. Estimate: similar shape/scope to the existing custom sign-up form.

**Why documented:** without profile editing anywhere, a user who fat-fingers their name at signup or wants to rotate their password has no in-app path — they'd need to contact support or delete/recreate the account. This is a real pre-launch gap, not a nice-to-have.

## 54. Clerk `user.deleted` webhook as defense-in-depth

**Status:** Filed at B.0h close 2026-07-21. The Clerk Dashboard "Allow users to delete their accounts" toggle (disabled per B.0h-0 founder action) removes the user-self-delete orphaning path entirely — that was the actual user-facing risk, and it's closed. An admin manually deleting a user from the Clerk Dashboard itself would still orphan Supabase rows (`users`, `charts`, `ai_readings`, `diary_entries`), since no webhook exists to catch that path.

**Verified 2026-07-21:** webhooks are included on Clerk's free Hobby plan ("Webhooks for data sync" — [clerk.com/pricing](https://clerk.com/pricing)), unlike MFA which requires Pro+. No plan-tier blocker, unlike REVISIT-6.

**Trigger:** before soft-launch if admin-side user management becomes routine (e.g. support handling a user-requested manual removal), OR opportunistically.

**Sub-round when ready:** ~60-80 LOC webhook handler at `/api/webhooks/clerk`, verifying the svix signature, listening for `user.deleted`, calling the existing cascade logic already proven in `/api/cron/cleanup-deleted-accounts` (extract to a shared helper if not already).

**Why documented:** belt-and-braces, not urgent — the Dashboard toggle already closes the path that mattered (user self-service). Filing so the admin-deletion edge case doesn't get forgotten.

## 55. Account deletion completion notification — BLOCKS App Store submission

**Status:** Filed at B.0h close 2026-07-21. Apple's App Store Review Guideline 5.1.1(v) implementation doc ([developer.apple.com/support/offering-account-deletion-in-your-app](https://developer.apple.com/support/offering-account-deletion-in-your-app/)) states: "If your process for account deletion is manual or otherwise takes time to complete, this is acceptable. Inform the user how long it will take to delete the account and **provide a confirmation when the deletion has been completed**." `/api/cron/cleanup-deleted-accounts` today only `console.log`s on completion — no user-facing confirmation of any kind.

**Requires:**
- (a) Transactional email service selection — none exists in the stack today (no `SENDGRID`/`RESEND`/`POSTMARK`-class env vars or package anywhere).
- (b) Capturing the user's email address before the Clerk identity is destroyed — the email is the notification's destination but also the thing about to be deleted.
- (c) Sequencing: the confirmation email must send BEFORE `clerkClient().users.deleteUser()` runs in the cron, since the Clerk record is the source of that email address.

**Estimated scope:** ~40-60 LOC in the cron route + founder decision on email provider + service setup (API key, sender domain verification).

**Trigger:** before App Store submission (this is a genuine submission blocker per Apple's own documented requirement, not a nice-to-have) — group with the other App Store submission blockers (REVISIT-1 Apple enrollment, ToS authoring, REVISIT-56 production deployment). **Canonical location for this group as of 2026-08-03: `MOBILE_ALPHA_REDESIGN.md` §7 "Founder-track / non-coding blockers"** — the `HANDOFF-CC-2026-05-12-EOD.md` version is a frozen single-shot snapshot, not maintained.

**Why documented:** discovered during B.0h investigation while verifying Apple's actual guideline text (not assumed from memory) — the completion-confirmation requirement is easy to miss since the deletion flow otherwise looks complete (grace period, cron, cascade all work). Filing separately from the rest of B.0h since it needs new infrastructure (email) rather than wiring existing pieces.

## 56. Production deployment to stellaeum.com — BLOCKS TestFlight

**Status:** Filed at P.10 close 2026-07-21. Mobile's settings screen links to `https://stellaeum.com/privacy` (founder-confirmed as the correct, permanent domain) — but the Next.js web app is not yet deployed there, so the link currently 404s. This is expected, not a code bug — flagged explicitly in the P.10 smoke-test checklist so a future pass doesn't misdiagnose it.

**Why this blocks TestFlight:** Apple requires a live, reachable privacy policy URL in App Store Connect for external TestFlight testing (and for the eventual App Store listing).

**Trigger:** before TestFlight submission.

**Sub-round when ready:** deployment task, not a code change to this repo per se — provision hosting (Vercel is the implied target given the Next.js stack), point `stellaeum.com` DNS at it, verify `/privacy` (and any other founder-facing routes) resolve.

**Why documented:** groups with REVISIT-1 (Apple enrollment), ToS authoring, and REVISIT-55 (deletion completion email) as one of the founder-track items that gate App Store submission. **Canonical location for this group as of 2026-08-03: `MOBILE_ALPHA_REDESIGN.md` §7 "Founder-track / non-coding blockers"** — the `HANDOFF-CC-2026-05-12-EOD.md` version is a frozen single-shot snapshot, not maintained.

## 57. Daily-horoscope reading length — re-verify prompt tuning if the production model changes

**Status:** Filed during MOBILE-ALPHA-REDESIGN v3 Step 2 close 2026-07-22. The daily-horoscope FORMAT spec (`apps/web/lib/horoscope/prompts.ts:18-23`) was cut from "4 to 6 paragraphs" to "exactly 2 short paragraphs, 400 to 550 characters... do not exceed 550 characters" per founder ratification, to match the Днес screen's "text from a friend" design intent rather than a briefing. Tuning was measured directly against 8 real generations pulled from the live `daily_horoscopes` Supabase table under the OLD prompt (avg 2,135 chars / 5 paragraphs across 8 samples, range 1,803-2,439), then verified with fresh test generations against the REVISED prompt.

**Verification note, corrected from initial plan:** the tuning pass was NOT a gpt-4o-mini proxy as originally scoped (`OPENROUTER_API_KEY` is absent from `apps/web/.env.local` under that name) — the value stored under `OPENAI_API_KEY` in that file is actually an OpenRouter credential (`sk-or-v1-` prefix, mislabeled env var name), which let the test run directly against the real production model (`meta-llama/llama-3.3-70b-instruct`). First pass at "400 to 600 characters" overshot to 597-671 chars in most runs; tightened to "400 to 550... do not exceed 550... when unsure, write shorter" landed 6 of 7 coherent runs at 394-520 chars. Treat this as real production-model verification, not a proxy estimate — but re-verify if REVISIT-45's model swap lands, since a different model may follow length instructions differently than Llama 3.3 70B did here.

**Separate quality risk surfaced during testing, not part of this REVISIT's scope:** 1-2 of every 8 test generations (both before and after the length change) came back garbled — mixed Bulgarian/English tokens, broken words (e.g. "Слънери", "GlobalKey", "ppl[/planet:KEY]BulgarianName"). This appears to be pre-existing Llama 3.3 70B flakiness at `temperature: 0.85`, unrelated to paragraph count, and not something this pass fixed. Worth its own investigation (lower temperature? retry-on-malformed-sentinel? stricter validation before caching to `daily_horoscopes`?) — flagging here since it surfaced during this work, not filing a full plan for it.

**Env var finding, also out of scope here:** `apps/web/app/api/horoscope/generate/route.ts:15-18` reads `process.env.OPENROUTER_API_KEY`, but the local `.env.local` has no variable by that name — only `OPENAI_API_KEY`, which happens to hold an OpenRouter-format key. Worth confirming whether the deployed (Vercel) environment has the correctly-named `OPENROUTER_API_KEY` set, or whether this local mislabeling reflects a real gap that makes local dev generation silently broken until someone notices `undefined` apiKey.

**Product tradeoff to flag to the founder, not hidden as a side effect:** cutting to "1, at most 2" influences per reading (from "2 to 4") reduces astrological coverage per day — fewer transits mentioned, by design, in exchange for a shorter, warmer, single-focus message. This is the intended tradeoff per the founder's own framing ("one thing that matters today ... not a survey"), not an unintended regression, but should stay visible as a product decision rather than read as a downgrade if raised later.

**Cache behavior confirmed (not a stale-content risk):** `daily_horoscopes` is keyed uniquely on `(chart_id, date)` with no TTL/regeneration — but the `generate` route (`route.ts:43-60`) only permits `date` to be today or yesterday, so a reading generated under the old long-form prompt is naturally bounded to the single day it was cached for. No user will see an old 5-paragraph reading resurface once that day passes; the next day's generation uses the new prompt automatically. The mobile client (`preview/today.tsx`'s `HoroscopeBody`) also carries a collapse/expand safety net (`EXPAND_THRESHOLD_CHARS = 900`) for the one remaining case — today's reading already cached long before this prompt change deployed.

**Trigger:** next time REVISIT-45's production model swap lands — re-generate 5-8 real readings against the new model and re-tune the character/paragraph targets in `prompts.ts` if they land outside 400-550. Also worth a look whenever the garbled-output rate is investigated, since a stricter length budget gives a flaky generation less room to recover mid-paragraph.

**Cross-references:** REVISIT-45 (production LLM model selection).

**Why documented:** the exact numbers in `prompts.ts` were tuned against one specific model's behavior; a model swap without re-verification risks silently drifting back to over-length readings the founder explicitly rejected.

## 58. Yesterday view disposition on Днес

**Status:** Filed during MOBILE-ALPHA-REDESIGN v3 Round A cutover 2026-07-22. The old `(tabs)/index.tsx` had a Today/Yesterday switcher (shipped at P.1 as web parity) — a disabled "Неналично" tab state when yesterday's reading is unavailable, plus a specific "Вчерашното послание вече е отминало" message. `preview/today.tsx` (now the live Днес screen post-cutover) does not have this switcher. Round A cut over without it — a founder decision, not an oversight discovered too late to act on.

**Concern:** `useDailyHoroscope` (`apps/mobile/hooks/useDailyHoroscope.ts`) still exposes `selectedDate`, `setSelectedDate`, and `yesterdayUnavailable` — none of which the new Днес screen reads. These are dead fields, not dead code paths (the hook still runs the lazy yesterday query when asked) — flagging so a future reader doesn't mistake unused-but-present fields for live state, or assume their presence means the feature still works end-to-end on mobile.

**Decide:** (a) restore a Yesterday affordance in a form that fits the new screen's "today, right now" premise, or (b) retire it permanently and clean up the dead hook fields.

**Evidence needed before deciding:** PostHog data on whether anyone used the Yesterday tab on web, since mobile has no telemetry until P.13 lands.

**Trigger:** after P.13 telemetry lands, OR before soft-launch if no usage data is available by then.

**Cross-references:** REVISIT 57 (daily-reading length), P.13 (telemetry wiring).

**Why documented:** without this, a future pass could either "helpfully" restore the switcher without evidence it's used, or delete the hook fields without realizing they were a deliberate, tracked hold rather than leftover cruft.

## 59. Карта's remaining child components — R3/R5/Cinzel-on-Cyrillic debt beyond PlanetDetail

**Status:** Filed 2026-07-22 during the tab bar fix's "recount" verification (`.planning/research/MOBILE_ALPHA_REDESIGN.md` §14 methodology fix). `PlanetDetail.tsx` was fixed as an authorized, scoped item this pass. Checking the REST of Карта's rendered tree the same way found it is NOT compliant — a much larger, previously invisible debt across the other child components the already-shipped `chart.tsx` renders or can open:

| File | Tracked-caps/Cinzel-on-Cyrillic code sites |
|---|---|
| `AstrologyReference.tsx` (Речник disclosure row) | 9 |
| `NatalWheelLegend.tsx` (wheel-overlay legend popover) | 2 real violations ("Легенда" eyebrow, footnote) — 5 other `font-cinzel` sites are Latin/symbol glyphs, compliant |
| `AspectsList.tsx` (Аспекти disclosure row) | 7 |
| `HousesList.tsx` (Къщи disclosure row) | 4 |
| `BigThreeCards.tsx` (always-visible on Карта) | 2 code sites, 4 rendered instances ("Големите три" eyebrow + 3 per-card labels) |
| `PlanetsList.tsx` (Детайли disclosure row) | 3 |

None of this was caught by Round A's own audit because it checked the route file (`chart.tsx`) and the primitives it directly imports, not these nested children — the exact blind spot this pass exists to close. `BigThreeCards` renders unconditionally on Карта (always visible); the rest render behind a disclosure-row tap or the legend popover, but per the newly-codified rule (every modal/sheet a screen can open counts), that doesn't exempt them.

**Concern:** Карта is still not R3/R5/font-compliant as experienced, even after this pass's fixes. The founder's "is Карта now actually compliant" question can't be answered yes until this is addressed.

**Decide:** whether this becomes its own dedicated fix pass (similar scope/shape to the PlanetDetail fix, likely 150-250 LOC across 6 files) or gets folded into whichever round eventually revisits Карта's design.

**Trigger:** before claiming Карта is R3/R5-compliant in any founder-facing status update; otherwise, next natural touch of any of these 6 files.

**Cross-references:** the tab bar fix and PlanetDetail fix landed 2026-07-22 in the same commit batch that surfaced this.

**Why documented:** the same blind spot already hit twice (LunarPhaseCard, PlanetDetail) — filing immediately rather than letting a third instance surface by accident.

## 61. Nine Stream K tables pre-provisioned in production, zero code references, zero migration history

**Status:** Filed 2026-08-03, found during the RLS migration-history audit (`apps/web/scripts/diagnostics/audit-hand-applied-schema.mjs`). Nine tables exist in production, fully built — `connection_spaces`, `connection_members`, `connection_invites`, `connection_reports`, `relationship_profiles`, `relationship_invites`, `compatibility_reports`, `saved_people_profiles`, `saved_people_reports`. Complete schema: FKs, CHECK constraints (relationship_type enums, status enums), indexes, RLS with owner/member-scoped policies, `updated_at` triggers reusing `public.set_updated_at()`. None of it had any migration-file record — not even `CREATE TABLE` — until this audit; now captured verbatim in `supabase/migrations/20260803101500_capture_stream_k_relationship_schema.sql`.

**Why this is a REVISIT and not just a migration fix:** the schema is dormant, not just undocumented. Grepped `apps/web`, `apps/mobile`, and `packages` for every one of the nine table names — zero references anywhere in current application code. Nothing reads or writes these tables today. This looks like backend work done ahead of building Stream K's UI (synastry/couples/crush/friends-group features — `relationship_profiles`/`relationship_invites` map to couples-linked-charts and crush reports, `connection_spaces`/`connection_members`/`connection_invites`/`connection_reports` map to friends-group reads, `compatibility_reports` to synastry, `saved_people_profiles`/`saved_people_reports` to ghost-profile crush reports — per the feature list in `.planning/research/MOBILE_UX_RESEARCH.md` Phase C), provisioned directly against production and never wired to any code or captured in history.

**Concern for whoever opens Stream K next:** this schema predates any current Stream K spec/plan. Whoever plans that work will find fully-built tables they didn't create and can't trace to a decision doc — don't assume it matches whatever gets designed later. Before building against it: re-verify column shapes, RLS policies, and the relationship_type/status CHECK constraint value sets still match the actual feature spec once one exists; treat it as a found artifact to validate, not a finished foundation to build on unquestioned.

**Trigger:** whenever a Stream K sub-round is first opened for planning — read this entry and `.planning/SECURITY-MODEL.md`'s per-table rows for these nine before assuming any schema needs to be designed from scratch, and before assuming what's there is still correct.

**Why documented:** the same failure this whole audit exists to prevent — hand-applied schema silently invisible to anyone who only reads migration history — would otherwise repeat exactly here: a future Stream K investigation pass reading `supabase/migrations/` and concluding no backend work has started, when nine tables' worth already has.

## 62. RevenueCat -> users.subscription_tier sync webhook — MISSING, blocks real mobile purchases from granting anything

**Severity, stated plainly:** this is not a missing nicety. Without this webhook, a mobile purchase can succeed in RevenueCat — the user is charged — and grant premium access **nowhere in the app**, because `users.subscription_tier`/`subscription_status` never updates. That is a payment path that takes money and delivers nothing. Filed 2026-08-03 during P.15's scaffold pass, before either P.9 or P.11 gets built on top of an assumption this already works.

**Current architecture, confirmed by direct code read, not assumed:** `public.users.subscription_tier` / `subscription_status` is the single source of truth for premium status app-wide. Today it is written **only** by the Stripe webhook (`apps/web/app/api/webhooks/stripe/route.ts`). Mobile already reads premium status correctly — server-side, through API responses (`useCrystalsOverview.ts` and others reading the tier the server computed), never via a client-side SDK entitlement check — and **must keep doing this** once RevenueCat exists; a client that trusts `CustomerInfo.entitlements` locally instead of the server's own column would let the two diverge silently.

**The gap:** P.15 (this pass) only installs the client SDK and calls `Purchases.configure()` — no webhook, no server-side RevenueCat integration at all. Once a real purchase can happen (P.11), RevenueCat's own dashboard will show it, but nothing tells `public.users` about it.

**The known fix pattern** (`.planning/research/PITFALLS.md` §3, "RevenueCat + Stripe Subscription Sync Failure," HIGH confidence, sourced from RevenueCat's own Stripe-integration docs): RevenueCat webhooks require the receipt to already exist server-side — a `POST /receipts` call pairing `app_user_id` (the Clerk ID) with the platform-specific purchase token must happen before RevenueCat's own webhook can associate the purchase with the app's user. The missing piece here is symmetric: a RevenueCat-side webhook handler (mirroring the existing Stripe webhook route's shape) that receives RevenueCat's subscription lifecycle events and writes to the same `users.subscription_tier`/`subscription_status` columns Stripe already writes — so premium status stays one column, updated from two payment providers, not two divergent sources of truth.

**Trigger, and why it can't wait:** hard prerequisite for P.11 (the pricing surface that will drive real purchases) and P.9 (subscription status display — read-only initially, but "read-only" only means something if the underlying data is real). Needs a home before either opens, not discovered mid-build. Recommend: land as part of P.11's own sub-round (P.11 is the first sub-round that creates a real purchase to sync), or as a small dedicated backend sub-round immediately before P.11 opens if P.11's own scope is already full — founder call, not mine, but it must be decided before P.11 starts, not during.

**Why documented:** discovered by tracing what P.15's scaffold does and doesn't cover, specifically to avoid the failure mode where P.9/P.11 get built assuming server-side sync already exists because "RevenueCat is installed."

## 63. getRequestIp trusts x-forwarded-for — holds only as long as Vercel is the sole edge in front of the app

**Status:** Filed 2026-08-03 while building table-backed rate limiting (`apps/web/lib/rate-limit.ts`, `20260803130000_rate_limit_buckets.sql`) for `cities/search`, `horoscope/generate`, `oracle/generate` — replacing the CA-0002 in-memory limiter, which gave no real protection on serverless.

**Why this is trustworthy today, verified not assumed:** searched for Vercel's actual header guarantees rather than trusting the CA-0002 code's own assumption. Vercel's edge overwrites `x-forwarded-for` before a request reaches a deployed function — a client-supplied value in that header does not survive to application code on non-Enterprise plans, which is what prevents naive spoofing. `getRequestIp`'s `.split(',')[0].trim()` (falling back to `x-real-ip`) reads the leftmost entry, which is the client IP Vercel itself observed at its edge.

**The condition that breaks this:** the guarantee is Vercel-specific — it holds only because Vercel is the sole hop between the internet and the app today. If a CDN or WAF is ever placed in front of Vercel (Cloudflare, a corporate proxy, anything else that terminates the connection first), `x-forwarded-for` reaching Vercel's edge would already contain that layer's forwarded value, and Vercel would append its own hop after it rather than replacing it — `getRequestIp` would then need to read a different position in the chain, or a different header entirely, to stay correct. Getting this wrong doesn't fail loudly: `cities-search`'s rate-limit key partly keyed on this IP would silently degrade to one shared bucket (or one-per-CDN-edge-IP) for all real clients behind it, which either over-blocks everyone or under-blocks an attacker — either way, exactly the kind of gap that surfaces after an incident, not before one.

**Trigger:** before adding any CDN, WAF, or reverse proxy in front of the Vercel deployment — re-verify `getRequestIp` against whatever that layer's actual header behavior is (Vercel's paid "Verified Proxy Advanced" feature is the documented way to keep this trustworthy with a fronting proxy, per Vercel's own docs — not available on the current plan).

**Why documented:** this is exactly the class of assumption that's correct until infrastructure changes silently invalidate it, filed at build time rather than left to be rediscovered mid-incident.

## 64. Mobile Sentry has been dead since install — wrong env var name, and the RN project likely never existed

**Status:** Filed 2026-08-04 during EAS build-setup prep for the first Android preview build. Mobile's `@sentry/react-native` install and `lib/monitoring/sentry.ts` wiring (per SUB-ROUND-8-CLOSE.md's "Init" section) look complete and match web's conservative-defaults posture exactly — `sendDefaultPii: false`, `tracesSampleRate: 0`, no replay, no logs. Despite that, mobile Sentry has produced zero events since it was wired, for two independent reasons, either one of which alone would have been enough:

1. **Wrong env var name, not just wrong value.** `sentry.ts:21` reads `process.env.EXPO_PUBLIC_SENTRY_DSN` and no-ops cleanly by design when it's unset — that's the correct behavior for local dev without credentials, documented in the same file's comment. The actual bug: `apps/mobile/.env.local` carried the value under `NEXT_PUBLIC_SENTRY_DSN` — web's naming convention, not mobile's Expo convention — so every local run had the DSN sitting right there in the file and Sentry still silently no-opped, because the code was never looking at that name. Confirmed via direct grep: the only place `NEXT_PUBLIC_SENTRY_DSN` appeared anywhere in the mobile app was `.env.local` itself; the code, `app.json`, and this REVISIT file's own SUB-ROUND-8-CLOSE.md all correctly reference `EXPO_PUBLIC_SENTRY_DSN`. Fixed 2026-08-04 (founder edited `.env.local` directly; `apps/mobile/.env.example` corrected to document the right name with an explicit warning comment about the mismatch).

2. **`SENTRY_ORG`/`SENTRY_PROJECT` point at web's project, not a mobile one.** `apps/web/.env.local` has `SENTRY_ORG=celestia-ul`, `SENTRY_PROJECT=javascript-nextjs` — the Next.js-specific project slug. `apps/mobile/app.json`'s `@sentry/react-native` plugin entry has no `organization`/`project`/`authToken` config at all, so even once the DSN is correct, there is currently no build-time source-map-upload wiring, and — unverified, `[inferred]` — the RN-specific Sentry project under `celestia-ul` may never have been created in the first place, since nothing in the repo references a mobile-specific project slug anywhere.

**Why this matters going into the first real device/emulator build:** finding #1 means every prior local dev session and every device test run to date had zero crash reporting, and nothing surfaced that — a missing DSN and a working-but-unreported DSN look identical from the outside. This is the same silent-fallback shape as the `OPENROUTER_API_KEY` naming-collision finding (`AI_PROVIDER_DECISION.md` §3.2) and item 9 above (Sentry org slug) — a third, independent instance of "the required-looking thing was quietly doing nothing."

**Fix path:**
- Confirm in the Sentry dashboard whether an RN/mobile project already exists under `celestia-ul`; create one if not (get its own DSN — do not reuse web's `javascript-nextjs` DSN, which routes events to the wrong project's issue stream).
- Set `SENTRY_ORG`, `SENTRY_PROJECT` as regular (non-`EXPO_PUBLIC_`) EAS env vars, and `SENTRY_AUTH_TOKEN` as an EAS secret (`--visibility secret`) — these are build-time-only, used by the Sentry Expo plugin's source-map-upload step, never bundled client-side.
- Once set, verify with a real build (not Expo Go, which only exercises JS-side capture) by force-throwing a test error and confirming it lands in the correct project's Sentry dashboard with a readable (non-minified) stack trace — mirrors the verification method SUB-ROUND-8-CLOSE.md already specified for the DSN-only check.

**Trigger:** Before the first EAS preview/production build is treated as having working crash reporting. Not launch-blocking by itself (the app functions without it), but every day it stays broken is a day of zero visibility into real-device crashes — worth closing before, not after, the first round of device testing generates the crashes it should be reporting.

**Why documented:** Two structurally identical, independently-caused silent failures compounding on the same feature is worth naming as a pattern, not just fixing quietly — the founder's own framing on discovering this: "the same silent-fallback shape as the OPENROUTER_API_KEY finding."

## 65. First EAS preview build failed at source-map upload — @sentry/cli transitive postinstall never completed; SENTRY_DISABLE_AUTO_UPLOAD set as mitigation, class of risk noted

**Status:** Filed 2026-08-05. First `--profile preview` Android build got through all 557 Gradle tasks, native compile for all four ABIs, and Metro bundling (2453 modules) — failed only at the final step, `:app:createBundleReleaseJsAndAssets_SentryUpload_...`, with "A problem occurred starting process 'sentry-cli'". Confirmed via direct filesystem inspection (not assumed from the error text): `@sentry/cli`'s own `node_modules/` directory was empty except for a `.bin` shim folder, and `bin/sentry-cli` was a 487-byte JS wrapper whose `SentryCli.getPath()` pointed at a native binary that had never been downloaded. `@sentry/cli` is a *transitive* dependency — pulled in by `@sentry/react-native`, not declared directly in `apps/mobile/package.json` — and its postinstall script (which fetches the platform binary) never completed for it.

**Mitigation shipped, not the root cause:** `SENTRY_DISABLE_AUTO_UPLOAD=true` set as an EAS build-time env var on both `preview` and `development` environments. Verified against the actual `@sentry/react-native/sentry.gradle` source: the upload task is registered either way but gated `onlyIf { shouldSentryAutoUploadGeneral() }`, which reads exactly that env var — so the task's action (the sentry-cli spawn) never runs when it's set, regardless of whether the binary exists. This is the only such mechanism; there is no app.json/config-plugin equivalent (checked the plugin source directly — it wires DSN/org/project into native config, nothing upload-related). Correct to do regardless of the postinstall bug, since source-map upload is pointless until [[REVISIT-64]]'s Sentry RN project exists.

**Root cause turned out to be a stale local install state, not a hard pnpm block.** A later `pnpm install --force` (done for the unrelated duplicate-React fix below) caused `@sentry/cli`'s postinstall to actually run and download the real binary — `node_modules/.../@sentry/cli/bin/sentry-cli --version` now reports `sentry-cli 2.58.5` successfully on this machine. So this was not pnpm categorically refusing to run transitive postinstall scripts; it was a postinstall that silently failed or was skipped once, on some earlier install, and never retried itself on subsequent plain `pnpm install` runs (pnpm's default fast-path only checks that the lockfile still *satisfies* package.json — it doesn't re-verify that every package's install side-effects, like a postinstall-downloaded binary, actually completed). **This local fix does not carry over to EAS** — the cloud builder does its own fresh install on Linux, independent of this machine's state — so the env var mitigation stays necessary regardless of this finding, until the build is re-run and confirmed clean.

**The risk class, as requested:** any transitive dependency whose postinstall script downloads a platform binary (native CLI tools, prebuilt bindings) can end up in this same "wrapper present, binary missing" state, and it will look completely healthy until the moment something tries to spawn it — same shape as the `OPENROUTER_API_KEY` and Sentry-DSN-naming silent-fallback findings elsewhere in this file: a required-looking thing quietly doing nothing.

**Cheap detection, investigated but not run to completion (scoped, not executed, per founder's "not now"):**
- Enumerating every installed package with a `postinstall` script across the whole pnpm store costs ~3–4 seconds (`find node_modules/.pnpm -maxdepth 5 -name package.json | xargs grep -l '"postinstall"'`) — small surface today: 10 packages (`@clerk/shared` ×3 resolutions, `@sentry/cli` ×2 resolutions, `browser-tabs-lock`, `core-js`, `esbuild`, `supabase`, `unrs-resolver`).
- A filesystem-only heuristic ("is the package's own `node_modules/` empty") is **not reliable on its own** — tried it, and it flags healthy packages (`esbuild`, which the build already uses successfully) as false positives, because some packages download their binary as a loose file rather than as a nested npm dependency, and pnpm always creates an empty-looking `.bin` shim folder regardless of whether the real payload landed.
- The check that actually caught the real bug: invoke each flagged package's own CLI entrypoint with `--version` (resolving the real path from that package's `package.json` `"bin"` field) and check for a clean exit vs. a spawn/module-not-found error. This is package-agnostic and was confirmed working (`sentry-cli --version`, `esbuild --version` both returned cleanly once the state was known-good). Scripting this properly across all flagged packages — resolving each one's real bin path instead of guessing — is maybe 15–20 minutes of work, not a big lift, but wasn't run to completion this session since it wasn't the immediate blocker.

**Trigger:** Re-run this build once EAS confirms the `SENTRY_DISABLE_AUTO_UPLOAD` env var takes effect; treat any future "process cannot start" failure on a build task as this same class first, before assuming a new bug. Worth running the `--version`-based sweep once, non-urgently, whenever there's spare time before the next EAS build cycle — cheap and answers the "is anything else in this state" question definitively instead of by inference.

## 66. Duplicate React (`packages/ui` resolving its own copy) — fixed twice by two concurrent sessions, reconciled 2026-08-05

**Status:** `packages/ui/package.json` declared `react` in both `dependencies` (`^19.0.0`, a loose range) and `peerDependencies` (same range, correct). The `dependencies` entry meant pnpm resolved `packages/ui`'s own React independently of the rest of the workspace — the lockfile showed it landing on `19.2.3` while `apps/mobile` and the rest of the graph were pinned to `19.1.0`. Node/Metro's nearest-`node_modules` resolution means anything imported from `packages/ui` would load its own separate React instance the moment it used a hook or Context.

**Two Claude Code sessions were running against this working tree concurrently and independently fixed this the same afternoon, without either knowing about the other:**
- One session removed `react` from `packages/ui`'s `dependencies`, keeping only the `peerDependencies` entry (root-cause fix), then ran `pnpm dedupe` to prune the stale lockfile entry.
- The other session added a `pnpm.overrides` block to root `package.json` pinning `react`, `react-dom`, `@types/react`, and `@types/react-dom` workspace-wide (symptom-level fix), and separately ran `expo install --fix`, which bumped `expo`/`expo-font`/`expo-router` to their SDK-54-expected patch versions and auto-added the `expo-font` config plugin to `apps/mobile/app.json`.

Both landed in the same uncommitted working tree at once. The override was masking whether the dependency removal had actually taken — and in fact the dependency removal had been silently overwritten back to its original state by the other session's concurrent edit, so at the moment of discovery `packages/ui` still had `react` in `dependencies` **and** the workspace-wide override was in effect simultaneously. The lockfile happened to still resolve to a single `react@19.1.0` throughout (the override was successfully forcing convergence), so nothing was visibly broken — but the underlying wrong declaration was still there, papered over rather than fixed.

**Resolution (founder-directed, 2026-08-05):** kept the dependency-removal fix, discarded the override. Reasoning: the override masks a wrong declaration instead of correcting it, applies far more broadly than needed (every package in the workspace, not just `packages/ui`), and — unlike the `sweph` override, which pins against upstream relicensing outside this team's control — this was purely an internal authoring mistake with a direct one-line fix. Removed the four react-related override entries from root `package.json` (kept `sweph` only), re-removed `react` from `packages/ui`'s `dependencies`, reran `pnpm install` + `pnpm dedupe`. Verified: exactly one `react@19.1.0` entry across the entire `pnpm-lock.yaml`, `packages/ui`'s lockfile importer resolving `19.1.0` (not `19.2.3`), `apps/mobile` and `packages/ui` both typecheck clean. The `expo install --fix` version bumps and the `expo-font` plugin addition from the other session were left in place — legitimate, unrelated improvement (this was the exact list `expo install --check` had already surfaced), not part of the conflict.

**Acceptance test (per founder instruction, matching what the override session had been chasing):** ran `next build` on `apps/web` after the reconciliation. All 45 pages generated cleanly including `/_not-found` (Next's actual `/404` route) — no "Cannot read properties of null (reading 'useContext')" anywhere in the output, confirming the duplicate-React condition is actually gone in a real build, not just theoretically fixed per the lockfile.

**Why this is the masking case, stated plainly (the point of documenting it at all):** at the moment of discovery, `packages/ui` still had the wrong `dependencies` entry — the earlier fix had been silently reverted by the other session's concurrent write, with neither session able to see that happen from its own view. Independently, the other session's override was already forcing every `react` resolution in the workspace to `19.1.0`. The two together meant: the lockfile resolved cleanly to a single React version, `pnpm install` reported nothing wrong, and there was no error, warning, or symptom anywhere to inspect. **Everything looked green. The actual bug — the wrong `dependencies` declaration — was still sitting in the tree the whole time, fully masked by the override's side effect.** This is not a hypothetical risk of overriding instead of fixing; it is what actually happened here, caught only because the founder inspected the tree directly rather than trusting that a clean lockfile meant a clean cause. It is the concrete argument for why a wrong declaration gets corrected at its source rather than pinned around: a correction is verifiable by its own absence (no entry, nothing to resolve independently); an override's success is silent about whether the thing it's compensating for is still broken underneath.

**Why documented:** the founder's own framing on discovering this — two long-lived concurrent sessions against one working tree is the same class of problem as two long-lived divergent branches (see [[feedback_develop_branch]]), and this incident is the proof: two independently-reasonable fixes for the same bug, landed at once, each invisible to the other, only caught because the founder happened to inspect the tree before either session committed. The danger isn't only conflicting edits in the obvious sense — it's that a concurrent write can silently revert a fix while a second, unrelated change makes the result look correct, and neither session can detect that from its own view. **Going forward: one Claude Code session at a time against this repo. If a session ever finds files it did not modify, stop and surface it rather than working around it.**

## 67. Zero brand imagery anywhere in the repo — three failed builds, two of them from an unverified hypothesis; fixed for real on the third attempt with actual assets

**Status:** Filed 2026-08-05, closed same day after a wrong fix and a corrected one. Second `--profile preview` Android build failed at `:app:processReleaseResources` with `error: resource drawable/splashscreen_logo not found`. First response (below) traced the bug correctly but picked the wrong fix, unverified — the third build failed **identically**, proving it. Re-investigated by instrumenting the actual generated native tree before touching anything again, per explicit founder correction: "two failed attempts — instrument, do not hypothesise a third fix."

**What the first pass got right:** `app.json`'s `expo-splash-screen` plugin config was `{"backgroundColor": "#08060f"}` only, no `image`. Traced `@expo/prebuild-config`'s `withAndroidSplashImages.js` (only writes the drawable `if (image)`) against `withAndroidSplashStyles.js`'s `addSplashScreenStyle` (unconditionally writes `windowSplashScreenAnimatedIcon = @drawable/splashscreen_logo` into `styles.xml` for any non-legacy config) — `image` is documented as optional but isn't, in practice, for Android on this SDK line. This diagnosis is correct and matches upstream reports found independently: **expo/expo#34430** ("Android build fails if config plugin is only provided with background color") is this exact bug, and #34924/#32723/eas-cli#2897 all confirm it. Every one of those issues resolves by **supplying an image** — none of them resolve by removing the plugin.

**What the first pass got wrong:** removing the `expo-splash-screen` plugin from `app.json`'s `plugins` array, reasoning that with the plugin absent, `addSplashScreenStyle` could never run. This missed a second, separate wiring path: `@expo/prebuild-config/build/plugins/withDefaultPlugins.js` applies `expo-splash-screen`'s Android mod **unconditionally**, via a `versionedExpoSDKPackages` list and a `createLegacyPlugin` fallback, whenever the package is installed as a dependency — entirely independent of the `plugins` array. Confirmed empirically, not just re-read from source: ran `npx expo prebuild --platform android --no-install` against the plugin-removed `app.json` and grepped the generated tree. `windowSplashScreenAnimatedIcon = @drawable/splashscreen_logo` was still written to `styles.xml`, and `ic_launcher_background.xml` still referenced the same drawable — exactly matching eas-cli#2897's observation that more than one file writes the reference. The earlier fix never had a chance of working; the third EAS build failing identically was the confirmation, not a new bug.

**One unexpected/instructive finding from that first instrumentation run, worth recording:** with the plugin removed and no image configured anywhere, `expo-splash-screen`'s Android mod still generated real (non-empty) `splashscreen_logo.png` files at every density — a faint gray concentric-circle/bullseye placeholder graphic, not brand content, not a blank/empty file. This means the local prebuild's default-fallback behavior does not reproduce EAS's actual failure 1:1 — something in Expo's tooling supplies a placeholder image locally that the real EAS cloud build apparently does not (environment/cache difference, not chased further since it doesn't change the fix). **Practical lesson: "the local build succeeds" cannot be trusted as a pass signal for this class of bug without actually supplying the real named assets and re-verifying** — a local run can look green for a different reason than the fix being correct.

**Also found and reverted, unprompted — a second, different class of leakage than the one being guarded against:** `npx expo prebuild` doesn't only write into `android/` (already gitignored, harmless). It also rewrote `apps/mobile/package.json`'s `android`/`ios` npm scripts in place, from `expo start --android`/`--ios` to `expo run:android`/`expo run:ios` — a **tracked** file, not covered by `.gitignore`, and a real change that would have silently landed if `git status` hadn't been checked after every prebuild run. Reverted via `git checkout -- package.json` both times prebuild ran. Worth remembering as its own instance of [[feedback_one_session_at_a_time]]'s underlying lesson: verify the *actual* diff after any tool that mutates files as a side effect, not just the directory you expected it to touch.

**Fix, verified this time before spending another EAS queue slot:** founder supplied two real, verified assets — `apps/mobile/assets/splash.png` (512×512, decoded pixel-by-pixel: every pixel solid `RGB(8,6,15)` = `#08060f`, full opacity, no exceptions) and `apps/mobile/assets/notification-icon.png` (96×96, decoded pixel-by-pixel: every pixel with alpha > 0 is exactly `RGB(255,255,255)`, no other color present — true white-on-transparent). Re-added `expo-splash-screen` to `app.json`'s plugins with `image: "./assets/splash.png"`, and added `expo-notifications` to the plugins array (it was a dependency but not a listed plugin at all before) with `icon: "./assets/notification-icon.png"` — confirmed via `expo-notifications`' own plugin source that `icon` is the correct config key and that it properly gates (`if (icon) { ... }`, safe when absent, unlike splash's unconditional write).

**Verification, run before this fix was reported done:** re-ran `npx expo prebuild --platform android --no-install`. `styles.xml` and `ic_launcher_background.xml` both still reference `@drawable/splashscreen_logo` — but now `drawable-{m,h,x,xx,xxx}hdpi/splashscreen_logo.png` all exist and were visually confirmed (opened the generated file) to be the real solid dark background, not the earlier placeholder. `AndroidManifest.xml` correctly wires both `com.google.firebase.messaging.default_notification_icon` and `expo.modules.notifications.default_notification_icon` meta-data to `@drawable/notification_icon`, and `notification_icon.png` exists at every density, visually confirmed as the real white glyph. Wrote a small script cross-referencing every `@type/name` resource reference in the generated tree's XML against every actual resource definition found in it — 4 apparent "dangling" hits, all checked individually and confirmed as false positives from the script's limited scope (resources bundled inside `expo-secure-store`'s and AndroidX's own AAR packages, not written into the app module's local `res/` tree, real and fine): `xml/secure_store_backup_rules`, `xml/secure_store_data_extraction_rules` (defined in `expo-secure-store`'s own package), and `drawable/abc_textfield_default_mtrl_alpha`, `drawable/abc_textfield_activated_mtrl_alpha` (standard AndroidX appcompat resources referenced from React Native's stock `rn_edit_text_material.xml` template, pre-existing, unrelated to this session's changes). Zero genuine dangling references remain. This static check cannot fully replace an actual Gradle resource-merge (the real EAS build is still the authoritative check), but it's the closest local approximation available and it's clean.

**Leakage check (per explicit founder instruction, done after every prebuild run this session, not just once at the end):** `android/` and `ios/` are both listed in `apps/mobile/.gitignore` and neither directory exists after cleanup (`rm -rf android`, verified via `test -d`). `package.json`'s prebuild-mutated scripts were reverted both times. `git status --short` at the repo root, after everything, shows only the intended diff: `apps/mobile/app.json` and the two new asset files. Nothing else changed anywhere in the tree.

**Full asset-pipeline audit — now current, not the earlier version of this entry:**
- **Splash:** fixed, verified above.
- **Notification icon:** fixed, verified above. **Distinct constraint from splash, worth keeping separate for the designer brief:** Google's guidelines (and Expo's own docs) require the Android notification icon to be all-white on transparent, or it may render as a black block or invisible smudge in the status bar — it **cannot** reuse the same solid dark-background splash asset, or any full-color mark. It needs its own white-silhouette-on-transparent version.
- **App icon / adaptive icon:** still not configured (no `icon`, `android.icon`, or `android.adaptiveIcon` keys in `app.json`) — still safe, `withAndroidIcons.js` properly early-returns when nothing's configured, unlike splash's plugin. App still ships with Expo's generic default icon. Real gap for store submission, not a build blocker today. Not fixed in this pass — no icon asset was provided, only splash + notification.
- **Favicon (web):** still confirmed absent, still unrelated to this Android build.

**Trigger:** App icon is the one remaining hard Play Store/App Store submission blocker (Expo's default icon will not pass review) — tracked in the founder track (`CHECKPOINT-2026-08-04.md` §6) and folded into the existing `DESIGNER_BRIEF_ASSETS.md` designer engagement, not a separate commission. Splash and notification icon are already resolved with real, verified working assets (above) — not outstanding. What's still needed: a 1024×1024 transparent square logo mark, usable as the adaptive-icon foreground and, if the founder wants it, an eventual upgrade to the splash centerpiece (currently a flat `#08060f` background with no mark). If the icon mark is ever also redrawn as the notification glyph, remember the constraint discovered this session: Google requires that one specifically to render all-white on transparent, or it risks showing as a black block or invisible smudge in the status bar — it can never be a direct reuse of the color icon mark.

## Appendix — Pre-existing peer warnings (not action items)

- `react-native-web@0.19.13` declares `react@^18.0.0` peer; we have
  `react@19.0.0`. Mobile app builds and runs cleanly today; warning is
  benign. Will resolve when react-native-web publishes React 19 support
  (no current blocker).
