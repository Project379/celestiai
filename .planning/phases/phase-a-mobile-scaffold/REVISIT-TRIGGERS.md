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

**Trigger:** Late Phase C / early Phase D, before App Store submission.
Apple Developer Program enrollment ($99/year, requires registered entity)
gates this; founder not enrolled as of 2026-04-28. Phases A, B, and most
of C run in Expo Go on real iPhone.

**Sub-round when ready:** Inserted into Phase C close or Phase D opener
once enrollment completes. Per founder strategy: launch both surfaces in
parallel; mobile leads post-launch on new features.

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

## Appendix — Pre-existing peer warnings (not action items)

- `react-native-web@0.19.13` declares `react@^18.0.0` peer; we have
  `react@19.0.0`. Mobile app builds and runs cleanly today; warning is
  benign. Will resolve when react-native-web publishes React 19 support
  (no current blocker).
