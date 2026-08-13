# Verification-surface gaps

Running list of "the thing you can check easily is not the thing that
decides" — cases where a cheap, local, or convenient check can pass while
the real target environment fails, or vice versa. Distinct from
`.planning/archive/HANDOFF-CC-2026-08-04-EOD.md`'s "ungated things hide problems"
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

Named explicitly during the Vercel deployment work (`.planning/archive/CHECKPOINT-2026-08-04.md` §6):
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

## 4. A status doc's claim decays into a verification surface the moment nobody re-checks it against code

Found 2026-08-13 during a documentation audit. `.planning/PROJECT.md`,
`.planning/ROADMAP.md`, `.planning/STATE.md`, and `.planning/REQUIREMENTS.md`
all sat frozen at a 2026-05-09 "0% progress" snapshot while Phases 3
(birth-data), 4 (astrology engine/charts), 5 (AI oracle), 6 (daily
horoscope), 7 (payments), and 8 (diary persistence) actually shipped in
the following months. Nobody caught it until this audit — the same
failure class as PostHog being documented "locked in" while never
installed, and RLS being called "settled" while eight Supabase tables sat
unprotected: a document asserting a state that was true (or believed
true) once, treated as still-current by anyone who read it, and never
re-verified against the actual codebase as time passed. The difference
from items 1-3 above is *when* the gap opens — those are cross-environment
divergences present from the first run; this one opens gradually, the
longer a status doc goes unread-against-code. A status doc is a
verification surface like any other: trusting it without a recency check
is exactly the "the thing you can check easily is not the thing that
decides" pattern this file exists to track. Refreshed the same day this
was found; see `.planning/COMPLETION-TRACKER.md` for the doc meant to
replace this failure mode going forward — it exists specifically so status
claims stay tied to a verification date, not to when the doc was written.

## 5. With a dev client, local `.env.local` correctness becomes a live runtime dependency, not a build-time one

Found 2026-08-13 during the dev-client build setup. Every EAS `preview`/
production build so far has baked `EXPO_PUBLIC_*` values into the shipped
JS bundle at `eas build` time — a wrong value produces a wrong *artifact*,
which is a one-time, reasoning-about-a-fixed-thing problem. `expo-dev-
client` changes this: once the founder's development-profile APK is
installed, it loads JS from Metro over the network on every launch, and
Metro inlines `EXPO_PUBLIC_*` from whatever `.env.local` sits on the
founder's machine *at that moment*. A wrong or stale value there no longer
produces a knowable bad artifact — it silently changes the running app's
behavior on every reload, with no build step to catch it and no artifact
to diff against. Confirmed **not** an issue for the native/Gradle build
step itself — checked the generated (gitignored) `android/` tree, `eas.json`,
`app.json`, `package.json`, and every config plugin under `apps/mobile/
plugins/` for any `EXPO_PUBLIC_*` read at prebuild/Gradle time and found
none; the only EAS-env value the native build step actually consumes is
`SENTRY_DISABLE_AUTO_UPLOAD` (already present, confirmed via `eas env:list
development`). So the dev-client build itself is safe to run as-is — the
gap is specifically post-install, ongoing: `.env.local` now needs the same
level of trust a production env var would get, not the "it's just local
dev, close enough" treatment it's had until now.

## The underlying pattern across items 1-3 (environment-fidelity gaps)

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
