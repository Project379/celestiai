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
