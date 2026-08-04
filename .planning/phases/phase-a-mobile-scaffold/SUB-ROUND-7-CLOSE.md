# Phase A Sub-Round 7 — Mobile Oracle Close Summary

**Opened:** 2026-05-08 (after SR 6.7 polish commit `4b6a1f2` and the comprehensive handoff doc `c36f68b`).
**Closed:** 2026-05-09 (this docs commit, after 7.10 padding fix `f6ad138`).
**Outcome:** Mobile Oracle ships end-to-end on iOS — chart-bearing users tap the ✦ FAB on any tab, push into a full-screen Oracle screen with native iOS animation, choose one of four topics from a 2×2 grid, and read a Gemini-generated reading streamed-as-JSON from `/api/oracle/generate?format=json`. Saved readings render instantly from cache. Daily-cap exhaustion surfaces a calibrated Bulgarian text notice (mobile diverges intentionally from web's silent-failure UX; REVISIT-23 logs the web parity gap). Header back behavior calibrated through three verification sub-rounds.

**Phase A TestFlight DOD status:** «renders chart, opens Oracle» — both clauses now satisfied. Chart side closed in SR 6; Oracle side closes here.

---

## Commit trail — 10 commits across 9 sub-sub-rounds

| Sub-round | Commit | What |
|---|---|---|
| 7.0a | `23b139c` | `feat(core): lift planet sentinel parser to @stellaeum/core (sub-round 7.0a)` |
| 7.0b | `7cb2a81` | `feat(api): add ?format=json branch to /api/oracle/generate (sub-round 7.0b)` |
| 7.2 | `9dd1b01` | `feat(mobile): useOracleReading hook (sub-round 7.2)` |
| 7.3 | `f1dfa92` | `feat(mobile): TopicCards component for Oracle screen (sub-round 7.3)` |
| 7.4 | `05c6902` | `feat(mobile): CapReachedNotice for Oracle screen + REVISIT-23 (sub-round 7.4)` |
| 7.5 | `17a03e7` | `feat(mobile): ReadingBody for Oracle screen (sub-round 7.5)` |
| 7.6 | `5a8e946` | `feat(mobile): Oracle screen route + Slot→Stack + FAB wiring (sub-round 7.6)` |
| 7.7 | `fc8e90e` | `fix(mobile): oracle headerBackTitle = «Назад» (sub-round 7.7)` |
| 7.8 | `015a511` | `fix(mobile): custom headerLeft on oracle returns to topic grid (sub-round 7.8)` |
| 7.9 | (no commit) | working-tree-only revert of SR 7.8 diagnostic instrumentation — never committed by design (see *Issue 3 diagnosis* below) |
| 7.10 | `f6ad138` | `fix(mobile): oracle headerLeftContainerStyle padding for custom back (sub-round 7.10)` |
| 7.11 | (this docs commit) | sub-round 7 close summary + REVISIT-TRIGGERS item 24 |

7.1 was reserved during planning and absorbed into 7.0a/7.0b (parser lift + JSON-format branch became the prerequisite work; the originally-scoped "useOracleReading hook" landed as 7.2). 7.9 is the only "phantom" sub-round — its work happened in the working tree only and has no commit, see *Issue 3 diagnosis*.

---

## What shipped — feature surface

### 7.0a — Sentinel parser lift to `@stellaeum/core`

`apps/web/lib/oracle/planet-parser.ts` moved to `packages/core/src/oracle/planet-parser.ts` (`stripSentinels` + `extractPlanetMentions`, identical regex to web's prior version). New subpath export `@stellaeum/core/oracle/planet-parser`. Web migrations: oracle/generate route + `OraclePanelGlobal` + `ReadingStream`. Mobile: the inline `stripPlanetSentinels` in `useDailyHoroscope.ts` becomes a re-export so Today's `index.tsx` keeps working unchanged.

### 7.0b — JSON-format branch on `/api/oracle/generate`

Mirrors the SR 5.3 pattern from `/api/horoscope/generate`. When `?format=json` is set the route uses `generateText` to collect the full output, persists via the same `ai_readings` upsert as the streaming branch's `onFinish`, then returns `{ content, cached: false, generatedAt }`. Web's streaming path is untouched. Daily-cap and ownership checks run in both branches before the model call. Persistence semantics preserved (strip + upsert + 7-day expiry + regenerate timestamp).

### 7.2 — `useOracleReading` mobile hook

TanStack Query hook. Lists saved readings via `GET /api/oracle/readings?chartId=...` and generates fresh ones via `POST /api/oracle/generate?format=json`. Surface mirrors web's `useOracleReading.ts` where it makes sense (savedReadings indexed by topic, activeTopic state, generation state) but skips streaming-text plumbing. Cap-reached state mapped explicitly: 429 with body `{ code: 'CAP_REACHED', cap }` → `generationError.kind === 'cap-reached'`. Mutation invalidates `['oracle-readings', chartId]` on success.

### 7.3 — `TopicCards` component

2×2 pressable grid of the four Oracle topics — Личност, Любов, Кариера, Здраве. Mirrors web's `TopicCards.tsx` post the 2026-04-20 cap-gate refactor: every authed user sees all four topics; per-topic locking is gone, daily cap is server-enforced. Topic icons port web's solid-fill SVG paths from `TopicCard.tsx TOPIC_META` verbatim, rendered via react-native-svg with viewBox `0 0 20 20`. Active state surfaces amber-tinted background, violet glow shadow, white label, and the standard left-corner amber-diamond mark. Saved-reading indicator is the same right-corner amber diamond from web. Bulgarian labels mirrored verbatim.

### 7.4 — `CapReachedNotice` component + REVISIT-23 filing

Text-only notice rendered when `/api/oracle/generate` returns 429. No CTA — RevenueCat isn't wired and Stripe is web-only, so a button that opens nothing or web checkout would be dead UX. Bulgarian copy calibrated via bulgarian-skill:

> «Днес изчерпа {cap} безплатни четения. Звездите ще говорят отново утре.»

Calibration notes: «четения» matches the established codebase term (the server's existing 429 message uses the same form); subject-dropped «Изчерпа…» stays in the ти register and reads as natural Bulgarian rather than as a translated UI string; «безплатни» implies premium without selling it; two sentences keep it tight; the second line stays in oracle voice.

REVISIT-23 logged simultaneously: web's cap-reached path currently fails silently because `LockedTopicTeaser` is dead code in `OraclePanelGlobal.tsx` post the 2026-04-20 cap-gate refactor (`setLockedTopicShown(topic)` is never called from any path). Mobile rendering this state well is intentional divergence; web needs to catch up post-Phase A.

### 7.5 — `ReadingBody` component

Strips `[planet:KEY]…[/planet]` sentinels via the shared `@stellaeum/core/oracle/planet-parser` helper (lifted in 7.0a), splits on double-newline into paragraphs, renders one `<Text>` per paragraph at 15px / leading-7 / slate-300/90 — same typographic rhythm web uses for saved readings. Optional generated-at timestamp renders as a Bulgarian-locale long-form date eyebrow («8 май 2026 г.»), mirroring the header detail web shows above a saved reading. No streaming cursor — REVISIT-22 logs the streaming + colored-sentinel polish path.

### 7.6 — Oracle screen route + Slot→Stack + FAB wiring

The structural commit. Three things:

1. **`(authed)/_layout.tsx` converted from `<Slot />` to `<Stack />`** — required so the new Oracle route can push with a header bar and native iOS animation. `(tabs)` and `wizard` render header-less under the Stack; their internal layouts (Tabs / inner Stack) keep working unchanged.
2. **`(authed)/oracle.tsx` — new screen.** Composes `TopicCards` (no active topic), `ReadingBody` (saved or freshly-generated reading), `CapReachedNotice` (cap-reached error), a static loading state mirroring web's «Stellaeum / консултира звездите…» pre-first-token block (web has an animated orbiting-diamond canvas; mobile ships static for SR 7), a «Всички теми» back button to clear `activeTopic`, and an «Астрологичен оракул» eyebrow at the top mirroring web's panel header.
3. **`OracleEntry.handlePress` wired** to `router.push('/oracle')`; the FAB returns `null` pre-chart, mirroring web's `OracleFab` `if (!hasChart) return null` and the parallel pattern from SR 4's empty-state CTA on Днес.

Empty-state subtitle drops «отгоре» from web's «Избери тема отгоре и звездите ще ти разкажат.» — on mobile the topic cards sit directly above the caption so the spatial cue is redundant. All other Bulgarian copy mirrored verbatim.

If a deep-link or race lands on `/oracle` without a chart the screen redirects to Днес (defensive — the FAB hiding in the no-chart case should make this unreachable in practice).

### 7.7 → 7.10 — Verification sub-rounds

Founder happy-path verification on chart-bearing iOS surfaced three issues. Diagnosis-first protocol followed; instrumentation went in *before* the first fix attempt for the one issue with multiple plausible hypotheses (lessons from SR 4 picker saga absorbed).

- **7.7 (`fc8e90e`)** — Cosmetic. Stack header back was rendering «(tabs)» — the inherited `screenOptions` empty `headerBackTitle` didn't suppress the previous-route fallback. Setting it explicitly on the oracle screen ensures the label shows the intended Bulgarian copy on any code path that defers to the default native back button. Note: superseded on the oracle screen specifically by the custom `headerLeft` landing in 7.8; kept for defense in depth.
- **7.8 (`015a511`)** — Real bug. The Oracle screen renders both topic grid and reading inline, gated by `activeTopic` local state in the hook. The Stack header back arrow only invoked `router.back()`, so users tapping it from a reading were popped to dashboard instead of returning to the grid. Fix: override `headerLeft` via `<Stack.Screen options={...}/>` from inside `OracleScreenInner`. The button branches on `activeTopic` — when a reading is open, `clearActiveTopic()` returns to the grid; otherwise `router.back()` preserves the dashboard-pop default. Always-rendered (vs conditional) to avoid expo-router leaving stale options on the route after the JSX unmounts.
- **7.9 (no commit)** — *See Issue 3 diagnosis below.* Saved-reading indicator dot appeared not to reappear after app reload. Diagnostic instrumentation was added to `useOracleReading.ts` (chartId entering the hook, queryFn fire/raw response, state-change `useEffect`) and deliberately left uncommitted. Founder reload + Metro logs confirmed the query fires correctly on cold start, returns `["general", "career", "love"]` cleanly, and `chartId` is stable across mounts. Root cause: stale Metro bundle, not a race. Working tree reverted to the pre-instrumentation HEAD; no commit.
- **7.10 (`f6ad138`)** — Cosmetic. Custom `headerLeft` from 7.8 lacked the default iOS edge padding the native back chevron gets automatically — the «‹» glyph rendered flush against the screen edge. `headerLeftContainerStyle: { paddingLeft: 16 }` on the oracle screen options restores native parity without coupling layout concerns into `oracle.tsx`.

---

## Decisions (D1–D7 + D4 modification)

These were ratified across the SR 7 in-thread discussion and the verification round. Labels are reconstructed from the commit trail and the SR 7 brief in the 2026-05-08 handoff document — the discussion didn't produce a separate decisions doc. Cite by commit if exact provenance matters.

| # | Decision | Resolution | Where it lives |
|---|---|---|---|
| **D1** | Streaming SSE vs `?format=json` for mobile generation path | **JSON.** Mobile cannot reliably consume Server-Sent Events on iOS without polyfills (`react-native-sse` is finicky). Mirrors the SR 5.3 daily-horoscope pattern. Streaming polish deferred to REVISIT-22. | 7.0b adds the JSON branch; 7.2 hook consumes it |
| **D2** | Sentinel marker rendering on mobile (`[planet:KEY]…[/planet]`) | **Strip-to-plain via shared `@stellaeum/core/oracle/planet-parser`.** Colored `<Text>` spans deferred to REVISIT-22 alongside streaming polish. | 7.0a lifts the parser; 7.5 calls `stripSentinels` |
| **D3** | Cross-highlight bridge to NatalWheel (web's planet-mention-tap → wheel-pulse) | **Skip.** Oracle is a separate route on mobile, not a side-by-side panel like web's desktop sidebar. The bridge is a desktop-pattern artifact. | not implemented; no commit |
| **D4** | Oracle route shape | **Full-screen route with header bar, native iOS push animation.** *Modification:* the original brief assumed the existing `<Slot />` could host the route, but native-stack header behavior required converting `(authed)/_layout.tsx` from `<Slot />` to `<Stack />` (with `(tabs)` and `wizard` rendering header-less under it). | 7.6 ships the conversion + the screen + the FAB wiring |
| **D5** | Tier gating data source on mobile (originally: extend `useFirstChart` vs new `useSubscriptionTier`) | **Moot.** The 2026-04-20 cap-gate refactor on web removed per-topic tier locking entirely — every authed user sees all four topics; the daily cap is server-enforced. Mobile inherits the same model; no client-side tier read needed for SR 7 scope. | 7.3 renders all topics unlocked; 7.2 surfaces the 429 cap-reached state |
| **D6** | Premium topic locking copy (originally: mirror `LockedTopicTeaser.tsx` Bulgarian verbatim) | **Replaced by CapReachedNotice.** D5's removal of per-topic locking dissolved the original surface; the cap-reached state needed its own Bulgarian copy, calibrated via bulgarian-skill (mobile-only surface — web is silent on this path, REVISIT-23). | 7.4 ships the notice + the calibrated copy |
| **D7** | Topic-card layout | **2×2 grid mirroring web's `<640px` breakpoint.** | 7.3 |

---

## Issue 3 diagnosis — instrument-before-fix protocol applied

SR 7 founder verification flagged: "saved-reading indicator dot does not appear after app reload, even though the reading was successfully cached on first generation." Two plausible hypotheses surfaced (TanStack Query cache lost on reload + query not re-firing; server data missing for chartId on reload), with a third "something else" branch.

Per the SR 4 picker-saga lesson — *"Diagnostic instrumentation after 2 failed fix attempts, not 4-5"* — and tightened further to *"instrument BEFORE the first fix attempt when multiple hypotheses are plausible"* (founder directive in the SR 7 verification handoff), three `__DEV__`-guarded log points were added to `useOracleReading.ts`:

1. Hook-render line: `chartId`, `enabled`, `queryKey` on every render.
2. `queryFn` body: log when fetch fires, log raw response with `length` and `topics` extracted.
3. `useEffect` listening on `status` / `fetchStatus` / `data` / `error` to trace state transitions.

Founder reloaded the app cold and pasted the `[useOracleReading]` log lines from Metro:

- `chartId` was a stable string from the first hook-render line (no null→string transition that could destabilize the queryKey).
- `queryFn firing` printed once on cold start.
- `queryFn raw response` showed `length: 3` and `topics: ["general", "career", "love"]` — the expected three topics with saved readings from prior session, all returning correctly from the server.
- State transitions converged to `status: 'success'` cleanly.

Verdict: not a race condition, not a server gap, not a TanStack cache issue. **Stale Metro bundle.** The original verification was running against a JS bundle that predated 7.3's saved-readings-indicator render path; a clean Metro restart resolved the symptom without code changes. Working tree was reverted to the pre-instrumentation HEAD; no commit.

**Lesson reinforced:** instrument-before-first-fix saved an unknown number of wrong-hypothesis fixes that would otherwise have been merged on a non-bug. Total cost: one diagnostic-edit roundtrip + one founder Metro reload. Net savings: at least the two-fix budget the SR 4 lessons would have absorbed before instrumentation. Worth ratifying as the standard posture for any SR 7+ verification finding with multiple plausible causes.

---

## REVISIT-TRIGGERS items added in sub-round 7

- **23** (added 2026-05-08 in commit 7.4): *Web Oracle cap-reached path fails silently (post 2026-04-20 cap-gate refactor).* `OraclePanelGlobal.tsx` destructures `useOracleReading()` but does not render its `error` state; the dead `LockedTopicTeaser` + `lockedTopicShown` scaffolding is still in the file. Mobile mirrors the cap-reached state actively via 7.4's `CapReachedNotice`; web catches up post-Phase A.
- **24** (added in this docs commit): *iOS edge-swipe and Android hardware back bypass Oracle reading-view back handler.* The custom `headerLeft` landing in 7.8 catches the visible header arrow but not the iOS edge-swipe gesture or Android hardware back button — both fire through `react-native-screens` / `BackHandler` and skip the React-side override, popping users to dashboard from a reading. Two viable fix paths documented (`beforeRemove` event interception, ~20 LOC; or full route split into `oracle/[topic].tsx`, ~80 LOC + URL plumbing). Founder spec for 7.8 explicitly scoped to "back arrow only"; this is closing-time documentation, not a regression.

---

## Verification gates passed

| Gate | Result |
|---|---|
| TypeScript green at every commit | ✓ |
| Slot→Stack conversion: tabs and wizard still render correctly | ✓ |
| Oracle FAB hides pre-chart, shows post-chart | ✓ |
| FAB tap → Oracle screen pushes with native iOS animation + header bar | ✓ |
| Header title renders «Оракул» | ✓ |
| Topic grid renders 4 cards (Личност, Любов, Кариера, Здраве) | ✓ |
| Saved-reading indicator dot renders on cards with cached readings | ✓ (after Metro restart per Issue 3) |
| Tap topic with no saved reading → loading state → /api/oracle/generate?format=json call → ReadingBody | ✓ |
| Tap topic with saved reading → instant render from cache, no API call | ✓ |
| Cap-reached: 429 → CapReachedNotice with calibrated Bulgarian copy | ✓ |
| Header back from grid → dashboard | ✓ |
| Header back from reading → topic grid (7.8) | ✓ |
| Header back label «Назад» (7.7) | ✓ |
| Custom back arrow has iOS-parity edge padding (7.10) | ✓ via founder eye-check |
| iOS edge-swipe back from reading → dashboard (KNOWN GAP) | ✗ — REVISIT-24 logged |
| Android hardware back from reading → dashboard (KNOWN GAP) | ✗ — REVISIT-24 logged |
| Bulgarian copy: web-shared verbatim, mobile-only calibrated | ✓ |

---

## Phase A TestFlight DOD — exit criteria status

Per `MOBILE_UX_RESEARCH.md §10`:

> "TestFlight build navigates all 5 tabs, **renders the user's chart**, **opens Oracle**."

| Clause | Closed in | Status |
|---|---|---|
| Navigates all 5 tabs | SR 1–6 | ✓ |
| Renders the user's chart | SR 6 (6.1–6.6) | ✓ |
| Opens Oracle | SR 7 (7.0a–7.10) | ✓ |

**Phase A DOD chart-and-Oracle clauses satisfied.** SR 8 (infra batch) closes the remaining `MOBILE_UX_RESEARCH.md §13.5` Phase A definition-of-done items: mobile Sentry, feature-flag kill switches, push permission scaffold, RevenueCat scaffold. SR 9 (EAS Dev Client + TestFlight bundling) waits on Apple Developer Program enrollment per the bundled-revisit decision in REVISIT item 1.

---

## Sub-round 7 → sub-round 8 handoff

**Mobile Oracle ships shippable end-to-end.** Chart-bearing users on iOS can open Oracle from any tab, browse saved readings instantly from cache, generate fresh readings on tap, hit the daily cap with a clear Bulgarian text notice, and return through the topic grid with a back arrow that behaves correctly for the visible-header path.

**Sub-round 8 expected scope** (from handoff doc + `MOBILE_UX_RESEARCH.md §13.5`):

- **8.1** — Mobile Sentry on Expo SDK. Conservative defaults (PII scrub on, traces off, logs off, no replay) mirroring web's §10 close posture.
- **8.2** — Feature-flag kill switches. Vendor selection (PostHog / GrowthBook / ConfigCat) is a founder call; Phase A close ships hardcoded-true scaffolding with TODO for vendor wiring.
- **8.3** — Push notification permission scaffold via `expo-notifications`. Permission UX timing per `MOBILE_UX_RESEARCH §12.3`: request at first chart-success or first Oracle-tap, NOT at app launch.
- **8.4** — RevenueCat setup. SDK install + scaffolded provider context; founder begins Apple App Store product config in dashboard in parallel (1–2 week lead time).

**Carry-forward items not addressed in SR 7:**

- REVISIT-22: streaming text + colored sentinel rendering on mobile (current strip-to-plain is the SR 5.3 pattern; polish round ports `parseSentinels` with `<Text>` color spans).
- REVISIT-23: web Oracle cap-reached silent failure (mobile renders the state; web catches up post-Phase A).
- REVISIT-24: iOS edge-swipe + Android hardware back gaps on Oracle reading view (added in this commit).
- REVISIT-20, 21: streaming on Daily horoscope, `useCrystalOfTheDay` TanStack migration (open from earlier rounds).

**SR 8 investigation pass should fire next per speed-mode discipline** — read the four target areas, surface decisions in one message, halt for founder ratification before code.

---

## Branch state at close

`mobile-parallel-test` at `f6ad138` (7.10 commit). After this docs commit lands, branch picks up one more commit. Push held for explicit founder command per established sub-round 1+2+3+4 pattern.

---

*Document generated 2026-05-09 after SR 7.10 verification + close-out request.*
