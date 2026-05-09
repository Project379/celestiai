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

## 7. Color contrast audit — pre-launch accessibility-vs-brand decision

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

## 8. Hardcoded mobile streak footer drift from web vocabulary

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

## 9. Sentry org slug rename — blocked on plan tier

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

## 10. Test email domain `@celestia-ai.dev` — kept as historical

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

## 11. GitHub repository rename `Project379/celestiai` → TBD

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

## 12. Web account deletion confirmation copy mismatch

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

## 13. Birth date validation error references internal schema format

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

## 14. Web landing splash heading overflow at default viewport

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

## 15. Clerk application display name still references «celestia»

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

## 16. Mobile sign-up form missing firstName + lastName

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

## 17. Web TIME_RANGES hour string formatting asymmetry

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

## 23. Web Oracle cap-reached path fails silently (post 2026-04-20 cap-gate refactor)

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

## 24. iOS edge-swipe and Android hardware back bypass Oracle reading-view back handler

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

## 26. push_tokens schema + RLS + token registration endpoint design

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

## 30. apps/web/lib/supabase/server.ts JWT fallback + public.ts cleanup (B.0e)

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

## Appendix — Pre-existing peer warnings (not action items)

- `react-native-web@0.19.13` declares `react@^18.0.0` peer; we have
  `react@19.0.0`. Mobile app builds and runs cleanly today; warning is
  benign. Will resolve when react-native-web publishes React 19 support
  (no current blocker).
