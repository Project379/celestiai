# Android EAS Build Failures — 2026-08-05, four attempts

Trimmed from a 946KB/6,475-line raw Gradle log export (`eas build:view --logs`
piped to one file) reviewed in full on 2026-08-06. Kept: each build's
identifying info, the task sequence immediately before failure, and the
complete FAILURE block. Cut: the ~1,500-2,000 lines per build of routine
`> Task :xxx` autolinking/compile noise between builds, none of which
carried diagnostic value once the failure point was found. Cross-referenced
against `eas build:list --json` (run from `apps/mobile/`, not repo root) to
attach real build IDs, commits, and timestamps — the raw log had none of
that context on its own.

Two builds (3 and 4) failed identically at `:app:mergeReleaseJavaResource`
on the same two JARs — that repetition is what ruled out re-hypothesizing a
third fix and sent this to a real dependency-tree investigation instead.

No Kotlin `e:` compiler error appears anywhere across all four builds — a
`SplashScreen_Stellaeum` Kotlin error referenced earlier in planning does not
come from any of these four logged attempts.

---

## Build 4 (newest) — `8f95a67b-7549-4bd3-ab82-d9e93a1f72b3`

- Commit: `7212f80` — "wire real splash + notification-icon assets"
- Created: 2026-08-05T16:54:52Z · Duration: 21m 59s · Status: ERRORED / `EAS_BUILD_UNKNOWN_GRADLE_ERROR`

```
> Task :app:mergeReleaseJavaResource
FAILED
> Task :app:mergeDexRelease
752 actionable tasks: 752 executed
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':app:mergeReleaseJavaResource'.
> A failure occurred while executing com.android.build.gradle.internal.tasks.MergeJavaResWorkAction
   > 2 files found with path 'META-INF/versions/9/OSGI-INF/MANIFEST.MF' from inputs:
      - com.squareup.okhttp3:logging-interceptor:5.3.2/logging-interceptor-5.3.2.jar
      - org.jspecify:jspecify:1.0.0/jspecify-1.0.0.jar
     Adding a packaging block may help, please refer to
     https://developer.android.com/reference/tools/gradle-api/com/android/build/api/dsl/Packaging
     for more information
BUILD FAILED in 21m 59s
```

## Build 3 — `ddc5807f-dce3-439b-93ce-6c473f8b9ded`

- Commit: `d3c6d14` — "remove expo-splash-screen plugin — no image asset exists"
- Created: 2026-08-05T13:38:56Z · Duration: 21m 43s · Status: ERRORED / `EAS_BUILD_UNKNOWN_GRADLE_ERROR`
- Splash plugin removed here — this build got past resource linking and
  proves the JAR collision below sits underneath the splash bug, not caused
  by it.

```
> Task :app:mergeReleaseJavaResource FAILED
751 actionable tasks: 751 executed
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':app:mergeReleaseJavaResource'.
> A failure occurred while executing com.android.build.gradle.internal.tasks.MergeJavaResWorkAction
   > 2 files found with path 'META-INF/versions/9/OSGI-INF/MANIFEST.MF' from inputs:
      - com.squareup.okhttp3:logging-interceptor:5.3.2/logging-interceptor-5.3.2.jar
      - org.jspecify:jspecify:1.0.0/jspecify-1.0.0.jar
BUILD FAILED in 21m 43s
```
IDENTICAL to Build 4's failure — same two JARs, same path. Confirms this is
not flaky; it's deterministic and needs a real dependency-tree fix.

## Build 2 — `ed2d87c5-1767-4cf8-a665-327442850a40`

- Commit: `5354cedc` — "reconcile duplicate concurrent-session fixes for React dedup"
- Created: 2026-08-05T12:05:46Z · Duration: 10m 49s · Status: ERRORED / `EAS_BUILD_UNKNOWN_GRADLE_ERROR`

```
> Task :app:processReleaseResources FAILED
600 actionable tasks: 600 executed
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':app:processReleaseResources'.
> A failure occurred while executing com.android.build.gradle.internal.res.LinkApplicationAndroidResourcesTask$TaskAction
   > Android resource linking failed
     com.stellaeum.app-mergeReleaseResources-88:/values/values.xml:6916: error: resource drawable/splashscreen_logo (aka com.stellaeum.app:drawable/splashscreen_logo) not found.
     error: failed linking references.
BUILD FAILED in 10m 49s
```
Fixed by the two subsequent commits (d3c6d14, then 7212f80 wiring real assets).

## Build 1 (oldest) — `28be2e90-da62-462a-8e42-9eb0693ae0ca`

- Commit: `7c677076` — "rate-limit circle report/weather and diary/entries routes"
- Created: 2026-08-05T08:03:37Z · Duration: 8m 28s · Status: ERRORED / `EAS_BUILD_UNKNOWN_GRADLE_ERROR`

```
> Task :app:createBundleReleaseJsAndAssets_SentryUpload_com.stellaeum.app@0.1.0+1_1 FAILED
557 actionable tasks: 557 executed
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':app:createBundleReleaseJsAndAssets_SentryUpload_com.stellaeum.app@0.1.0+1_1'.
> A problem occurred starting process 'command '/home/expo/workingdir/build/apps/mobile/node_modules/@sentry/cli/bin/sentry-cli''
BUILD FAILED in 8m 28s
```
Root cause: `@sentry/cli`'s postinstall binary download never ran under pnpm.
Fixed via `SENTRY_DISABLE_AUTO_UPLOAD=true` EAS env var on preview/development.

---

## Open item carried forward

The `okhttp3:logging-interceptor:5.3.2` vs `org.jspecify:jspecify:1.0.0`
collision (Builds 3 and 4) is unresolved. Traced so far from `pnpm-lock.yaml`:
this app ships Solana/Base/Coinbase wallet-connector native modules via
`apps/mobile` → `@clerk/expo@3.2.4` → `@clerk/clerk-js@^6.7.7` (hard
dependency) → `@solana/wallet-adapter-react` (hard dependency) →
`@solana-mobile/wallet-adapter-mobile` → `@solana-mobile/mobile-wallet-adapter-protocol`
(the native Android module actually compiled in every build). Whether this
chain is what pulls in the two colliding JARs is **not yet confirmed** — that
requires an actual `./gradlew :app:dependencies --configuration
releaseRuntimeClasspath` report, not inference from lockfile structure.
