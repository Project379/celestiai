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

**Trigger:** Apple Developer Program enrollment ($99/year, requires registered
entity). Founder not enrolled as of 2026-04-28; entity registration not
complete.

**Sub-round when ready:** Phase A sub-round 1.5 OR Phase B sub-round 1,
whichever comes first after enrollment.

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

## 2. Sign in with Apple

**Deferred:** `expo-apple-authentication`.

**Trigger:** Sign in with Apple feature request lands. Likely Phase B+ when
OAuth provider list expands. Apple requires this if any other OAuth provider
is offered on iOS, so likely co-arrives with item 3.

**Re-add path:** `pnpm exec expo install expo-apple-authentication` + iOS
entitlement config in `app.json` ios section.

## 3. OAuth providers (Google, Microsoft, etc.)

**Deferred:** `expo-web-browser`, `expo-auth-session`.

**Trigger:** First OAuth provider feature request lands. Google sign-in
commonly first. Phase B+.

**Re-add path:** `pnpm exec expo install expo-web-browser expo-auth-session`
+ Clerk dashboard provider config + `useOAuth()` hook wiring on sign-in
screen.

## 4. Passkeys

**Deferred:** `@clerk/expo-passkeys`.

**Trigger:** Passkey support feature request lands. Post-launch enhancement;
low priority pre-launch.

**Re-add path:** `pnpm add @clerk/expo-passkeys` + ClerkProvider
`__experimental_passkeys` config.

## 5. Reanimated v4 bump

**Current pin:** `react-native-reanimated: ~3.16.7`. Confirmed working with
RN 0.79.0 + `newArchEnabled: true`.

**Trigger:** Skia + Reanimated v4 work begins in Phase B — chart
visualization, gesture-driven Кръг premium spine, animated transit
indicators.

**Reason for deferral:** v4 is a breaking-change major bump; touches every
Reanimated-using component. Sub-round 1 auth flow uses no Reanimated
worklets. Migration cost only justified when Skia work demands it.

**Re-add path:** `pnpm exec expo install react-native-reanimated@^4.1.0` (or
whichever 4.x line supports current RN at the time).

## Appendix — Pre-existing peer warnings (not action items)

- `react-native-web@0.19.13` declares `react@^18.0.0` peer; we have
  `react@19.0.0`. Mobile app builds and runs cleanly today; warning is
  benign. Will resolve when react-native-web publishes React 19 support
  (no current blocker).
