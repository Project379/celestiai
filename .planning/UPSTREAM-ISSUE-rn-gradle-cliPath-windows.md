# Upstream issue draft — ready to file against facebook/react-native

Not filed yet. Paste into a new issue at
https://github.com/facebook/react-native/issues (component: `@react-native/gradle-plugin`)
when ready. Written 2026-08-11 during Stellaeum's first native Android build.

---

## Title

`Os.kt#cliPath()` returns a relative path on Windows and an absolute path on
Linux/macOS, breaking `--entry-file` resolution in pnpm monorepos

## Environment

- `@react-native/gradle-plugin`: 0.81.5 (also present, unverified, in 0.83.1 —
  same `cliPath` implementation as of that version's `shared/src/main/kotlin/
  com/facebook/react/utils/Os.kt`)
- OS: Windows 11
- Package manager: pnpm 9.x, in a pnpm workspace monorepo (`apps/mobile` as a
  sub-package, not the repo root)
- Expo SDK 54 (`expo`), `@expo/cli` 54.0.26, `@expo/metro-config` 54.0.17
- Repro is package-manager-shape-dependent: needs a monorepo where the entry
  file resolves to a path *outside* the react-native app's own directory tree
  (pnpm's `.pnpm/<name>@<version>_<hash>/node_modules/<name>/...` virtual
  store guarantees this for any hoisted-looking dependency; Yarn/npm
  workspaces with hoisting to the repo root would hit the same shape)

## What happens

`:app:createBundleReleaseJsAndAssets` (and any other task that shells out via
`BundleHermesCTask.getBundleCommand`) fails on Windows only, with:

```
Error: Unable to resolve module ./../../node_modules/.pnpm/expo-router@6.0.24_<hash>/node_modules/expo-router/entry.js from <repo-root>/.:

None of these files exist:
  * ..\..\..\..\node_modules\.pnpm\expo-router@6.0.24_<hash>\node_modules\expo-router\entry.js(.android.ts|...)
```

The same project, same commit, same `pnpm-lock.yaml`, builds successfully on
Linux/macOS (confirmed: EAS Build's Linux workers bundle this exact entry
file without issue).

## Root cause

`shared/src/main/kotlin/com/facebook/react/utils/Os.kt`:

```kotlin
/**
 * As Gradle doesn't support well path with spaces on Windows, we need to return relative path on
 * Win. On Linux & Mac we'll default to return absolute path.
 */
fun File.cliPath(base: File): String =
    if (isWindows()) {
      this.relativeTo(base).path
    } else {
      absolutePath
    }
```

`BundleHermesCTask.getBundleCommand()` calls `entryFile.get().asFile.cliPath(rootFile)`
where `rootFile` is the react extension's `root` (defaults to the app
directory, e.g. `apps/mobile` in a monorepo — *not* the workspace root). On
Windows this computes `entryFile.relativeTo(root)`.

When the resolved entry file lives outside the app directory — which it does
for any package resolved into a pnpm virtual store, since `expo-router`'s
real `entry.js` sits at
`<repo-root>/node_modules/.pnpm/expo-router@<ver>_<hash>/node_modules/expo-router/entry.js`,
not under `apps/mobile` — the relative path walks up out of the app directory
(`..\..\node_modules\.pnpm\...`) and is passed to `expo export:embed` as
`--entry-file`.

Expo's `MetroBundlerDevServer.resolveRelativePathAsync` /
`Server._resolveRelativePath` then re-resolves that already-relative string
against Metro's own monorepo-detected `projectRoot` (the pnpm workspace
root, via `@expo/metro-config`'s auto-detection), which is a *different* base
than the one the relative path was computed from (`apps/mobile`). The two
`../..` hops get applied a second time, producing a request four levels up
instead of two, which no longer points at a real file.

On Linux/macOS, `cliPath()` returns `entryFile.absolutePath` — an absolute
path is unambiguous regardless of what base Metro resolves it against, so
this mismatch never has a chance to occur. The bug is specific to the
Windows branch of `cliPath()`, not to Metro's resolution or Expo's monorepo
detection — both of those are working as intended for the correct
(absolute) input.

## Why the relative-path branch exists (and why it's over-broad)

The comment says: *"As Gradle doesn't support well path with spaces on
Windows, we need to return relative path on Win."* That's a real, narrower
constraint — some Windows process-launch paths (typically via `cmd.exe`
shell interpretation) mishandle unquoted paths containing spaces. But the
implementation applies the relative-path workaround unconditionally to
*every* Windows build, including the (very common, in CI and in `C:\Users\
<no-space-name>\...` layouts) case where the absolute path contains no
space at all — where the stated justification doesn't apply and the
relative form is strictly worse.

## Suggested fix

Narrow the Windows branch to only take the relative-path form when the
absolute path actually contains a space:

```kotlin
fun File.cliPath(base: File): String =
    if (isWindows() && absolutePath.contains(" ")) {
      this.relativeTo(base).path
    } else {
      absolutePath
    }
```

This preserves the original space-safety intent for the paths that actually
need it, while fixing monorepo/pnpm entry-file resolution for the (likely
more common) case of a space-free Windows path — and brings Windows behavior
in line with Linux/macOS whenever the workaround isn't needed.

## What we did in the meantime

Applied the above as a `pnpm patch` on `@react-native/gradle-plugin@0.81.5`
(not upstream yet — this issue is that submission). Verified locally:
`./gradlew :app:createBundleReleaseJsAndAssets` succeeds standalone after the
patch, reproducibly fails without it (confirmed by running the Expo CLI's
`export:embed` directly with both the relative and absolute forms of the
same `--entry-file` argument, from the same working directory — the relative
form reproduces the exact error above byte-for-byte, the absolute form does
not).

## Repro steps (to include when filing)

1. Any pnpm workspace with an Expo Router app as a sub-package (not at the
   workspace root).
2. On Windows, run `./gradlew :app:createBundleReleaseJsAndAssets` (or any
   release/bundle task) from the app's `android/` directory.
3. Observe the `Unable to resolve module` error with the doubled `../..`
   prefix.
4. Same command from the same commit on Linux/macOS succeeds.
