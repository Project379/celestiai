# Stellaeum mobile (Expo)

Managed Expo workflow — no `android/`/`ios/` directories are committed
(both are in `.gitignore`). Native builds happen on EAS, which runs its
own `expo prebuild` in the cloud from this app's `app.json` and does not
touch this checkout.

## If you ever run `npx expo prebuild` locally (debugging only)

Only do this to inspect the generated native tree when debugging a build
failure (e.g. a missing-resource error) — it's not part of the normal
dev loop, and EAS never needs you to run it. Two things to know before
you do:

1. **It silently rewrites `package.json`.** Confirmed 2026-08-05 while
   debugging the Android splash-screen resource-linking failure
   (`.planning/phases/phase-a-mobile-scaffold/REVISIT-TRIGGERS.md` item
   67): `expo prebuild` rewrites this file's `android`/`ios` npm scripts
   in place (`expo start --android` → `expo run:android`), on top of
   generating the native directories. This is a **tracked file**, not
   covered by `.gitignore` — it happened on both prebuild runs that
   session and would otherwise land as a mystery diff someone commits
   without noticing why. Run `git status` / `git diff package.json`
   after every local prebuild and `git checkout -- package.json` to
   revert it if you don't actually intend to change those scripts.

2. **Clean up the generated `android/`/`ios/` directories when done.**
   They're gitignored so they won't show up in `git status`, but leaving
   a stray native directory in place silently flips local tooling from
   managed to bare workflow behavior — it won't surface as a problem
   until much later. `rm -rf android ios` once you're done inspecting.

3. **A clean local prebuild is not proof an EAS build will succeed** —
   see `.planning/VERIFICATION-SURFACE-GAPS.md` item 3. Local prebuild
   has been observed generating a placeholder resource where EAS's cloud
   prebuild generated nothing and failed. Use local prebuild to
   *instrument* a failure (grep the generated tree, confirm what
   references what), not to *validate* a fix before an EAS build.
