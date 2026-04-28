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

## Appendix — Pre-existing peer warnings (not action items)

- `react-native-web@0.19.13` declares `react@^18.0.0` peer; we have
  `react@19.0.0`. Mobile app builds and runs cleanly today; warning is
  benign. Will resolve when react-native-web publishes React 19 support
  (no current blocker).
