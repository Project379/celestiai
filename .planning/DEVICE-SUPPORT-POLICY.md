---
title: Device support policy
status: living document — the reference for "what device should this layout/feature work on"
created: 2026-09-04
supersedes: the iPhone SE (375x667) reference used in the 2026-09-03 Днес
  layout measurement (Gemini cost/rate-limit report, item 3) — that
  reference predates this policy and used the wrong device for this
  market. See "Design floor" below.
---

# Device support policy

Two separate questions, answered separately. Conflating them was the
mistake in the 2026-09-03 measurement.

1. **Install floor** — which OS versions the app is built to run on at
   all (`ios.deploymentTarget`, `android.minSdkVersion`). A store/build
   config decision.
2. **Design floor** — what screen dimensions layout work should be
   checked against. A layout decision, independent of OS version — a
   current OS runs on both small and large screens.

---

## Install floor

**iOS 17 / Android 11 (API 30).** Set in
`apps/mobile/app.json`'s `expo-build-properties` plugin
(`ios.deploymentTarget: "17.0"`, `android.minSdkVersion: 30`), 2026-09-04.

Expo SDK 52's own defaults are iOS 15.1 / Android 7.0 (API 24) — far more
permissive than this policy. Framework-default is not "no floor," it's a
*stale* floor: it was never revisited against what's actually in the
Bulgarian market, and Statcounter's own data shows nobody meaningfully
runs anything that old here anyway (see below). This policy makes the
floor match reality instead of an unexamined framework value.

### The data behind it — Bulgaria-verified

Fetched directly from Statcounter, **[Mobile Operating System Market
Share Bulgaria](https://gs.statcounter.com/os-market-share/mobile/bulgaria)**,
period **August 2026**:

| OS | Share |
|---|---|
| Android | **75.85%** |
| iOS | **24.14%** |

Android version share, **[Android Version Market Share
Bulgaria](https://gs.statcounter.com/android-version-market-share/mobile-tablet/bulgaria)**,
August 2026:

| Version | Share |
|---|---|
| 16.0 | 34.52% |
| 15.0 | 16.59% |
| 14.0 | 15.43% |
| 13.0 | 13.29% |
| 12.0 | 7.65% |
| 11.0 | 5.27% |
| (10 and below, combined) | ≈7.25% |

iOS version share, **[iOS Version Market Share
Bulgaria](https://gs.statcounter.com/ios-version-market-share/all/bulgaria)**,
August 2026: dominated by iOS 26.5/26.6 (≈73% combined); the oldest
version with a visible share is **iOS 18.7 at ≈8%**. Nothing below 18.7
registers.

### What this floor excludes

- **iOS: ≈0%.** Every observed iOS version in Bulgaria (18.7 and up) is
  already above the 17.0 floor.
- **Android: the "10 and below" bucket, ≈7.25% of Android users ≈ 5.5%
  of the entire Bulgarian mobile market** (7.25% × 75.85%). Android 11+
  already covers ≈92.75% of Bulgarian Android users, so this floor
  matches an existing near-consensus rather than cutting into live usage.

### Downside beyond exclusion

None found beyond the ≈5.5% figure above. Neither app store penalizes a
higher-than-default floor — Apple and Google police the build *ceiling*
(current Xcode/SDK, current `targetSdkVersion`), not how high you set the
floor. Raising it costs only the users below it; it doesn't cost
approval risk, review time, or anything else store-side.

### What else needed to change to match

- `apps/mobile/app.json`: `expo-build-properties` plugin now carries
  `ios.deploymentTarget: "17.0"` and `android.minSdkVersion: 30`
  alongside the existing `android.packagingOptions` entry.
- Nothing else. `apps/mobile/ios/` and `apps/mobile/android/` are
  gitignored (confirmed via `git ls-files` — not committed), so this is
  a pure CNG project: native projects are regenerated fresh from
  `app.json` on every `expo prebuild` / EAS Build. There is no checked-in
  `Podfile` or `build.gradle` to hand-edit. A stale *local* prebuild
  output (from a prior `expo prebuild` run on a dev machine) would need
  `npx expo prebuild --clean` to pick this up for local simulator/device
  builds; EAS Build always prebuilds fresh in the cloud, so cloud builds
  are unaffected by local staleness.
- `apps/mobile/eas.json` has no hardcoded Xcode/NDK/SDK version pins to
  reconcile — checked, none found.

---

## Design floor — separate from the install floor

**360×780 CSS px**, not iPhone SE's 375×667.

### Why not iPhone SE

SE-class hardware is very likely **under 1-2% of the Bulgarian
market — INFERRED, not directly measured.** Neither Statcounter nor
TelemetryDeck publish an SE-specific or Bulgaria-specific breakdown by
iPhone model; the inference chain is: iOS is 24.14% of Bulgaria (Bulgaria-
verified, above), and iPhone SE does not appear in TelemetryDeck's global
top-10 iPhone models for September 2026 (fetched: iPhone 13, 15, 16 Pro,
17, 17 Pro, 17 Pro Max) — so SE is a minority even within the smaller iOS
share. 24% × "not in the global top 10" plausibly lands SE-class hardware
under 1-2% of Bulgaria's total mobile market. **This is a proxy inference,
not a Bulgaria-verified figure — flagged explicitly.**

### Why 360×780 instead

**Proxy inference from global budget-device reporting, NOT
Bulgaria-verified** — flagged explicitly, same as above. Budget Android
in 2026 is not small-screen. Global reporting on 2026's best-selling
budget/entry Android lines (Samsung Galaxy A0x/A1x series, Xiaomi Redmi
A-series — the lines that dominate most emerging/mid markets, plausibly
including Eastern Europe, though no Bulgaria-specific model-share figure
was found) ships with 6.5"+ displays. Separately, general 2026 mobile-web
viewport-width reporting (global, not regional) puts 360-384px CSS
viewport widths as the most common band across budget-to-mid Android
devices, but at *taller* physical heights (780-915px) than iPhone SE's
667px — because modern phones are bigger overall, just cheaper inside.
360×780 sits at the narrow-but-tall end of that band: a reasonable
small-screen reference for a market where the realistic "smallest common
device" is a large-screen budget phone, not a deliberately compact one.

### What this costs in layout freedom

Slightly less horizontal room than the iPhone SE reference the last
measurement used (360px vs 375px — about 4% narrower), but meaningfully
more vertical room (780px vs 667px — about 17% taller). Net effect for
most vertically-stacked mobile layouts (this app's pattern): **more
usable space than the SE-based floor implied**, not less. The 2026-09-03
layout measurement was, if anything, harder on itself than the real
market requires — see the re-measurement in the Gemini cost/rate-limit
report follow-up (item 3, 2026-09-04) for the corrected numbers against
this floor.

### Figures marked Bulgaria-verified vs. proxy inference (summary)

| Figure | Status |
|---|---|
| Android 75.85% / iOS 24.14% (Aug 2026) | **Bulgaria-verified** (Statcounter) |
| Android version breakdown (Aug 2026) | **Bulgaria-verified** (Statcounter) |
| iOS version breakdown (Aug 2026) | **Bulgaria-verified** (Statcounter) |
| iPhone SE ≈ under 1-2% of Bulgaria | **Proxy inference** (chain: verified iOS share × global not-top-10 signal) |
| 360×780 as the realistic small-screen reference | **Proxy inference** (global budget-device and viewport-width reporting, no Bulgaria-specific model-share source found) |

---

## Register

Tracked as `DEVICE-SUPPORT-FLOOR` (RESOLVED) and `DEVICE-PASS-STALE`
(OPEN) in `.planning/PLACEHOLDERS.md`.
