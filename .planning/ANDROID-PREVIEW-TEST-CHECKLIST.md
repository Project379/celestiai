# Android Preview Build — First On-Device Test Checklist

Written 2026-08-04, for the first `--profile preview` APK, on an emulator.
This is the first time most of these screens run as a compiled binary
outside Expo Go — several native modules (RevenueCat, Sentry's native half,
`expo-apple-authentication`, `@clerk/expo-passkeys`) literally cannot load
inside Expo Go at all, so this is genuinely new ground, not a repeat of
earlier testing in a new shell.

Emulator caveat before you start: push notification registration needs a
system image with Google Play Services (a "Google APIs" or "Google Play"
image, not bare AOSP) — if the emulator was created without one, push
registration failing is an emulator-config gap, not an app bug. Check the
AVD's system image before treating a push failure as real.

**Actual AVD used (2026-08-05):** Pixel 8, 1080x2400 @ 420dpi, Google Play
system image, API 37.1 (Android 17) — the newest available API, not matched
to the app's target SDK. If something breaks, check whether it's
OS-version-related before treating it as an app bug — this is an untested
variable, not a controlled match to a known-good API level. Image reports
ABI x86_64 with Translated ABI arm64-v8a (native-ish ARM translation), so
the universal-vs-ARM-only APK question from build planning is moot here —
no `unzip -l` check needed before install.

**Screen width caveat — read before step 4 or 6:** all prior device
verification of this design was done on an iPhone 12 Pro Max, 428pt logical
width. The 390px figure that appeared in earlier planning came from mockups
and browser renders, not a verified device. This emulator is ~360 logical
px wide — narrower than anything this design has been checked against, by a
meaningful margin (428 → 360). Layout problems observed at 360 are real
findings at an untested width, not emulator artifacts — do not wave them
off as emulator quirks. Specifically inspect, against the longest real
Bulgarian strings (not placeholder/short text):
  - the Big Three label/value columns
  - the phase name and illumination line under the moon
  - the Питай Оракула invitation and its glow
  - the Детайли pedestal
All four were sized against the 428pt reference and have never run at 360.

## Order and what "working" looks like

1. **Launch.** App icon, splash screen, and app name should be Stellaeum's
   own — not Expo Go's chrome. This alone confirms the binary compiled and
   the bundle loaded.
2. **Sign-up.** Email + password + name fields, 6-digit email verification
   code typed in-app (`verify.tsx` — not a clicked link, so nothing to do
   with mail app). Working: account created, lands on birth-data wizard.
3. **Birth-data wizard.** Date, time, location (live city autocomplete —
   this is the first real network-dependent screen; confirms `EXPO_PUBLIC_API_BASE`
   is reachable), confirm. Working: chart gets created, redirected to Днес/home.
4. **Natal chart (Карта tab).** Working: real computed chart renders — planet
   positions, houses, aspects — not a placeholder. This is the first time
   the chart wheel has rendered from a real compiled binary rather than
   being read in source.
5. **Daily horoscope (Днес tab).** Working: real LLM-generated Bulgarian
   text appears, not a loading spinner that never resolves. Known live risk,
   not a bug to chase: the LLM's Bulgarian output quality has zero
   corrective mechanism by design (see CHECKPOINT-2026-08-04.md §1) — if the
   text contains a garbled word or drifts into Russian, that's the known,
   already-tracked model-quality issue, not something wrong with this build.
6. **Oracle.** Global panel, not a dedicated screen — opened via the Oracle
   entry point. Working: real streamed LLM response to a question about the
   chart.
7. **Journal / Ритъм tab.** Working: can write and save an entry, see it in
   history.
8. **Crystals (Ти → crystals).** Working: today's crystal displays, can
   collect it, streak counter updates.
9. **Push notification permission prompt.** Working: real OS-level
   permission dialog (not Expo Go's), and — if the emulator has Google Play
   Services — a token registers without error. See emulator caveat above if
   this fails.
10. **Settings — profile edit.** Change name/email, confirm it persists.
11. **Settings — GDPR export/delete.** Trigger export, confirm a real file
    downloads with real data in it (not empty). Do not actually complete
    account deletion unless you mean to lose the test account — the
    30-day-grace-period request/cancel toggle is safe to test, completing
    the cron-driven hard delete is not something to trigger by accident.
12. **Sign out / sign back in.** Session should clear and restore correctly.

## Expected failures — not bugs, don't file them as such

- **RevenueCat: `ERR-MOB-RC-003` logged, nothing else happens.** The API key
  is still the literal placeholder (`REPLACE_WITH_...`) — the native SDK
  correctly rejects it and the code catches that loudly, by design. Stays
  expected until the RevenueCat Test Store dashboard work is done and a real
  key is set via `eas env:create`.
- **Кръг tab: three static cards, nothing happens when tapped.** No
  `onPress` handlers exist yet — this is the known 70-line stub, not a
  regression. Confirmed in CHECKPOINT-2026-08-04.md §2.
- **Ти → Премиум: "Премиум идва скоро."** Literal, deliberate stub — no
  purchase flow exists yet, waiting on RevenueCat dashboard config and the
  mobile subscription UI port.
- **Sentry: no crash events show up even if something crashes.** REVISIT-64
  (filed today) — the DSN env var was misnamed and the RN Sentry project may
  not exist yet. Fixed for *future* builds once that REVISIT closes; this
  first build may predate the fix depending on build timing.

## If something breaks and it's not on the expected-failure list

See "log capture" below before assuming it's a real bug worth filing —
confirm what actually happened first.

## Log capture — realistic answer, not a workaround

No dev menu on a preview build, and Sentry isn't reporting yet (REVISIT-64).
The real answer, since tomorrow's target is an emulator: **`adb`**, which
already comes with the Android SDK/emulator tooling — no extra install.

```bash
# JS console output + native crash traces only, filtering out Android's
# usual noise:
adb logcat *:S ReactNativeJS:V AndroidRuntime:E

# Or capture everything to a file and grep after the fact:
adb logcat > logcat.txt
```

`ReactNativeJS` is the tag React Native routes `console.log`/`console.error`
through — this is genuinely equivalent to what you'd see in a dev-menu
console, just via `adb` instead. `AndroidRuntime` at error priority catches
uncaught native crashes. Start `adb logcat` *before* reproducing the issue,
not after — Android's log buffer is limited and rotates.

Second-line fallback, useful for narrowing down *whether* a bug is
JS-logic-only or involves a native module: reproduce the same flow in Expo
Go. If it also breaks there, it's JS logic — genuinely faster to iterate on
in Expo Go than rebuilding. If it *only* breaks in the real build, the
native module boundary (RevenueCat, Sentry, passkeys, anything Expo Go
can't load at all) is implicated, and `adb logcat` is the only tool that'll
show you what actually happened.
