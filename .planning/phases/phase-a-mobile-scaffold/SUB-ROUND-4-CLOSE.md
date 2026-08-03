# Phase A Sub-Round 4 — Mobile Birth-Data Wizard Close Summary

**Opened:** 2026-05-04 (after sub-round 3 close `8214e90`).
**Closed:** 2026-05-07 (this docs commit, after 4.7 verification on `7112f4d`).
**Outcome:** Mobile birth-data wizard ships end-to-end on iOS — 4-step flow (date / time / location / confirm) wired to `POST /api/birth-data`, schema-validated via lifted `birthDataSchema`, with empty-state CTA on Днес and existing-chart redirect on wizard mount closing the round-trip. Custom-built iOS time picker replaces `@react-native-community/datetimepicker` mode='time' after 8 hypothesis-driven fix attempts on the library failed.

---

## Commit trail — 33 commits across 8 sub-sub-rounds

| Sub-round | Commit | What |
|---|---|---|
| 4.0 | `43e05c4` | `docs(planning): log 3 pre-existing web bugs to REVISIT-TRIGGERS (sub-round 4.0 walkthrough)` |
| 4.1 | `135255d` | `chore(core): lift birthDataSchema to packages/core/charts/schemas` |
| 4.2 | `7ad261b` | `feat(mobile): wizard scaffolding + datetimepicker install` |
| 4.3-a | `39ea4bb` | `chore(mobile): wizard infrastructure — RHF + FormProvider + StepIndicator across all 4 screens` |
| 4.3-b | `aa604ce` | `feat(mobile): date step real fields with RHF Controller and native picker` |
| 4.3-log | `9f5ee7b` | `docs(planning): log 2 sub-round 4.3 verification findings to REVISIT-TRIGGERS` |
| 4.4 | `0f55834` | `feat(mobile): time step real fields with toggle + range grid` |
| 4.4-fix-1 | `f505d69` | `fix(mobile): time picker scroll + toggle diamond centering` |
| 4.4-fix-2 | `07e17a4` | `fix(mobile): time picker controlled-value pattern + diamond centering` |
| 4.4-fix-3 | `aa9f476` | `fix(mobile): upgrade @react-native-community/datetimepicker (8.4.4 → 9.1.0)` |
| 4.4-debug-1 | `ea85305` | `debug(mobile): add diagnostic logging to time.tsx for picker investigation` |
| 4.4-fix-4 | `c21c2c4` | `fix(mobile): uncontrolled iOS time picker with commit-on-dismiss` |
| 4.4-debug-2 | `59a7d66` | `debug(mobile): re-instrument time.tsx after fix-4 failure` |
| 4.4-fix-5 | `fe75791` | `fix(mobile): epoch-anchored Date for iOS time picker round-trip stability` |
| 4.4-debug-3 | `25e1aa7` | `debug(mobile): re-instrument time.tsx after fix-5 unverified failure` |
| 4.4-fix-6 | `52b827b` | `fix(mobile): rollback @react-native-community/datetimepicker to 8.4.4` |
| 4.4-fix-7 | `206ca89` | `fix(mobile): revert epoch-anchor, use today-anchored Date for full picker range` |
| 4.4-fix-8 | `37a68f4` | `chore(mobile): revert all debug instrumentation from time.tsx` |
| 4.4-fix-9 | `89d2d00` | `feat(mobile): custom FlatList-based iOS time picker` |
| 4.4-fix-9-fix | `031a055` | `fix(mobile): unblock TimePicker FlatList scroll gestures` |
| 4.4-fix-10 + 5 tweaks | `c5694b7` … `447cb19` | diamond ON-state horizontal/vertical calibration (28 → 26 → 24 → 21 → 20 → 21+translateY-3) |
| 4.5 | `29b2fe1` | `feat(mobile): location step real fields with CitySearch + manual coords` |
| 4.5-fix-1 | `de4151d` | `fix(mobile): allow decimal input in coordinate fields` |
| 4.5-fix-2 | `9618d76` | `fix(mobile): sanitize coordinate input to digits/dot/minus only` |
| 4.5-fix-3 | `567cd10` | `fix(mobile): controlled coordinate input with local string state` |
| 4.6 | `dd9ec5c` | `feat(mobile): confirm step with editorial summary + POST /api/birth-data submit` |
| 4.7 | `7112f4d` | `feat(mobile): empty-state CTA on Днес + existing-chart redirect on wizard mount` |
| 4.8 | (this docs commit) | sub-round close summary + REVISIT-TRIGGERS items 18-19 |

---

## What shipped — feature surface

### 4.0 — Investigation gate
Founder web-walkthrough captured ground-truth Bulgarian copy + visual references for all 4 wizard steps. Three pre-existing web bugs logged to REVISIT-TRIGGERS as items 12-14 (account-deletion copy mismatch, birth-date error format, landing splash heading overflow).

### 4.1 — Schema lift to `@stellaeum/core`
`birthDataSchema` moved from `apps/web/lib/validators/birth-data.ts` to `packages/core/src/charts/schemas.ts`. Web and mobile now consume the same Zod schema with identical Bulgarian error messages and the same `superRefine` for time-known/approximate-range conditional logic.

### 4.2 — Wizard scaffolding + datetimepicker install
4 placeholder screens stood up under `apps/mobile/app/(authed)/wizard/{date,time,location,confirm}.tsx`. `@react-native-community/datetimepicker` 8.4.4 installed via `expo install` + Expo SDK 54 plugin entry in `app.json`.

### 4.3 — Wizard infrastructure + date step
- 4.3-a: RHF + FormProvider lifted into `wizard/_layout.tsx`. StepIndicator component built and wired into all 4 screens. Step labels mirror web's `STEP_LABELS`.
- 4.3-b: Date step real fields — name TextInput, native iOS/Android date picker via Modal+Pressable backdrop pattern, Bulgarian month-name display via `Intl.DateTimeFormat('bg-BG')`.

### 4.4 — Time step (the picker saga)
Initial implementation shipped in `0f55834` mirroring 4.3-b's pattern. Founder verification surfaced two bugs: (1) iOS time picker stuck at 02:00, scroll snapping back; (2) toggle diamond off-center vertically.

The diamond bug closed in fix-2's `top: '50%' + translateY: -4` correction. The time picker bug took **8 fix attempts + 3 debug rounds** to resolve. See *Picker saga retrospective* below.

Final outcome: custom `apps/mobile/components/wizard/TimePicker.tsx` (~190 lines) replaces `@react-native-community/datetimepicker` mode='time' on iOS. Two-column FlatList wheel picker (hours 00-23, minutes 00-59), HH:MM strings throughout (no Date objects, no timezone surface), `Haptics.selectionAsync()` per snap tick, center selection band overlay, commit-on-any-dismiss semantic. Android keeps the existing imperative `DateTimePickerAndroid.open()` per D-4.4-fix9-1 ratification.

### 4.5 — Location step
- New `apps/mobile/components/wizard/CitySearch.tsx`: debounced (300ms) authenticated fetch via `useApiClient` to `/api/cities/search`. Selected-city pill with diamond marker + glow + «Смени». Absolute-positioned FlatList dropdown (max-h 280, nestedScrollEnabled). Type badges per row (град/градче/село).
- `location.tsx` integration: manual-coords toggle (Pressable rail+diamond mirroring time.tsx values), conditional autocomplete-vs-manual render, Controller-wrapped lat/lng with `keyboardType="numbers-and-punctuation"`.
- Three follow-up fixes converged on a `CoordinateField` sub-component with controlled local-string state to balance decimal-point preservation while typing against character filtering.

### 4.6 — Confirm step + submit
Editorial summary list mirrors web's `ConfirmStep`. Bulgarian date formatting via `Intl.DateTimeFormat`, time display via `TIME_RANGE_LABELS` map, coords with `.toFixed(4)`. `handleSubmit(onSubmit)` defensive validation gate, `POST /api/birth-data` via Clerk-authed `apiFetch`. Success → `router.replace('/')` (typed routes rejected `/(tabs)`; root path expo-router-redirects to authed tabs). Error blocks render top-level message from `ApiError.body.error` plus generic network-failure fallback.

### 4.7 — Empty-state on Днес + existing-chart redirect on wizard mount
- Днес: `useFocusEffect`-based GET /api/birth-data on mount and every focus return. Hero area branches: `chartExists === null` (blank space, brief loading flash), `true` (existing placeholder hero reading), `false` (empty-state CTA mirroring web verbatim — «Картата ти още не е настроена...» + «Въведи рождени данни ›» button). Streak footer hidden on empty state. Bento grid renders unconditionally.
- Wizard `_layout.tsx`: mount-time GET /api/birth-data, redirect to `/` if non-empty. Soft prevention — failures swallowed.

---

## Picker saga retrospective

The `@react-native-community/datetimepicker` mode='time' on iOS exhibited a class of bugs (epoch-anchoring, version-mismatch native-bridge breakage, range constraints) that resisted hypothesis-driven debugging. Eight library-targeted fix attempts ran:

| # | Hypothesis | Outcome |
|---|---|---|
| fix-1 | Snapshot iosPickerValue state to stop snap-back | Worse — picker reverted to initial on every onChange |
| fix-2 | Inline expression matching date.tsx's controlled flow | Same as fix-1 (date.tsx's stability was a property of date-mode, not the architecture) |
| fix-3 | Library upgrade 8.4.4 → 9.1.0 (GitHub issue #1007 hypothesis) | Made it worse — 9.1.0 JS shipping into Expo Go's prebuilt 8.4.4 native runtime broke scroll gestures entirely |
| fix-4 | Uncontrolled-while-open + commit-on-dismiss | Still broken on 9.1.0; the diagnosis logs were reverted before evidence reached us |
| fix-5 | Epoch-anchored Date for round-trip stability | Math correct, library still broken at 9.1.0 |
| fix-6 | Library rollback to 8.4.4 (Expo SDK 54 expected) | Restored scroll responsiveness but introduced a 2-hour wheel range constraint via fix-5's epoch anchor |
| fix-7 | Revert epoch anchor (today-anchored value) | Wheel range full but spinner still snap-fought user gesture |
| Path B research | react-native-date-picker library swap | Blocked — Expo Go incompatibility (requires Dev Client; founder not enrolled in Apple Developer Program), plus open RN 0.81 + Fabric crash issues at 5.0.13 |
| **fix-9** | **Custom-built FlatList wheel picker (~190 lines)** | **Resolved.** |

**Lessons captured for future sub-rounds:**

1. **Diagnostic instrumentation after 2 failed fix attempts, not 4-5.** Fixes 1-3 ran on hypothesis without device-log evidence. Debug-1 surfaced the epoch-anchoring behavior that should have been the first thing examined. The cost of one debug commit + one founder reload is far below the cost of three more wrong fixes.

2. **Library debugging has a hard ceiling.** Maximum 2-3 fix attempts on a third-party library bug before "build it ourselves" becomes a first-class option. The ~190-line custom TimePicker took less time than fixes 5-7 combined.

3. **Expo version-mismatch warnings are first-suspect signals, not cosmetic noise.** The Metro warning «expected version: 8.4.4» surfaced during fix-3 verification but was missed. JS-package-vs-native-runtime mismatch in Expo Go is a known class of bug; the warning literally points at it.

4. **Founder ground-truth via screenshots/walkthrough beats source-code interpretation alone.** The "diamond too far left" calibration loop (fix-10 through 5 tweaks) converged because founder eyeballed each iteration on device. Math derived from CSS source (web's `calc(100%-14px)`) was indicative but not definitive against RN's positioning subtleties.

5. **Custom build time is well-bounded.** TimePicker scope was ~180 lines visible upfront; actual implementation matched. Pre-launch decisions to defer custom builds in favor of "let's debug the library" are sometimes false economies.

6. **Conflict-surfacing protocol caught one bug pre-commit.** Fix-5's initial UTC arithmetic proposal would have stored `"00:00"` when user picked `"02:00"` Bulgarian local. Surfacing the cross-platform-storage discrepancy with founder before commit avoided a data-integrity bug. The protocol works.

7. **Founder pushback on advisor scope creep matters.** When advisor reached for Option E (defer exact-time feature, ship approximate-range only) over Option D (~190 lines custom build), founder correctly flagged this as scope-creep avoidance: *"why didnt we do this: Option D... Why are you making things so much more complex than they need to be?"* Custom build shipped in ~190 lines and resolved the bug. Lesson: founder's "is this the simplest thing?" instinct is a discipline check on advisor's tendency to under-evaluate "build it ourselves" options after extended library debugging cycles. The path of least *additional* complexity isn't always the path of least *total* complexity once you account for the debugging cycles already spent.

---

## REVISIT-TRIGGERS items added in sub-round 4

Items **12-14** were logged in the 4.0 founder walkthrough commit (pre-existing web bugs orthogonal to mobile work).

Item **15** (Clerk applicationName showing «celestia» in modals) was logged during 4.3 verification.

Item **16** (mobile sign-up form missing firstName + lastName) was logged during 4.3 fresh-account testing.

Item **17** (web TIME_RANGES hour string format asymmetry — `'18:00–23:59'` vs `'06 - 12'`) was logged during 4.4 mobile time-step calibration.

Items **18** and **19** (new in this commit):
- **18: iOS exact-time picker — custom built; revisit if Apple Developer enrollment unblocks Path B.** Records the saga's outcome and gates future evaluation of `react-native-date-picker` (currently blocked by Expo Go incompatibility) on Apple Developer enrollment unlocking Dev Client builds.
- **19: VirtualizedList nested in ScrollView warning in CitySearch.** Performance warning only, not correctness bug. Cities list is small enough that virtualization defeat is negligible. Trigger: dedicated wizard polish sub-round OR user-feedback flag of city-autocomplete lag.

---

## Verification gates passed

| Gate | Result |
|---|---|
| Schema lift: `pnpm typecheck` green at every commit | ✓ |
| Wizard scaffolding: 4 screens reachable, navigation works | ✓ |
| Date step: name + date input + Bulgarian month-name display | ✓ |
| Time step (initial): toggle + exact/approximate render | ✓ broken-picker noted |
| Time step (final): full 0-23 / 0-59 wheel scroll, snap, dismiss, store, re-open | ✓ via custom TimePicker |
| Toggle diamond: vertical centering, ON-state horizontal calibration to «matches web image 5» | ✓ via fix-10 + 5 tweaks |
| Location step: autocomplete + manual coords + decimal entry | ✓ |
| Confirm step: review fields render correctly, Bulgarian date format, time display, coords | ✓ |
| Submit happy path: ActivityIndicator → routes to Днес → Supabase chart row created | ✓ |
| Empty-state CTA: visible with correct Bulgarian copy, button → wizard | ✓ |
| Existing-chart redirect: deep-link to `/wizard/date` redirects to Днес within ~500ms | ✓ |
| Bulgarian copy: mirrors web verbatim per shared-surface discipline | ✓ |
| Cross-platform storage parity (Android lat/lng + birthTime via local arithmetic) | ✓ verified during fix-5 conflict-surfacing protocol — UTC arithmetic would have stored "00:00" instead of "02:00" Bulgarian local; caught pre-commit |

---

## Sub-round 4 → sub-round 5 handoff

**Wizard ships shippable end-to-end.** New users complete the 4-step flow, chart row created in Supabase, lands on Днес. Existing users get bounced out of the wizard if they navigate to it.

**Sub-round 5 expected scope:**
- Real chart calculation + display (replaces English placeholder hero text under «Небесен ритъм» on Днес for chart-exists state)
- TanStack Query install (deferred from sub-round 2; second coordinated mobile fetch makes the install worth its bundle weight)
- Daily horoscope content rendering for chart-bearing users

**Carry-forward items not addressed in 4.7:**
- Hero placeholder English text under «Небесен ритъм» (chart-exists state) — sub-round 5 replaces with real horoscope content
- VirtualizedList warning (REVISIT-TRIGGERS item 19) — stays as logged item

---

## Branch state at close

`mobile-parallel-test` at `7112f4d` (4.7 commit) — **32 unpushed commits** ahead of last push (sub-round 3 close `2b00c1c`). After this docs commit lands, branch will be at 33 unpushed commits.

Push held for explicit founder command per established sub-round 1+2+3 pattern.
