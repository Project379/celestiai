=== CONTEXT HANDOFF — Stellaeum, Android build #5 queued ===

Repo: Stellaeum, Bulgarian-language astrology SaaS. Next.js web + Expo SDK 54
mobile, pnpm/Turborepo monorepo. Single branch: main. Continues directly from
HANDOFF-CC-2026-08-04-EOD.md and BUILD-LOG-ANALYSIS-2026-08-05.md — read
those first if picking this up cold.

=== WHERE THIS SESSION LEFT OFF ===

Four EAS Android preview builds had failed by end of the previous session,
each exposing a problem one stage later than the last (Sentry upload →
duplicate React → splash-screen resource linking, twice). Local Gradle was
set up to stop paying EAS's ~1hr queue + ~22min build cost per iteration.
The fourth build's actual failure — `mergeReleaseJavaResource` colliding on
`META-INF/versions/9/OSGI-INF/MANIFEST.MF` between `com.squareup.okhttp3:
logging-interceptor:5.3.2` and `org.jspecify:jspecify:1.0.0` — was diagnosed
from a saved dependency report, then fixed and verified locally this
session:

1. **META-INF collision — fixed.** Traced to `com.clerk:clerk-android-api:
   1.0.13` (Clerk's own native Android SDK, pulled in by the Clerk Expo
   module itself — confirmed NOT the Solana/wallet-adapter chain, which is a
   separate top-level dependency with no shared path to either colliding
   artifact). Fixed with a scoped `expo-build-properties` packaging
   exclusion of the exact path (not a `META-INF/**` glob), reasoning
   recorded in the commit body: unlike the earlier duplicate-React bug,
   both colliding artifacts are legitimately needed with no version
   conflict — the collision is two unrelated libraries shipping an inert
   OSGi manifest fragment Android never reads at the same path. Verified
   locally: `./gradlew :app:mergeReleaseJavaResource` succeeds standalone,
   without ever touching the native/CMake build stages.

2. **New blocker found and fixed: Metro/Gradle Windows-only bug.** Getting
   to the point above required first fixing a completely separate,
   previously-unknown-because-never-exercised bug: `:app:
   createBundleReleaseJsAndAssets` failed locally (never on EAS) with
   `Unable to resolve module ...entry.js`. Root cause, confirmed by reading
   `@react-native/gradle-plugin`'s source directly: `Os.kt#cliPath()`
   returns a relative path on Windows and absolute everywhere else; Expo's
   monorepo-aware bundler re-resolves that relative path against a
   different base than it was computed from, doubling the `../..` offset.
   Fixed via `pnpm patch`, narrowed to only take the relative-path branch
   when the absolute path actually contains a space (the documented
   original reason for the workaround). Full writeup, ready to file:
   `UPSTREAM-ISSUE-rn-gradle-cliPath-windows.md`. Also surfaced and fixed a
   real (not manufactured) phantom dependency: `@babel/plugin-transform-
   react-jsx` is used by `@react-native/babel-preset` but wasn't resolvable
   from `apps/mobile`'s own pnpm scope — added as an explicit devDependency.
   Verified locally: `./gradlew :app:createBundleReleaseJsAndAssets`
   succeeds standalone (2453 modules bundled).

Both fixes are committed and pushed (3 commits, `main` at `05a3a40` as of
this writing): the `.gitignore` entry for the scratch dependency report, the
META-INF exclusion, and the gradle-plugin patch + babel dependency.

**What was deliberately NOT chased:** `:app:assembleRelease` still fails
locally on `:expo-modules-core:configureCMakeRelWithDebInfo[arm64-v8a]` and
`:react-native-worklets:` the same — `CreateProcess error=2` on a
`prefab_command.bat` that exists on disk but has a 295-character path,
over Windows' classic 260-char MAX_PATH, even with `LongPathsEnabled=1`
already set in the registry (so the gap is in JVM/Gradle's process-launch
path, not the OS-level opt-in). Explicitly paused per founder instruction:
this is a native ARM compile stage, wholly separate from the Java-resource
packaging collision being verified, and specific to this Windows machine —
EAS's Linux build workers never hit it. Solving it would have been solving
the wrong problem for what was being verified. If it's ever worth solving,
start from the path-length number above and the fact that the registry
opt-in alone isn't sufficient — something in Gradle's `net.rubygrapefruit.
platform` native-platform launcher, or Java's `ProcessBuilder`, needs the
long-path opt-in too (app manifest or `\\?\` prefix), and pnpm's peer-hash-
qualified store directory names (~120+ chars on their own for some
packages) are the real source of the length, not the repo path itself.

=== EAS BUILD #5, QUEUED AS OF THIS HANDOFF ===

First build to include both fixes above. Two outcomes prepared for:

**If it succeeds:** this is the first APK this app has ever produced.
`ANDROID-PREVIEW-TEST-CHECKLIST.md` was re-checked against everything this
session and the prior one changed (splash/notification assets, React
dedup, and now the META-INF exclusion + Windows gradle patch + babel
dependency) — confirmed still current, nothing stale. The build-toolchain
fixes from this session (packaging exclusion, gradle-plugin patch, babel
dependency) touch zero app runtime behavior — nothing new to test because
of them. The checklist's framing that this is the very first real-device
run of this codebase still holds exactly as written.

**If it fails:** expect a new failure, not a repeat — every fix so far has
moved the failure one stage later, never recurred. Read the log fast by
checking *which task* failed first, in this order of likelihood given
what's now cleared:
- Any stage before `createBundleReleaseJsAndAssets` or
  `mergeReleaseJavaResource` would mean a regression in something already
  fixed — check first, but unlikely.
- A *different* file-collision path in a *later* merge task (native `.so`
  library merging is a separate AGP stage from Java-resource merging; the
  local `mergeReleaseJavaResource` success only proves the Java-resource
  layer is clean, not the native-lib layer, which was never exercised
  locally because CMake never got that far). If this is what happens, it's
  fixable with the same scoped-exclusion approach, just a different task.
- Signing/packaging/R8 — no local equivalent was run at all
  (`assembleRelease` never completed locally), so this would be genuinely
  new territory, not a re-surprise.
- If EAS's Linux build hits something in the native/CMake stage that local
  Windows never got to (because Windows failed one step earlier, at the
  path-length wall) — see the strategic note below, this is the case that
  matters most.

**What a fifth failure would mean, written down now, not after the
result:** four builds plus a full local-Gradle setup have gone into this.
If build #5 fails on something Windows-local genuinely cannot reproduce —
concretely, if it fails inside the native/CMake stage that local Windows
never even reached — that is the case to say plainly, not rationalize
around: the local verification path bought real, confirmed value for the
two bugs it did catch (both fixed correctly, both verified fast, at zero
EAS-queue cost), but if the next failure is invisible to it too, its
return on the setup cost has a ceiling this session already found —
platform-specific build stages that only exist on the target platform. In
that world, the right call is not "make local more faithful" as an
open-ended project; it's "spend the EAS build," same as this session
already did when CMake/long-path investigation was paused. Say this
plainly if it happens rather than proposing another round of local-fidelity
work first.

=== FILES FROM THIS SESSION ===

- `UPSTREAM-ISSUE-rn-gradle-cliPath-windows.md` — ready to file against
  facebook/react-native, not yet submitted.
- `patches/@react-native__gradle-plugin@0.81.5.patch` — the actual fix,
  tracked via `pnpm.patchedDependencies` in root `package.json`. Easy to
  miss if not looking for it; noted here for exactly that reason.

=== UPDATE — BUILD #5 (crashed), BUILD #6 (launches, black screen), END OF DAY ===

**Build #5 succeeded, then crashed instantly on launch.** All four Gradle-
stage blockers are now closed for real, `[verified]` against an actual EAS
build, not just local Gradle: Sentry-upload postinstall, duplicate React,
splashscreen_logo resource linking, and the META-INF collision this
session fixed. This is the first native binary this project has ever
produced. `adb logcat -b crash` showed a clean fatal on
`@clerk/clerk-js: The publishableKey passed to Clerk is invalid` —
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_SENTRY_DSN` had both
been set as EAS env vars to the literal placeholder string from setup
instructions, pasted verbatim rather than replaced. `EXPO_PUBLIC_API_BASE`
and `SENTRY_DISABLE_AUTO_UPLOAD` were correct. Fixed via `eas env:set`
(note for next time: `env:update` is deprecated on this CLI version, and
`--force` is not a valid flag — `env:set` is the one that works).

**The lesson, worth repeating because it cost a full build cycle: EAS never
validates env var values.** A placeholder produces a green build and a
dead app — the failure is invisible until the binary actually launches on
a device, an hour and a build slot after the mistake was made. Concrete
process fix, not just a note: **before spending any future EAS build, run
`eas env:list <environment>` and read every value — confirm nothing looks
like a placeholder, an example string, or a `REPLACE_WITH_` prefix.** This
is a 30-second check against a 1-hour+ build cycle; do it every time from
now on, not just after getting burned once.

**Build #6 installs and launches — no crash, but goes black after the
loading screen and stays there.** `[verified]` from a full 607-line
filtered logcat: process alive, zero FATAL/AndroidRuntime errors, clean
foreground/background transitions — this is not a crash, the JS thread
simply stops producing output after a handled RevenueCat error. `[verified]`
zero network requests were ever made (grepped logcat for `10.0.2.2`,
`okhttp`, `fetch` — nothing), meaning execution never reached any
data-fetching code, not a hung fetch.

**Also `[verified]` this build: Sentry captured its first-ever mobile
error** (`ERR-MOB-RC-001`, missing `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
— genuinely still unset in EAS, not part of the four vars fixed for build
#6) — but it landed in the `javascript-nextjs` Sentry project, confirming
REVISIT-64 finding #2 (`SENTRY_ORG`/`SENTRY_PROJECT` point at web's
project) in production, not just in source. Raise this — mobile errors
polluting web's issue stream is worse than not reporting at all, because it
looks like it's working.

**Black-screen diagnosis — root cause found, `[inferred]` from source
reading, not yet re-run on-device to confirm live:**

1. `RevenueCatProvider` (`lib/purchases/RevenueCatProvider.tsx:134`) —
   ruled out, confirmed by reading the code: it `return <>{children}</>`
   unconditionally regardless of whether `configure()` succeeds, throws, or
   the API key is missing. The RC-001 error is real (and the missing env
   var is a real, separate gap — see above) but it cannot be what blanks
   the screen; nothing in this component gates rendering on it.

2. **The actual gate: `app/(authed)/_layout.tsx:50`** —
   `if (!isLoaded) return <AppLoadingScreen />`, where `isLoaded` comes
   from `@clerk/expo`'s `useAuth()`. Traced the routing: root `"/"` maps
   through `(authed)/(tabs)/index.tsx` (the only `index.tsx` in either
   route group), so `AuthedLayout` is the first thing to render on a cold,
   signed-out launch — before any redirect to `/sign-in` can happen, since
   the redirect itself is gated on `isLoaded` first (line 34:
   `if (!isLoaded || !isSignedIn) return`). If Clerk's `isLoaded` never
   becomes `true`, the app is stuck on `AppLoadingScreen` forever — no
   further code past that gate ever mounts, which is exactly why zero
   network requests and zero further JS logs were observed: the Stack
   containing every real screen (`(tabs)`, `wizard`, `oracle`, etc.) never
   renders.

3. **This also resolves the "separate, lower-priority" launch-animation
   note — it is not a splash-asset mismatch, it's this same screen.** Read
   `components/design-system/AppLoadingScreen.tsx` — a rotating instrument
   wheel with 24 tick marks, concentric stroked circles, a violet radial
   glow, and "STELLAEUM" set in Cinzel-SemiBold with a violet text-shadow
   glow, on a `color.base` (near-black) background. This is a pixel-for-
   pixel match for what was described ("bordered circle with tick marks,
   hexagonal glow, and STELLAEUM in Cinzel, with hard visible borders").
   It isn't the native splash handoff at all — `splash.png` is correct and
   already verified pixel-by-pixel — it's this JS component, and it's
   stuck on screen because `isLoaded` never resolves, not briefly shown
   before something else takes over. **Same root cause, one finding, not
   two.**

4. **`NativeEventEmitter` warnings — checked, not the cause.** Two sources
   identified: `@clerk/expo`'s own `useNativeAuthEvents` hook (wrapped in
   try/catch, sets only local optional state, cannot block rendering even
   if it throws — read the source directly) and `react-native-purchases`'
   native module (standard RN pattern warning, non-fatal). Neither gates
   anything; ruled out as contributing to the black screen.

**What's still open, not yet confirmed live:** *why* `isLoaded` never
resolves. Not chased further per instruction (diagnose only, no fix
without on-device verification available). Clerk's readiness typically
depends on a token-cache read (SecureStore — fast, unlikely culprit) and a
network round-trip to Clerk's own Frontend API to validate/refresh the
session (a different host than `EXPO_PUBLIC_API_BASE`'s `10.0.2.2`, so the
"zero network requests" grep — which specifically searched `10.0.2.2`,
`okhttp`, `fetch` — would not have caught a stalled or failed call to
Clerk's cloud API if it used a different log tag). The "Clerk has been
loaded with development keys" log line is a synchronous SDK-init message
tied to recognizing the publishable key's `pk_test_` prefix, not proof
that `isLoaded` itself has resolved — it does not contradict this
hypothesis. **First thing to check tomorrow:** re-run with `adb logcat`
grepping for Clerk's own network activity (its actual API host, not
`10.0.2.2`) to see whether a session-fetch call was attempted, is hanging,
or failed silently.

**End-of-day status:**
- Nothing uncommitted or unpushed — checked via `git status --short` and
  `git log origin/main..HEAD`, both clean, before this handoff was written.
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` still needs setting in EAS
  (confirmed missing via the ERR-MOB-RC-001 Sentry event, not assumed).
- Founder is fixing `apps/mobile/.env.local`'s `NEXT_PUBLIC_SENTRY_DSN` →
  `EXPO_PUBLIC_SENTRY_DSN` themselves — confirmed via direct grep that
  nothing in mobile's own code reads the wrong name (only `.env.local`/
  `.env.example` reference it; `lib/monitoring/sentry.ts` already reads
  the correct `EXPO_PUBLIC_SENTRY_DSN`), so no code-side fix needed.
- No fix was implemented for the black screen — diagnosis only, per
  explicit instruction, since on-device verification wasn't available this
  session. Tomorrow starts with confirming the `isLoaded`-never-resolves
  hypothesis live (the Clerk-network-call check above), then a fix.

=== UPDATE — 2026-08-12, cleartext fix + instrumentation, build #7 queued ===

**EAS env values confirmed clean before spending the build:** `eas env:list
preview` showed real values for `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_API_BASE`, `SENTRY_DISABLE_AUTO_UPLOAD`
— no repeat of the build #5 placeholder mistake. The Clerk `ClerkProvider`
setup in `app/_layout.tsx` matches the documented `@clerk/expo` pattern
exactly (no custom domain/`frontendApi` override), so the dev-instance-key
hypothesis has no code-level smoking gun — the live network trace decides it,
not source reading.

**New bug found and fixed before it could bite: cleartext HTTP blocked in
release builds.** `EXPO_PUBLIC_API_BASE` is `http://10.0.2.2:3000` — plain
HTTP, and Android blocks cleartext traffic by default in release builds. This
was going to break every API call the moment the app got past whatever gates
`isLoaded`, so it was fixed in the same cycle as the instrumentation rather
than queued for a second build. **General lesson worth keeping: when
`expo-build-properties` (currently `1.0.10`) doesn't expose an option you
need — here, a domain-scoped `network-security-config` rather than its only
option, a blanket `android:usesCleartextTraffic` switch — a small local
config plugin under `apps/mobile/plugins/` is the sanctioned route, using
`@expo/config-plugins`'s `withDangerousMod`/`withAndroidManifest` directly.
It must be verified against actual generated output before being trusted,
the same way every other build-toolchain fix this project has shipped was
verified — a plugin that runs without error is not evidence it did anything;
run `expo prebuild` locally and read the generated `android/app/src/main/res/
xml/` file and `AndroidManifest.xml` attribute directly.** Done here:
`apps/mobile/plugins/withEmulatorLoopbackCleartext.js` writes a
`network-security-config` XML permitting cleartext for the literal domain
`10.0.2.2` only (the emulator's documented loopback alias, never a real
routable host) and sets `android:networkSecurityConfig` on `<application>`.
Confirmed via a local `expo prebuild` run that both the XML file and the
manifest attribute are present in the generated output — not inferred from
the plugin source alone. Because the domain match is exact and `10.0.2.2`
never resolves to anything in production, this is safe in a production build
by construction; no build-profile branching was needed (this project's
`app.json` is static, with no `app.config.js` env-conditional logic, so a
profile-scoped approach wasn't even available here without a larger
restructure — the domain-scoped config plugin sidesteps needing one).
Committed separately from the instrumentation below, `53ddb2a`.

**Temporary instrumentation added, `7415d72`:** `app/(authed)/_layout.tsx`
now logs `[AuthedLayout] { isLoaded, isSignedIn, userId }` on every render, to
get a direct answer on whether `isLoaded` ever resolves rather than inferring
it from silence. Marked for removal once the black-screen cause is confirmed.

**RevenueCat: real Test Store key being set for build #7,** replacing the
`REPLACE_WITH_...` placeholder that's been in EAS since day one. Not
platform-split, goes in as `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` as-is.
Expected effect confirmed by reading `RevenueCatProvider.tsx`: `ERR-MOB-RC-001`
(missing key) and `ERR-MOB-RC-002` (placeholder-key warning) should both stop
firing; `configure()` should succeed and log `[RevenueCat] configure() called
for platform "android"` followed by `[RevenueCat] isConfigured() -> true`.
**Worth noting, not chasing as a bug if it deviates:** this is the first
build where RevenueCat leaves Expo Go's "Browser Mode" stub and loads the
real native SDK — a Test Store key working in Browser Mode does not guarantee
it behaves identically natively. Moot for this pass regardless: grepped the
codebase, `purchasePackage()`/`getOfferings()` are not called anywhere yet —
`RevenueCatProvider` is still the P.15 scaffold (`configure()` + identity
`logIn()`/`logOut()` only, per its own header comment), so there is nothing
purchase-flow-shaped to test natively this build. The only live signal this
pass is whether `configure()`/`isConfigured()` succeed.

**Build #7 outcome not yet known as of this update** — founder is setting the
RevenueCat env var, pushing `53ddb2a` and `7415d72`, and starting the build.
Two prepared paths depending on what the `[AuthedLayout]` log shows:
- If `isLoaded` never flips: next diagnostic is an **unfiltered** full-launch
  `adb logcat` capture (not pre-filtered to `10.0.2.2` or any tag — that
  exact mistake is what hid Clerk's traffic in the original black-screen
  read). Capture once, analyze for multiple signals after the fact rather
  than re-capturing per hypothesis: presence/absence of any
  `clerk.accounts.dev` network activity (distinguishes "never called out" from
  "called out and hung"), any `expo-secure-store`/`RNCSecureStore`/Keystore
  exception (a local, non-network cause that would explain a stuck `isLoaded`
  with zero network activity at all), and any `UnknownHostException`/
  `SSLHandshakeException`/`SocketTimeoutException`/`CLEARTEXT communication
  ... not permitted` (the last one specifically would mean the new
  network-security-config plugin didn't take effect on this build — check
  first if seen, cheap to rule in or out).
- If `isLoaded` resolves and the app renders: `ANDROID-PREVIEW-TEST-CHECKLIST.md`
  updated this session (RevenueCat expected-failure entry corrected, cleartext/
  network note added ahead of step 3) — that becomes the live document again,
  first real chance to confirm `EXPO_PUBLIC_API_BASE` actually works from a
  native build.

**Correction, same session: I reverted `expo-dev-client` as apparent noise,
and it was load-bearing.** `expo prebuild` had auto-added it because
`eas.json`'s `development` profile sets `developmentClient: true`; I reverted
it on the reasoning that it was unrequested and unrelated to the cleartext/
instrumentation work. It was not unrelated — `eas-cli` probes for it via
`resolve-from` against a synthetic file, and under pnpm's strict isolation
the module genuinely isn't resolvable when absent, so the probe throws
instead of returning null and the build stays blocked (`eas-cli/build/build/
utils/devClient.js:77`, `isExpoDevClientInstalled`). Same class of issue as
`@babel/plugin-transform-react-jsx` from build #4/#5 — pnpm surfacing a real
requirement that hoisting-based package managers hide. Founder reinstalled it
deliberately (`pnpm add -D expo-dev-client`, `bec6fef`) and pinned `eas-cli`
to `21.8.0` in the same pass (`cc6e8a6`) to stop the version drift that had
already cost time three times (`env:update` deprecated mid-session,
`env:set` behaving unexpectedly, this probe). **Lesson: before reverting an
unexpected dependency addition, check whether a tool added it for a reason —
"unrequested" is not the same as "unrelated."** This is the second time this
week something got reverted as apparent noise and turned out load-bearing;
the first was a concurrent-session React fix (see the standing
one-session-at-a-time discipline note).

=== UPDATE — 2026-08-12, third phantom dependency, build #8 queued ===

**Build #7 failed with a real, different error, and it was in the plugin —
but not the resolution-path problem the local `expo prebuild` verification
was checking for:** `Cannot find module '@expo/config-plugins'` from
`apps/mobile/plugins/withEmulatorLoopbackCleartext.js`. The plugin required
`@expo/config-plugins` directly, which was never a declared dependency of
`apps/mobile` — it resolved locally by accident through pnpm's shared store
(the same store `expo-dev-client` and `@babel/plugin-transform-react-jsx`
had already been found hiding in), and EAS's clean install doesn't have that
accident available. **Third instance of this exact shape in this project.**

**New known local-fidelity gap, alongside the fallback-splash-image
finding from build-planning: a green local `expo prebuild` run cannot catch
a phantom dependency.** Local resolution walks the same long-lived,
broadly-populated pnpm store that hid the other two phantom deps; EAS
resolves against a fresh install with nothing ambient. Reading the generated
manifest/XML output (the standard this project has held to since the
META-INF collision) was still the right verification method for "did the
plugin do what it's supposed to" — it was never capable of catching "does
this module even resolve on a machine that doesn't already have it by
accident," which needs a different check (see below).

**Fixed, `604d032`:** switched the plugin's import from `@expo/config-plugins`
to `expo/config-plugins` — a subpath Expo ships specifically so local config
plugins don't need the package directly. It's a thin re-export file inside
the `expo` package itself, and `expo`'s own `package.json` declares
`@expo/config-plugins` as its dependency — so this resolves anywhere `expo`
resolves (guaranteed by npm-compatible resolution, not by local accident),
with no new dependency and no version-drift surface. Verified by reading
`expo`'s own `package.json` and the `config-plugins.js` re-export file
directly (not just "it resolved on my machine" — confirmed *why* it's
guaranteed to resolve identically anywhere `expo` itself does), plus a full
clean `expo prebuild` (`android/` deleted first, not incremental) confirming
identical, correct generated output.

**Also fixed, `15ed39c`:** `expo-dev-client` had been added via plain
`pnpm add -D expo-dev-client`, which resolved `^57.0.11` — not aligned with
this app's SDK 54. Corrected via `npx expo install expo-dev-client`, which
resolved `^6.0.21`, the SDK-54-correct line. **Caught a real footgun doing
this: the first `git checkout -- package.json` used to revert `expo
prebuild`'s known android/ios-script-rewrite side effect also silently
reverted this uncommitted version fix**, because both changes were sitting
in the same uncommitted file at once. Re-applied and re-verified the diff
contained only the intended change before committing — worth remembering
that a blanket `checkout` on a file discards *everything* uncommitted in it,
not just the change you're trying to undo.

**Two general rules, going forward:**
- **Use `npx expo install <package>` instead of `pnpm add` for any
  `expo-*`/`@expo/*` package**, so the resolved version aligns with the
  SDK the project actually targets rather than whatever's newest on the
  registry. `pnpm add -D expo-dev-client` pulling `^57.0.11` against SDK 54
  is the concrete example that already cost a cycle.
- **Any local config plugin under `apps/mobile/plugins/` must resolve its
  imports through packages actually declared as dependencies** — either a
  real, declared `devDependency`, or (preferably, when available) a subpath
  re-export of a package that's already a real dependency, the way
  `expo/config-plugins` is. Working locally proves nothing about EAS: pnpm's
  shared store makes a local machine's resolution strictly more permissive
  than a fresh install, and this project has now hit that gap three times
  (`@babel/plugin-transform-react-jsx`, `expo-dev-client`,
  `@expo/config-plugins`) without it once showing up as a local failure
  first.

**Also worth recording — a failure mode that looks like success:** running
`pnpm add` while `node_modules` already exists can silently do a
lockfile-only update ("resolved N, reused 0, downloaded 0, added 0",
with a warning about `node_modules` being present) without actually placing
anything on disk. `package.json` and `pnpm-lock.yaml` both look correctly
updated; only a subsequent full `pnpm install` (or checking whether the
package is actually reachable in `node_modules`) reveals nothing was
installed. Worth checking for this specifically after any `pnpm add` that
doesn't clearly report packages downloaded.

**Build #8 outcome not yet known as of this update** — founder is pushing
`604d032` and `15ed39c` (plus the earlier `53ddb2a`/`7415d72`/`bec6fef`/
`cc6e8a6`/`c1d83dd` from this same session) and rebuilding. The two prepared
black-screen diagnostic paths from the previous update still stand
unchanged — nothing about this build/dependency fix touches the
`isLoaded`-resolution question.
