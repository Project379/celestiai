# Phase A Sub-Round 8 — Mobile Launch-Readiness Infra Close Summary

**Opened:** 2026-05-09 (after SR 7.11 close `b657f24`).
**Closed:** 2026-05-09 (this docs commit, after SR 8.3 commit `ba35ae7`).
**Outcome:** Mobile picks up the launch-readiness infrastructure that web shipped in §10 (error monitoring) plus the new `MOBILE_UX_RESEARCH.md §13.5` Phase A DOD additions: Sentry on Expo, feature-flag kill switches for AI features, and the push notification permission scaffold. RevenueCat code-side scaffold deferred to the Phase B opener per founder ratification 2026-05-09 to avoid 6-8 weeks of SDK-churn risk on bundle weight that has no callers.

**Phase A TestFlight DOD §13.5 status after this round:** Sentry ✓, feature flags ✓, push permission scaffold ✓, RevenueCat documented as Phase B opening sub-round (REVISIT-25). One closure sweep remains for Phase A: the founder-track items (Bulgarian Privacy/ToS, telemetry vendor, OpenRouter cost envelope check, friend coordination on web premium features, Apple Developer enrollment timing) — none of which are Claude Code work — plus the documentation reclassification sweep covering REVISIT-1, REVISIT-23, REVISIT-27.

---

## Commit trail — 5 commits across 4 sub-sub-rounds

| Sub-round | Commit | What |
|---|---|---|
| 7.10-fix-1 | `3ad6345` | `fix(mobile): wrap custom oracle headerLeft in paddingLeft view (sub-round 7.10-fix-1)` |
| 8.1 | `12e08f1` | `feat(mobile): Sentry init + logError helper (sub-round 8.1)` |
| 8.2 | `07653ed` | `feat(mobile): useFeatureFlag kill switches for AI features (sub-round 8.2)` |
| 8.3 | `ba35ae7` | `feat(mobile): expo-notifications permission scaffold (sub-round 8.3)` |
| 8.4 | (no commit) | RevenueCat code-side scaffold deferred to Phase B opener — REVISIT-25 |
| 8.5 | (this docs commit) | sub-round 8 close summary + REVISIT-25, 26, 27 |

7.10-fix-1 is bundled into the SR 8 trail because it landed during SR 8.1's first typecheck pass — the false fix in 7.10 (`headerLeftContainerStyle` doesn't exist on `@react-navigation/native-stack@7.14.11`'s `NativeStackNavigationOptions`) was caught the moment the typecheck discipline was reinstated.

---

## What shipped — feature surface

### 8.1 — Mobile Sentry init + logError helper

**Install.** `pnpm exec expo install @sentry/react-native` pulls `@sentry/react-native@~7.2.0`. Expo CLI auto-added the `@sentry/react-native` config plugin to `app.json` plugins array. Compat-verified via Context7 docs check before install: SDK requires RN 0.65+, we're on 0.81.5, no Expo SDK 54 incompatibility, no Reanimated 4 conflict.

**Init.** `apps/mobile/lib/monitoring/sentry.ts` is side-effect imported from the top of `apps/mobile/app/_layout.tsx` (per ratified D3). DSN gated explicitly on `EXPO_PUBLIC_SENTRY_DSN` — local dev without credentials no-ops cleanly rather than warning at startup. Posture mirrors `apps/web/instrumentation-client.ts` exactly (per founder feedback memory `conservative_defaults_posture`):

- `sendDefaultPii: false`
- `tracesSampleRate: 0`
- `enableAutoPerformanceTracing: false` *(mobile equivalent of web's `enableLogs: false` — no auto-instrumented performance spans)*
- no replay

**Helper.** `apps/mobile/lib/monitoring/logError.ts` — single `logError(code, err, extra?)` (per ratified D2). Mobile has no server-vs-client split, so web's `logServerError` + `logClientError` pair collapses to one. Signature mirrors web's `logServerError`. `code` is free-form `string` today (zero call sites at commit time; the SR 8.3 push scaffold introduced the first five: `ERR-MOB-PUSH-001` through `005`); lift to a strict union per web's `ServerErrorCode` pattern when mobile accumulates a stable taxonomy.

**Native crash tracking.** Activates only on Dev Client / standalone builds via the `@sentry/react-native` config plugin — Expo Go limits us to JS-side error capture, sufficient for SR 8 scaffold and Phase A verification path. The Expo CLI surfaced one informational warning at install time: `[@sentry/react-native/expo] Missing config for organization, project. Environment variables will be used as a fallback during the build.` That's only relevant for source-map upload during EAS builds; in Expo Go and JS-only Sentry init it's a no-op.

### 8.2 — `useFeatureFlag` kill switches

**Hook.** `apps/mobile/hooks/useFeatureFlag.ts` — three flags scoped per ratified D4 (`'daily_horoscope' | 'oracle' | 'push'`). Reads `process.env.EXPO_PUBLIC_FF_<NAME>` at the call site; default true unless explicitly set to the string `'false'` (per ratified D5). Hook (not function) on purpose so the call-site refactor is zero LOC at vendor-swap time (PostHog / GrowthBook / etc. typically need Suspense or async resolution).

`useChart` and `useCrystalOfTheDay` are NOT wrapped — `useChart` hits server-side Swiss Ephemeris (no per-call AI cost) and `useCrystalOfTheDay`'s data is content-cycle-driven, not AI-generated. Both fall outside §13.5's "every AI feature (Днес hero, Oracle, notifications)" scope.

**Wires.**
- `useDailyHoroscope`: `ffEnabled` gates the query's `enabled`. Off → no fetch, data stays undefined, screens render existing loading/empty state.
- `useOracleReading`: `ffEnabled` gates the saved-readings query's `enabled` AND the generate-mutation call inside `selectTopic`. Off → saved readings don't load (no indicator dots, no instant-render on tap-to-view); `selectTopic` on a topic without a saved reading no-ops.
- The push hook landing in 8.3 reads `process.env.EXPO_PUBLIC_FF_PUSH` directly inside `maybePromptPushPermission` (it's a fire-and-forget async function, not a hook call site, so the env read is more natural inline than via `useFeatureFlag`).

**Propagation:** `EXPO_PUBLIC_` env vars are inlined at bundle time, so a flip requires a fresh JS bundle to propagate. Expected for an emergency cost-control switch (not a runtime A/B toggle) — founder flips the var via EAS env or `.env.local` and rebuilds.

### 8.3 — expo-notifications permission scaffold

**Installs.** `pnpm exec expo install expo-notifications expo-device expo-constants @react-native-async-storage/async-storage` pulls SDK 54-pinned versions:

| Package | Version |
|---|---|
| expo-notifications | ~0.32.17 |
| expo-device | ~8.0.10 |
| expo-constants | ~18.0.13 |
| @react-native-async-storage/async-storage | 2.2.0 |

`expo-notifications` was Context7-verified pre-install; `expo-device`, `expo-constants`, and AsyncStorage were trusted via `expo install`'s SDK 54 alignment (standard maintained-by-Expo peers).

**Trigger detection.** New `onFreshGeneration` callback option on `useOracleReading`. The hook's existing `generateMutation.onSuccess` fires only when `/api/oracle/generate` returns a fresh body — `selectTopic` short-circuits to the saved-reading cache-hit path before the mutation can run, so the callback receives exactly the "fresh successful generation" signal without needing a separate detection layer (no `currentReading.fresh` watching, no `useEffect` over derived state, no risk of double-firing on remount).

`oracle.tsx` wires:

```ts
useOracleReading(chartId, {
  onFreshGeneration: () => { void maybePromptPushPermission() },
})
```

**Permission flow** (Path A from ratified D6 — in-app pre-prompt Alert before iOS system dialog, maximize acceptance rate by leveraging the moment-of-positive-experience):

1. `EXPO_PUBLIC_FF_PUSH` gate (kill-switch parity with §13.5)
2. AsyncStorage `@stellaeum/notif_prompted` flag — never re-prompt within the app per D6
3. `Notifications.getPermissionsAsync` — if OS already has a decision, mark our flag and exit
4. `Alert.alert` pre-prompt with bulgarian-skill-calibrated copy
5. On accept: `Notifications.requestPermissionsAsync` (system dialog)
6. Flag set on EVERY terminal outcome (decline, deny, grant) per D6
7. On grant: `getExpoPushTokenAsync` → AsyncStorage `@stellaeum/push_token` + Sentry breadcrumb

Per ratified D7 modification: scaffold-only, NO Supabase migration, NO `push_tokens` table. Token stash lives in AsyncStorage until Phase B push delivery sub-round opens. REVISIT-26 captures the schema design + RLS + registration endpoint scope.

**Bulgarian copy** (bulgarian-skill calibrated, founder native-speaker reviewed):

| Slot | String |
|---|---|
| Title | «Известия» |
| Body | «Stellaeum ще ти изпраща тих сигнал, когато звездите имат какво да ти кажат — сутрешния хороскоп и важните лунни моменти.» |
| Accept | «Да, разказвай ми» |
| Decline | «Не сега» |

Calibration notes: «Да, разказвай ми» echoes «кажат» in the body so tapping accept reads as opting into the same "stars speaking" frame the user just experienced in the Oracle reading they finished a moment ago. «Не сега» is the strongest low-pressure refusal in Bulgarian UI register — preserves the door-open feel so users can re-engage via iOS Settings later.

**iOS reality clarification.** The original D6 spec mentioned "iOS Info.plist permission rationale string in app.json." iOS push notifications don't actually have a customizable rationale Info.plist key the way camera / location do — `UNUserNotificationCenter` uses a fixed system-template string Apple controls. The rationale text therefore lives in the in-app `Alert.alert` pre-prompt (Path A), not in `ios.infoPlist`. Documented in commit body and noted here for future planning sweeps so the assumption doesn't repeat.

**Expo Go limitation.** `getExpoPushTokenAsync` rejects on Expo Go SDK 49+ — the call requires a Dev Client / standalone build. The scaffold catches the rejection via `logError('ERR-MOB-PUSH-005', err)` and keeps the `@stellaeum/notif_prompted` flag set, which means re-verifying the token retrieval path after Dev Client lands needs a manual `AsyncStorage.removeItem('@stellaeum/notif_prompted')` reset on the device. REVISIT-27 captures the post-Dev-Client verification scope.

### 8.4 — RevenueCat scaffold deferred (no commit)

Per founder ratification 2026-05-09, the original 8.4 scope (`react-native-purchases` SDK install + `<RevenueCatProvider>` + `Purchases.configure()`) moves to the Phase B opener. Reason: 6–8 weeks of SDK-churn risk on bundle weight that has no callers; provider does nothing until Phase B paywall work begins. The actual lead-time work (RevenueCat dashboard config + Apple App Store product config) is founder-track and proceeds in parallel. REVISIT-25 logs the deferral with re-add path + decision points carried forward (D9 dedicated provider component, D10 platform-split env keys).

---

## Decisions — D1–D10 + ratified modifications

D1–D10 were surfaced in the SR 8 investigation pass message (this thread) and ratified by founder with three modifications:

| # | Decision | Resolution | Modification |
|---|---|---|---|
| **D1** | Sentry SDK choice | `@sentry/react-native` (current best practice) | none — Context7 compat verification ran pre-install, green |
| **D2** | Helper shape | single `logError(code, err, extra?)` | none |
| **D3** | Where Sentry.init lives | side-effect import from `apps/mobile/lib/monitoring/sentry.ts` | none |
| **D4** | Feature flag scope | three flags only: `daily_horoscope`, `oracle`, `push` | none |
| **D5** | Feature flag implementation | env-var-driven (`EXPO_PUBLIC_FF_*`), default true | none |
| **D6** | Push permission trigger | first chart-success vs first Oracle-tap vs both | **modified** — trigger after first SUCCESSFUL Oracle reading completes (not Oracle-tap, not cache-hit re-renders); detection via `onFreshGeneration` callback option on `useOracleReading`; AsyncStorage flag idempotency |
| **D7** | Push token storage | new `push_tokens` table with RLS | **modified** — scaffold-only, AsyncStorage stash, no migration; backend integration deferred to Phase B (REVISIT-26) |
| **D8** | Bulgarian permission rationale | bulgarian-skill calibration + founder review | none — calibration produced one button-label refinement (`«Добре»` → `«Да, разказвай ми»`); founder native-speaker ratified |
| **D9** | RevenueCat provider shape | dedicated `<RevenueCatProvider>` component | **deferred** — moved to Phase B opener (REVISIT-25) |
| **D10** | RevenueCat env key strategy | platform-split `EXPO_PUBLIC_REVENUECAT_{IOS,ANDROID}_API_KEY` | **deferred** — moved to Phase B opener (REVISIT-25) |

Process note: the SR 8 investigation surfaced D6's iOS-Info.plist assumption mid-execution (after compat verification, before Bulgarian calibration). Halt-and-surface protocol caught it before the rationale text was committed in the wrong place.

---

## Process gap — typecheck-between-commits discipline

SR 7.7, 7.8, and 7.10 all shipped without `pnpm typecheck` between commits, violating speed-mode's "TypeScript green between commits, mechanical check, no founder gate" rule. 7.7 and 7.8 turned out clean; only 7.10 had a real type error (`headerLeftContainerStyle` doesn't exist on `@react-navigation/native-stack@7.14.11`'s `NativeStackNavigationOptions`). The bug surfaced when SR 8.1's Sentry install ran the first typecheck since 7.10 landed.

7.10-fix-1 (`3ad6345`) corrected the issue by switching to Option B from the original 7.10 spec — `paddingLeft: 16` inline on the `Pressable` in the custom `headerLeft`. The fix shipped before 8.1's commit so the SR 8 trail starts type-clean.

Discipline reinstated for SR 8: typecheck ran between every sub-round (8.1, 8.2, 8.3) and was green at each step. Founder review of SR 7.10 close docs noted a subtle wording oddity in the commit body ("Verified by founder eye-check on iPhone — eye-check after.") — informational only; the visible behavior is correct now via the View-paddingLeft path.

---

## REVISIT-TRIGGERS items added in sub-round 8

- **25** (added in this docs commit): *RevenueCat SDK install + provider scaffold deferred to Phase B opening sub-round.* SDK churn risk over 6-8 weeks; founder dashboard + Apple App Store product config proceed in parallel during Phase A close. Re-add path documented.
- **26** (added in this docs commit): *push_tokens schema + RLS + token registration endpoint design* — to land at the first Phase B push-delivery sub-round. Schema sketch + endpoint shape + cleanup-cron extension all documented.
- **27** (added in this docs commit): *Push token retrieval verification post-Dev Client* — verifies the `getExpoPushTokenAsync` → AsyncStorage stash → Sentry breadcrumb chain that's unverifiable in Expo Go. Manual reset script documented for re-verification.

---

## §13.5 acceptance criteria check

Per `MOBILE_UX_RESEARCH.md §13.5` Phase A definition-of-done:

| §13.5 line | SR 8 status |
|---|---|
| Sentry wired on web and Expo | ✓ — web closed §10.1–§10.4 (2026-04-27), mobile closed in 8.1 |
| Feature-flag kill switches for every AI feature (Днес hero, Oracle, notifications) | ✓ — 8.2 wraps `useDailyHoroscope` (Днес hero), `useOracleReading` (Oracle); push hook reads `FF_PUSH` inline. Vendor selection deferred (founder call). |
| Push notification permission flow scaffold (no notifications yet, just the plumbing) | ✓ — 8.3 ships permission flow + token stash + Sentry breadcrumb. Backend integration is REVISIT-26 (Phase B). |
| RevenueCat setup (before paywall code — App Store product config has lead time) | 🟡 founder-track in parallel — code-side deferred to Phase B opener (REVISIT-25); App Store / RevenueCat dashboard config begins now |
| Bulgarian Privacy Policy + Terms of Service live before any paying user | 🟡 founder-track (PRE_LAUNCH_PREREQS item 7) — outside SR 8 scope |

---

## Verification matrix for founder happy-path on iPhone

When founder runs SR 8 verification on a chart-bearing account in Expo Go:

| Gate | What to look for |
|---|---|
| App boots cleanly with `EXPO_PUBLIC_SENTRY_DSN` unset | No console errors, no Sentry warnings at startup |
| App boots with a real `EXPO_PUBLIC_SENTRY_DSN` set | No console errors. Verify Sentry init by force-throwing a test error from a tap handler somewhere and confirming dashboard receives the event with `errorId` tag (recommend tapping a debug-only button wired to `logError('ERR-MOB-TEST-001', new Error('smoke test'))`). |
| `EXPO_PUBLIC_FF_DAILY_HOROSCOPE=false` flip | Cold start with the flag set: Днес hero shows the unavailable/empty state, no horoscope fetch in network logs |
| `EXPO_PUBLIC_FF_ORACLE=false` flip | Oracle screen renders no saved-reading dots; tapping a topic does nothing visible |
| Default flags (all unset / 'true') | Днес horoscope + Oracle work as before SR 8 |
| First successful Oracle reading on a fresh install | After the reading body renders, the «Известия» Alert appears with the four calibrated strings |
| Tap «Не сега» | Alert dismisses; no system permission dialog; future Oracle readings DO NOT re-prompt |
| Tap «Да, разказвай ми» | iOS system permission dialog appears with Apple's fixed text; user grants → no visible UI change but `@stellaeum/push_token` should be present in AsyncStorage on a Dev Client build (REVISIT-27 deferred verification on Expo Go) |
| Saved-reading cache-hit re-render of the same topic | Alert does NOT fire (it only fires on fresh generations) |
| Header back from Oracle reading view | Returns to topic grid (SR 7.8 behavior preserved) |
| Header back from Oracle topic grid | Pops to dashboard |
| Custom back arrow on Oracle screen | Properly indented from the screen edge (SR 7.10-fix-1 Option B) |

Founder reports any deviation; we triage in-thread before Phase A close ratification.

---

## Phase A close — what happens next

**HALT after this commit. Do NOT auto-fire Phase B.**

Phase A close ratification is a separate decision point. Founder review scope (per ratified halt 2026-05-09):

- **Cost envelope check on OpenRouter** (PRE_LAUNCH_PREREQS item 5) — quota verification, per-model rate-limit policy for `meta-llama/llama-3.3-70b-instruct`, cost envelope against expected launch traffic. Tied to M4 streaming work but the dashboard check itself is founder-track now.
- **Telemetry decision** (PRE_LAUNCH_PREREQS item 1) — PostHog / Plausible / Vercel. Vendor selection blocks instrumentation work; the gap was the birth of the prereqs doc.
- **Friend coordination on web premium features** — `origin/main` status, merge plan back into `mobile-parallel-test` if any. Out-of-thread work.
- **GDPR/ToS status** (PRE_LAUNCH_PREREQS item 7) — Bulgarian Privacy Policy + ToS copy + processor contracts (Clerk, Supabase, Stripe, OpenRouter, RevenueCat). Founder-track, native-speaker review needed.
- **Apple Developer Program enrollment timing** — now in scope. Per founder ratification this thread, SR 9 (EAS Dev Client + TestFlight + biometric, bundled per REVISIT-1) moves from "late Phase C / early Phase D" to **end of Phase B (~6-8 weeks out)** — TestFlight cut is the soft-launch milestone, not the GA submission. Apple Developer Program enrollment ($99/year, requires registered entity) drives this.
- **Documentation reclassification sweep** —
  - REVISIT-1 trigger updated from "Late Phase C / early Phase D" to "end of Phase B"
  - REVISIT-23 (web Oracle cap-reached silent failure) re-examined for sequencing — does it belong inside Phase B web parity work or stays Phase D web reposition
  - REVISIT-27 cross-references REVISIT-1 — both fire at SR 9 now
  - HANDOFF doc SR 9 line updated from "Phase D opener" framing to "end of Phase B"
  - ROADMAP Phase B soft-launch milestone made explicit
- **Any other founder-flagged items**

---

## Branch state at close

`mobile-parallel-test` at `ba35ae7` (8.3 commit). After this docs commit lands, branch picks up one more commit. Push held for explicit founder command per established sub-round 1+2+3+4 pattern.

Total unpushed commits since the last push (sub-round 3 close `2b00c1c`): substantial. Push readiness is a Phase A close ratification item.

---

*Document generated 2026-05-09 after SR 8.3 verification + close-out request.*
