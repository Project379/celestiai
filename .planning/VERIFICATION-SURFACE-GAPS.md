# Verification-surface gaps

Running list of "the thing you can check easily is not the thing that
decides" — cases where a cheap, local, or convenient check can pass while
the real target environment fails, or vice versa. Distinct from
`.planning/HANDOFF-CC-2026-08-04-EOD.md`'s "ungated things hide problems"
pattern (never-run checks) — this list is about checks that *do* run but
verify the wrong surface. Add an entry whenever a new instance is found;
don't let it re-derive from scratch each time.

## 1. `react-native-web` layout is not a valid proxy for real device layout

Web rendering of shared React Native components via `react-native-web`
does not reproduce actual device layout behavior closely enough to be
trusted as a mobile-layout check. A component that looks correct in a
browser via `react-native-web` is not evidence it's correct on a real
iOS/Android device — box model, flex, and text-measurement differences
mean layout bugs can hide on one surface and appear on the other in
either direction.

## 2. "Passes locally, fails in CI" — a local build passing is not evidence a cloud build will

Named explicitly during the Vercel deployment work (`CHECKPOINT-2026-08-04.md` §6):
a clean local `next build` isn't the same as a live push actually going
green on Vercel's infrastructure. This pattern bit the session twice
before it was named. Treat "builds locally" as `[inferred, not verified]`
for anything that depends on the target platform's own build environment
(missing env vars, different Node/OS, different dependency resolution)
until an actual deploy is watched succeed.

## 3. Local `expo prebuild` is not a faithful reproduction of EAS Build's environment

Found 2026-08-05 debugging the Android splash-screen resource-linking
failure (`.planning/phases/phase-a-mobile-scaffold/REVISIT-TRIGGERS.md`
item 67). Running `npx expo prebuild --platform android --no-install`
locally, with no splash image configured anywhere, generated a real
(non-empty) `splashscreen_logo.png` — a placeholder bullseye graphic —
at every density. EAS Build, given the identical `app.json`, produced no
such fallback and failed at `:app:processReleaseResources` with the
drawable missing. Local and remote prebuild diverged on a real,
build-outcome-determining detail (probably an environment or image-cache
difference in Expo's own tooling, not chased further since it didn't
change the fix). **A green local `expo prebuild` cannot be trusted as a
pass signal for asset-resolution bugs on this SDK line** — the real
assets must be supplied and the actual EAS build watched, not inferred
from a local run that may be silently compensating for something EAS
won't.

## The underlying pattern across all three

Convenience/local/cheap verification surfaces (a browser via
`react-native-web`, a local build, a local prebuild) are not neutral
stand-ins for the real target (a device, a cloud build environment, EAS's
own prebuild). Each one can diverge from the real target in either
direction — hiding a real bug, or manufacturing a fake pass — and the
divergence is usually invisible until the real target is actually run.
Treat any of these as `[inferred, not verified]` for exactly the class of
bug the local check happens not to reproduce; don't extend that
uncertainty to unrelated checks the local surface genuinely does cover
well (e.g., TypeScript errors, most logic bugs — those are real local
signal, this list is specifically about environment/build/layout-fidelity
gaps).
