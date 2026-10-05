---
title: Android display compatibility — research and audit
status: research only, build nothing. For founder decisions.
created: 2026-09-28
method: Android/Expo/Google official docs + Bulgaria-verified Statcounter data (via DEVICE-SUPPORT-POLICY.md) checked against our code by grep/read. Every code claim tagged VERIFIED (grep/read) or INFERRED (proxy/reasoned). Real sources cited per claim.
---

# Android display compatibility

Seven research questions, then a screen-by-screen audit, then the Expo-web
preview-trust question. Register at the end.

**Headline:** the app **already ships on Expo SDK 54, not SDK 52 as
CLAUDE.md states** (VERIFIED — `apps/mobile/package.json:27` pins
`"expo": "~54.0.36"`; CLAUDE.md's tech-stack line is stale, flagged as its
own register row). That matters here specifically because **SDK 54 targets
Android 16 / API 36, where edge-to-edge is mandatory and cannot be
disabled** (VERIFIED, `expo.dev/changelog/sdk-54`) — this is not a future
concern to plan for, it is the app's current target API, today, on every
build. Second headline: the daily-horoscope "doesn't fit one screen" issue
is **already self-diagnosed in the code itself**, in detail, with its own
register row — see §4 and the audit below.

---

## Summary table

| # | Question | Finding | Applies to us? | Owner |
|---|---|---|---|---|
| 1 | Bulgaria device/screen spread | Bulgaria-verified OS-version data exists (DEVICE-SUPPORT-POLICY.md); **no Bulgaria- or reliable global screen-size/density dataset found** — density matters far less in RN than native Android anyway (see §1) | Design-floor decision already made (360×780); nothing new to act on | CC |
| 2 | Cutouts/punch-holes/curved edges | Handled automatically by `react-native-safe-area-context` insets, which this app uses broadly (33 files, VERIFIED) | Low risk, already the right pattern | CC |
| 3 | Android 15+/16 edge-to-edge enforcement | **Mandatory now** — SDK 54 targets API 36 | **Yes, live today** | CC |
| 4 | Font scaling / 130%+ | Not clamped anywhere (VERIFIED — no `allowFontScaling={false}` in the codebase); daily horoscope already documented in-code as not fitting one screen even at 100% | **Yes — real risk, gets worse at scale** | CC / Toni (content-length call) |
| 5 | Dark mode | `userInterfaceStyle: "dark"` + explicit `<StatusBar style="light" />`; no `expo-navigation-bar` config found for the 3-button nav bar under edge-to-edge | Mostly handled; one gap | CC |
| 6 | Foldables/tablets | No Android exclusion declared (iOS has `supportsTablet: false`, Android has no equivalent); app is `orientation: "portrait"`-locked, which **Android 17 (API 37) will override on large screens** | Not urgent (Aug 2027 deadline) but a real future item | CC / Toni (declare-or-exclude decision) |
| 7 | Gesture nav / safe areas | Broad, consistent `useSafeAreaInsets`/`SafeAreaView` usage; tab bar height formula explicitly documented as kept in sync across two files | Low risk | CC |

---

## 1. Real device spread — screen sizes, densities, aspect ratios

**Bulgaria-verified (already established, reused here):** Android 75.85%
/ iOS 24.14%; Android version breakdown (16.0: 34.52%, 15.0: 16.59%, 14.0:
15.43%, 13.0: 13.29%, 12.0: 7.65%, 11.0: 5.27%) — source: Statcounter,
August 2026, as already cited in `.planning/DEVICE-SUPPORT-POLICY.md`.
**Not re-derived here**, cited for continuity only.

**New for this doc — screen size/density specifically:** searched for a
Bulgaria-specific or reliable global screen-density distribution dataset.
**None found** — Statcounter does not publish a density/resolution
breakdown, and general 2026 industry commentary on Android density buckets
(`developer.android.com/training/multiscreen/screendensities`, general
device-density blog commentary) only supports a **low-confidence,
INFERRED** claim: xxhdpi (480ppi/3x) and xxxhdpi (640ppi/4x) dominate
current mid-range/flagship Android hardware. No number attached to that
claim is reliable enough to design against.

**Why this matters less than it sounds, for this stack specifically
(VERIFIED, general React Native/Expo behavior, not proxy):** this app is
built in React Native/Expo, which lays out in **density-independent `dp`
via Yoga/flexbox**, not raw pixels — `PixelRatio` and the platform handle
density scaling transparently. Native Android's per-density-bucket asset
concern (the thing xxhdpi/xxxhdpi data would actually inform) barely
applies here; the load-bearing variable for RN layout breakage is **CSS-px
viewport width and aspect ratio**, which DEVICE-SUPPORT-POLICY.md's
360×780 design floor already targets. **Conclusion: no new design-floor
work follows from density data — the existing 360×780 floor is the right
lever, not a density bucket.**

## 2. Cutouts, punch-holes, curved edges, edge-to-edge

Android has no fixed "cutout size" — camera cutouts, punch-holes, and
curved-edge insets are all device-specific and exposed to apps only
through `WindowInsets` (Android) / `react-native-safe-area-context`
(cross-platform layer this app uses). **VERIFIED:** the app uses
`useSafeAreaInsets()`/`SafeAreaView` in 33 files across
`apps/mobile/app/` and `apps/mobile/components/`, including every major
screen and `ScreenShell.tsx` (the shared shell most screens render
through). This is the correct pattern — there is no fixed-cutout number to
design against; consuming live insets is the actual Android answer to
"what does edge-to-edge require," not a fixed padding constant.

**One gap found (VERIFIED by grep, `-i "androidNavigationBar"` and
`"expo-navigation-bar"` across `apps/mobile`):** no `expo-navigation-bar`
package or config exists. Under mandatory edge-to-edge (see §3), the
3-button nav bar (where present — gesture-nav users don't see this) is
transparent by default and needs its icon color set explicitly for
contrast against this app's dark background; `expo-status-bar`'s
`style="light"` (VERIFIED, `app/_layout.tsx:69`) only covers the **status
bar**, not the nav bar. On a 3-button-nav device this could mean dark nav
icons on a dark background — low severity (most Bulgarian Android 11+
devices default to gesture nav, but 3-button is a user choice, not
excluded), cheap fix (`expo-navigation-bar`'s `setButtonStyleAsync`).

## 3. Android 15+/16 mandatory edge-to-edge — does it apply to us?

**Yes, now, not a future item.** Chain of verified facts:

- `apps/mobile/package.json:27` — `"expo": "~54.0.36"` (VERIFIED, read
  directly — **not SDK 52**, contradicting CLAUDE.md's tech-stack line;
  see the register).
- Expo SDK 54's changelog (`expo.dev/changelog/sdk-54`, fetched directly):
  *"React Native for Android now targets Android 16 / API 36"* and
  *"edge-to-edge will be enabled in all Android apps, and cannot be
  disabled."* (VERIFIED, direct quote.)
- `apps/mobile/app.json` has **no `android.targetSdkVersion` override** in
  its `expo-build-properties` block (VERIFIED, read directly — only
  `minSdkVersion: 30` and a packaging exclude are set), so the SDK's own
  default (API 36) applies unmodified.
- Android's own docs (`developer.android.com/about/versions/16/behavior-changes-16`,
  fetched): for apps targeting API 36, the legacy opt-out attribute
  (`windowOptOutEdgeToEdgeEnforcement`) is **deprecated and disabled** —
  there is no escape hatch even if one were added.

**What it requires in practice:** the system draws behind the status bar
and navigation bar by default; the app is responsible for (a) not letting
content render unreadably under those bars (handled here via safe-area
insets, §2) and (b) setting bar icon contrast itself rather than relying
on an opaque bar background (handled for the status bar, gap noted above
for the nav bar).

**No action needed beyond the nav-bar icon-color gap** — the app's
insets-first layout pattern already satisfies the structural requirement.

## 4. Font scaling / display-size accessibility

**Not clamped anywhere (VERIFIED):** grepped the whole `apps/mobile` tree
for `allowFontScaling`, `maxFontSizeMultiplier`, and
`PixelRatio.getFontScale` — the only hit is a comment in
`components/chart/Plaque.tsx:60` *referencing* the default (unset =
scaling on), not a clamp. **Every `<Text>` in this app scales with the
OS accessibility font-size setting**, RN's default behavior.

**Max scale is higher than the founder's 130% figure, and most Bulgarian
Android users are already on OS versions that support it:** per Android's
own accessibility documentation (`support.google.com/accessibility/android/answer/12159181`
and `developer.android.com` font-scaling guidance, fetched): 130% was the
practical max **before Android 14**; **Android 14+ supports up to 200%**.
Cross-referencing DEVICE-SUPPORT-POLICY.md's Bulgaria-verified Android
version table: **Android 14+ is 34.52% + 16.59% + 15.43% = 66.54% of
Bulgarian Android users (VERIFIED arithmetic on cited Statcounter
figures)** — i.e. two-thirds of the Android install base can reach 200%,
not just 130%. Testing only to 130% understates the real ceiling for most
of this app's own users.

**Daily horoscope — verified against the actual component, not the
founder's recollection:** `app/(authed)/(tabs)/index.tsx` — the code's own
comment block (lines 830–856, VERIFIED, quoted in full below) already
documents this exact problem, independently of this research task:

> "420-450 chars is CLOSE but, on the central estimate, still ~2-3 lines
> (~65-95px) over one screen including this screen's header block, the AI
> disclosure, and the 'Плъзни надолу' hint below the reading — it is not a
> confirmed fit... Re-verify on a real 360x780-class device before
> treating this as solved — see the DEVICE-PASS-STALE register row."

That analysis is **at 100% font scale, analytically, with no on-device
render** (stated explicitly in the same comment). `HOROSCOPE_BODY_STYLE`
(`fontSize: 20, lineHeight: 31`, VERIFIED at line 146-149) is unscaled —
at Android's real-world 130-200% range, this reading, which is *already*
estimated to overflow one screen at 100%, would need roughly 1.3-2x the
vertical space, pushing well past "off by a couple lines" into
"substantially more scrolling required to reach the reading's own end and
the CTA below it." **Important nuance: this is not a broken/clipped
layout** — the screen is a `ScrollView` (via `ScreenShell.tsx`, VERIFIED),
so nothing is inaccessible, it just stops delivering the screen's own
explicit design intent ("first half-second... no reading required," per
the screen's own header comment) once scrolling is required to see the
reading and the one exit CTA.

**This is a content-length decision, not a code bug** — the screen
already reacts correctly to font scale (it scrolls); the actual lever is
the AI prompt's target character count (`apps/web/lib/horoscope/prompts.ts`,
already flagged in-code as tuned down once from 600-850 to 420-450 and
still estimated tight). Already tracked as **REVISIT 57** and
**DEVICE-PASS-STALE** per the code's own comments — this research
confirms the diagnosis, doesn't change it.

## 5. Dark mode

`app.json` sets `"userInterfaceStyle": "dark"` (VERIFIED) and
`app/_layout.tsx:69` sets `<StatusBar style="light" />` (VERIFIED) — light
icons on a dark background, correct pairing. Android-side implication
specific to dark theme + edge-to-edge: system bar icons need to stay
legible against whatever content scrolls underneath them, not just the
screen's nominal background color — worth a spot-check once real content
renders (moon glyph glow, ambient washes) under the transparent status
bar, but no code gap found beyond the nav-bar item in §2.

## 6. Foldables and tablets

**No explicit Android declaration either way** — `app.json`'s `android`
block (VERIFIED, full contents: `{"package": "com.stellaeum.app"}`) has no
tablet/foldable opt-out, unlike iOS's explicit `"supportsTablet": false`.
Unlike Apple's App Store, Google Play does not let you exclude by device
form factor the same way — a tablet or unfolded foldable can install this
app today and it will run in the phone-sized compatibility window Android
has historically provided for portrait-locked apps.

**That compatibility window is being phased out, on a longer clock than
edge-to-edge (INFERRED timeline framing, VERIFIED facts underneath):**

- `app.json`'s `"orientation": "portrait"` (VERIFIED) locks the app to
  portrait.
- Android's own developer docs
  (`developer.android.com/about/versions/17/changes/ff-restrictions-ignored`,
  fetched) state plainly: on large-screen devices (smallest width ≥600dp
  — tablets, unfolded foldables), **"restrictions on orientation and
  resizability are ignored"** starting with apps targeting API 37
  (Android 17).
- Google Play's own mandatory target-API deadline for **API 36** (which
  this app already meets, see §3) is August 2026; the **API 37** deadline
  (where the orientation-lock override actually bites) is reported as
  **August 2027** (secondary source: `ecorpit.com` migration-deadline
  explainer, cross-checked against Android's official versions-17
  behavior-changes page — the API-37 date itself is not yet on
  `developer.android.com` in as firm a form as the API-36 date was, so
  **mark the August 2027 figure INFERRED/secondary-sourced**, not
  Google-primary-verified).

**What this means concretely:** nothing breaks today. On a large-screen
device running Android 17+, once this app is compiled against API 37 (not
yet, and not urgent), the OS will simply stop honoring the portrait lock
and letting/forcing the app into a resizable/rotatable window it has never
been designed or tested for — the risk is a genuinely un-adapted layout
rendering on a tablet-sized landscape canvas, not a rejection or a crash
on submission.

**Recommendation (founder decision, not urgent):** explicitly decide
declare-support-with-adaptive-layout vs. exclude-large-screens, before the
API 37 deadline approaches — not now.

## 7. Gesture navigation vs three-button nav, and safe areas

**VERIFIED, broad and consistent:** 33 files under `apps/mobile/app/` and
`apps/mobile/components/` use `useSafeAreaInsets`/`SafeAreaView`,
including every screen read for this audit. The tab bar's own height
formula is explicitly kept in sync across two files by comment
(`ScreenShell.tsx:66-69`: *"matching `(tabs)/_layout.tsx`'s own `56 +
insets.bottom` tab-bar-height formula exactly (keep the two in sync if
that formula ever changes)"*) — a real coupling risk (a formula-drift bug
class, not a today-bug) but not evidence of anything currently broken.
**No hardcoded system-bar-height constants found** in the screens read
(`index.tsx`, `premium.tsx`, `ScreenShell.tsx`) — everything reads live
insets. This is the correct pattern for both gesture nav (small/zero
bottom inset) and 3-button nav (larger bottom inset) without a
per-nav-mode branch anywhere in the code, which is exactly right — insets
already encode the difference.

---

## Screen audit

### Paywall compliance block (`app/(authed)/you/premium.tsx`)

**Read directly (VERIFIED).** Low risk. The whole screen is a
`ScrollView` (`contentContainerStyle` with explicit `paddingBottom: 80`,
line 142), and the compliance disclosure block (store-charge notice,
auto-renewal notice, cancel instructions, AI-disclosure, Terms/Privacy
links — lines 519-535) sits **above** the purchase button in normal
document flow, not pinned or fixed-height. At any font scale this block
simply pushes the purchase button further down the scroll, never off an
unreachable edge — the required-before-purchase compliance text (Apple
3.1.2-shaped requirement, same logic likely applies to Play's subscription
disclosure expectations, see Part 2) stays visible-on-scroll rather than
clipped. **No code gap found here.**

### Daily horoscope (`app/(authed)/(tabs)/index.tsx`)

**Read directly (VERIFIED).** See §4 in full — this is the screen most
likely to visibly degrade (not break) under real font-scale settings,
already self-diagnosed in the code with its own register row
(DEVICE-PASS-STALE) and revisit tag (REVISIT 57). The fix, if the founder
wants one before re-verifying on a real device, is a content-length
decision (shrink the AI prompt's target character count further, e.g.
toward the 350-390 range the code's own comment already names as
"fit[ting] with real margin"), not a layout rewrite — the scroll mechanics
underneath are already correct.

### Other screens — spot-checked, not individually read in full

Not read line-by-line in this pass (scope: paywall + horoscope were the
named starting points); flagged by pattern-match for a follow-up pass if
wanted:

- **`app/(authed)/(tabs)/chart.tsx` + `NatalWheel.tsx`** — an SVG chart
  wheel with `Text`/glyph labels at fixed pixel sizes inside a fixed-size
  `Svg` canvas (react-native-svg, not scaled by RN's font-scale system at
  all — SVG text sizing is independent of the OS accessibility
  setting). This is actually **lower** risk from font-scale specifically
  (SVG text doesn't respond to it) but a **different** risk: legibility of
  small glyph/degree labels at the design floor's 360px width,
  independent of accessibility settings — worth a real-device check but
  out of this task's two named screens.
- **`components/design-system/ScreenShell.tsx`** consumers generally —
  since every screen built on it inherits the same scroll-based,
  insets-driven structure verified safe in §7, screens built on it
  (most of the app) share the horoscope screen's "degrades gracefully by
  scrolling further" property rather than a hard break, unless their own
  content (like the horoscope's AI-generated prose) is long enough to
  make that degradation visible.

---

## Expo web (react-native-web) as a UI-iteration preview

**Which previews can be trusted:** screens built from ordinary RN
primitives (`View`, `Text`, `Pressable`, `ScrollView`) via `ScreenShell`
and `react-native-safe-area-context` render through react-native-web
(`apps/mobile/package.json:58`, `"react-native-web": "~0.21.2"`, VERIFIED)
about as faithfully as any RN-Web setup gets — flexbox-based layout,
insets, and scroll behavior all have solid react-native-web support. The
`npm run web` script exists and is wired (`apps/mobile/package.json:10`,
`"web": "expo start --web"`, VERIFIED). **Trust these for layout/spacing/
copy iteration.**

**The chart wheel is the correct thing to distrust, but not for the
reason CLAUDE.md's old note implies.** VERIFIED by reading
`apps/mobile/components/chart/NatalWheel.tsx` directly: imports are
`react-native-svg` (`Svg, Circle, G, Line, Path, Text as SvgText`) plus
`react-native-reanimated`'s `useAnimatedProps`/`withTiming` for the
wheel's animated SVG props — **there is no Skia here, confirming
CLAUDE.md's current note is accurate for mobile** ("no Skia dependency
exists in the app"). Separately confirmed (VERIFIED, grep):
`apps/web/components/chart/NatalWheel.tsx` is a **completely separate**,
D3-driven implementation — mobile and web do not share this component at
all, so an Expo-web render of `apps/mobile`'s chart screen is previewing
**mobile's own** SVG+Reanimated wheel, not a stand-in for web's actual D3
chart.

**Is that a react-native-web limitation or a real bug?** Neither,
confidently, without a live render — this is an **INFERRED risk flag**,
not a checked finding: `react-native-reanimated@~4.1.7` (VERIFIED,
`package.json:54`) is a major-version jump with its own web
implementation strategy (Reanimated has no JSI/worklets on web and falls
back to a JS-driven shim); `useAnimatedProps` feeding SVG-specific props
(not just `style`) is exactly the kind of animation surface that has
historically had rougher react-native-web parity than plain style
animations. **This needs a live `npm run web` check against the chart
screen specifically** — not run as part of this research-only task — to
say definitively whether it renders (possibly with animation glitches,
which would be a web-preview-only limitation, safe to ignore for native
QA) or fails outright (which would need the mobile team's attention
regardless of web). Until checked: **treat the chart screen specifically
as an untrusted preview; trust everything else.**

---

## Register

| ID | Description | Type | Owner | Status |
|---|---|---|---|---|
| CLAUDE-MD-EXPO-VERSION | CLAUDE.md's tech-stack line says Expo SDK 52; `apps/mobile/package.json` pins `~54.0.36` | DOC-DRIFT | CC | OPEN |
| ANDROID-EDGE-TO-EDGE-NAVBAR | No `expo-navigation-bar` config; 3-button-nav icon contrast under mandatory edge-to-edge (SDK 54/API 36, live now) unverified on-device | CODE | CC | OPEN |
| DEVICE-PASS-STALE | (pre-existing, cited not created here) Daily-horoscope one-screen-fit estimate is analytical only, at 100% font scale; this research adds that Android 14+ real max is 200%, not 130%, and covers 66.54% of Bulgarian Android users | CODE | CC | OPEN (pre-existing) |
| ANDROID-LARGE-SCREEN-ORIENTATION | `orientation: "portrait"` lock will be OS-overridden on large screens starting API 37 (~Aug 2027 secondary-sourced deadline); no adaptive layout exists; no declare/exclude decision made | DECISION | Toni | OPEN, not urgent |
| ANDROID-CHART-WEB-PREVIEW-UNVERIFIED | Whether `NatalWheel.tsx`'s Reanimated-driven SVG animation renders correctly under Expo web is untested; treat as an untrusted preview until checked live | CODE | CC | OPEN |
| ANDROID-DENSITY-DATA-GAP | No Bulgaria-specific or reliable global screen-density dataset found; assessed as low-relevance for RN's dp-based layout regardless | EXTERNAL | — | CLOSED (no action needed) |
