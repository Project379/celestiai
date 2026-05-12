# End-of-Session Handoff — 2026-05-12 EOD

**Purpose:** Read this file as first action in the next Claude Code session. After reading, summarize back to founder: (a) security model, (b) quota system, (c) next action. If your summary doesn't match this file, halt for clarification before P.2 fires.

**Session scope:** B.0g (REVISIT burn-down + mobile onboarding fixes). 4 commits, 1 push, all TS-green, founder smoke-test PASS.

---

## 1. Branch state

**Branch:** `mobile-parallel-test` ([verified] — the active trunk per founder memory; `develop` is frozen historical reference).

**HEAD:** `3d06e24` — `docs(planning): B.0g close — REVISIT-12/15/16 closure + PRE-LAUNCH-POLISH-BATCH-INTENT filed`

**Origin sync:** clean. Push completed 2026-05-12 EOD (`7efd8c5..3d06e24 → origin/mobile-parallel-test`). No unpushed commits.

**Working tree drift (every file enumerated):**

Modified, not in scope:
- `.claude/settings.json` — local Claude Code harness config; long-standing personal-state drift, never committed.
- `.claude/settings.local.json` — same; per-user permissions/allowlist additions.
- `.planning/phases/m3-uat/RESULTS.json` — vestigial UAT harness output, tied to REVISIT-35 (m3-uat harness disposition pending). Don't commit; will be resolved alongside REVISIT-36 (API integration test layer evaluation).

Untracked, not in scope:
- `.agent/` — local agent state directory, not project content.
- `.claude/hooks/claude-mem-cleanup.js` — local Claude Code hook for the memory cleanup port-conflict handler (the `[claude-mem-cleanup] Port conflict detected. Updated port: 37778 -> 37777` SessionStart message is from this hook). Personal harness, not project scope.
- `.claude/scheduled_tasks.lock` — Claude Code scheduled-task runtime artifact.
- `.claude/skills/go/`, `.claude/skills/mystical-dark-ui/`, `.claude/skills/ui-ux-pro-max/` — user-installed Claude Code skills (per skill list at session start); local tooling, not project scope.
- `ecosystem.config.cjs` — PM2 ecosystem config for a local background worker; not used by the project's npm scripts or CI.
- `start-worker.js` — companion script for the PM2 worker; same scope as above.

**Pending operational steps — STATUS:**

| Step | Status |
|---|---|
| Clerk Dashboard "Require first and last name" toggle ON | ✓ DONE 2026-05-12 (founder confirmed during B.0g ratification; smoke-tested in T2 PASS) |
| Clerk Dashboard application display name → «Stellaeum» | ✓ DONE 2026-05-12 (out-of-band founder task; closed REVISIT-15) |

No pending Supabase migrations, no pending SQL Editor pastes, no pending env-var cleanups from this session.

**Open operational dependencies from prior sub-rounds** (referenced from `.planning/phases/phase-b-mobile-parity/HANDOFF-2026-05-09.md` strategic items section, not B.0g scope):
- Apple Developer Program enrollment — begin by 2026-05-23, complete before SR 9. Founder owns.
- OpenRouter cost envelope check — complete before SR 9. Founder owns.
- Bulgarian Privacy Policy + ToS — required before external TestFlight opens. Founder + legal review.
- RevenueCat dashboard config (products, entitlements, offerings) + Apple App Store product config — lead-time work; founder track during Phase B open.

---

## 2. Sub-round chain status

**Closed this session (B.0g, 2026-05-12):**

| Commit | Hash | Outcome |
|---|---|---|
| B.0g-1 | `64e616d` | REVISIT-12 web Clerk delete-account placeholder unified on «Изтриване на акаунта» via vendor-string override |
| B.0g-2 | `a75f873` | REVISIT-16 mobile signup gains «Име»/«Фамилия» required fields; downstream profile-name fallbacks fixed |
| B.0g-3 | `7373e1b` | Forced birth-data wizard with Path 2 hard-dismissable per-launch behavior; new mobile onboarding standard |
| B.0g close | `3d06e24` | Closure markers + PRE-LAUNCH-POLISH-BATCH-INTENT filed + HANDOFF updated |

**Founder smoke-test status:** FULL PASS across T1, T2, T3a, T3b, T3c.

**Next sub-round per locked Stream P chain:** **P.2 (Карта parity batch)**, ~700 LOC.

**Full chain (post-B.0g):**
```
B.0 ✓ → B.0d ✓ → B.0e ✓ → B.0c ✓ → B.0f ✓ → P.1 ✓ → B.0g ✓ → P.2 → P.4 → P.3 → P.5 → P.7 → P.6 → P.8 → P.10 → P.9 → P.15 → P.11 → P.12 → P.16 → P.13 → P.17 → P.18
```

**Ratified-but-not-yet-executed decisions:**
- **REVISIT-32 folds into P.2 pre-flight investigation pass** — first mobile sub-round to touch data fetching post-B.0d RLS lockdown; REVISIT-32's own trigger ("opportunistically during any mobile sub-round that touches data fetching, OR before SR 9") aligns naturally with P.2.
- **PRE-LAUNCH-POLISH-BATCH-INTENT** — fires during Phase B middle weeks (~P.6 to P.12) OR before SR 9. Not yet scheduled to a specific sub-round.

---

## 3. Locked architectural decisions (do not re-litigate)

### Security model [verified at B.0d/B.0e]

Three data classifications enforced via RLS lockdown (B.0d remediation, B.0e validation):

- **INTERNAL** — server-only state (audit, system events, internal flags). RLS denies all anon reads.
- **USER_DATA** — per-user records (charts, diary entries, recommendation state, push tokens). RLS scopes to `auth.uid()`; only the owning user can read/write.
- **CATALOG** — public read-only data (`bulgarian_cities`, `crystals`, `crystal_listings`, `crystal_vendors`). RLS permits anon reads.

**Server-side access pattern:** `createServiceSupabaseClient()` + manual `user_id` filter, universally. `createServerSupabaseClient()` (Clerk-JWT-bound) was deleted at B.0e — it had zero callers, Pattern A was aspirational. The third-party-auth path remains for browser-side `useSupabaseClient()` consumers only.

**Reference:** `apps/web/lib/supabase/SECURITY-MODEL.md` is the authoritative doc.

### Quota system [verified at B.0f]

- **Free tier:** 3 readings/month, monthly period anchored to subscription start.
- **Premium:** uncapped on Oracle generation.
- **Daily horoscope:** quota-exempt for free tier (per surface ratification).
- **Regeneration paths:** quota-exempt (skip the decrement when re-generating an existing saved reading).
- **Schema:** `subscription_quotas` table is canonical source of cap state. `ai_readings_limit=3` schema default IS the cap, NOT a placeholder. Env var `ORACLE_FREE_MESSAGES_PER_DAY` was deleted at B.0f as canonical-source cleanup.
- **Atomicity (Pattern B):** quota decrement is a single RPC call to a SQL function that performs the check + decrement atomically. Pure PostgREST can't do column-self-arithmetic in a single round trip; the function is required.
- **Stream-abort (Approach C):** `consumeStream()` from AI SDK runs the stream to completion server-side regardless of client disconnect. Client-side "stop" button is cosmetic; cache always gets the full reading even if user aborts. Eliminates the "user clicked stop, got billed, lost content" failure mode.

**Path Z framing:** the 3/month cap is **deliberately experimental** for the soft-launch pre-Кръг window. REVISIT-34 filed for post-soft-launch re-evaluation based on PostHog data.

### Auth & user management [verified at B.0c]

- **`ensureUserRecord(userId)`** — server-side helper that upserts a row in `public.users` for the given Clerk ID on first authenticated request. Idempotent.
- **`requireAppUser()`** — API route guard that authenticates the Clerk session, calls `ensureUserRecord`, and returns the `users` row. Standard guard at the top of every protected route.
- **Hierarchical audit types** — `system.payment.*`, `system.security.*`, `account.deletion_*`, etc. Replaces the prior flat `payment.webhook_received` style (REVISIT-33 cleaned up the orphaned flat entry at B.0f-1).

### Mobile onboarding [set at B.0g]

- **Clerk Dashboard "Require first and last name" = ON** (2026-05-12). All future signups must collect both names.
- **Forced birth-data wizard, Path 2 hard-dismissable:**
  - New signups (`verify.tsx`) route directly to `/wizard/date` after Clerk finalize — not to `/`.
  - On every app launch, `(authed)/_layout.tsx` evaluates chart existence via `useFirstChart()`. If authed AND `chart === null` AND not already in `/wizard` AND not dismissed this launch → auto-navigate to `/wizard/date`.
  - Wizard header has a persistent «Пропусни» button (every step). Tap opens native `Alert.alert` with ratified copy: title «Сигурен ли си?» / body «Без рождена карта няма да виждаш персонализиран хороскоп, наталната карта или транзитите.» / «Назад към данните» (cancel) / «Пропусни засега» (destructive).
  - Per-launch dismiss state: `apps/mobile/lib/onboarding/dismissState.ts` — module-level boolean. **Deliberately NOT AsyncStorage** so chart-less users see the forced wizard again every fresh app launch until a chart is created.

### D1–D12 Phase B decisions [verified — verbatim from HANDOFF-2026-05-09.md:180-191]

- **D1** universal-first per-component, default platform-specific where framer-motion involved. Lift data + Bulgarian editorial copy only.
- **D2** Bulgarian copy 80% mirror / 20% calibrate; per-sub-round investigation pass; batched `bulgarian-skill` invocation at each sub-round close.
- **D3** Pricing surface ships DUAL — inline `<MobilePaywall>` + Ти→Премиум destination. P.11 builds both.
- **D4** Subscription management — platform-native deep link + RevenueCat-driven cancel/reactivate UI when P.15 lands.
- **D5** Account settings — Clerk RN `<UserProfile>` + custom app-specific section.
- **D6** Lunar diary — same Supabase backend, mobile UI-only port. Cross-surface sync automatic.
- **D7** Recommendations — AsyncStorage parity for ship velocity. REVISIT-28 filed for cross-device sync at Phase C/D.
- **D8** Wheel arrival animation in P.2.7 — full Reanimated 4 port. Budget ~150–250 LOC (NOT ~50). If balloons, surface via budget_overrun_discipline.
- **D9** Crystals collection — full port (monthly windows + daily streak + collection view).
- **D10** PostHog locked at 10 events through Stream P. REVISIT-29 filed for expansion 4 weeks post-soft-launch.
- **D11** Stream K tiered interleaving (synastry Tier 1 / «Днешен ден» Tier 2 / crush+couples+yearly Tier 3 / Friends NOT scope).
- **D12** P.17 fires only after Apple Developer enrollment confirmed.

---

## 4. Execution discipline patterns to preserve

**Investigation-first.** Before any code change, fire an investigation pass: read the surface, identify the actual bug shape, surface findings + halt-triggers + LOC estimate. Founder ratifies, then code lands. B.0g-1 caught a key class of bug this way (REVISIT-12 lived in vendor strings, not our code — pre-coding investigation prevented a wrong-direction edit).

**Conflict-surfacing protocol.** Bugs caught this session by surfacing rather than assuming:
1. **REVISIT-12 fix path was NOT codebase copy edit.** The REVISIT entry framed it as "rephrase our copy"; investigation discovered the strings live in `@clerk/localizations/dist/bg-BG.js`. Surfaced as Halt-trigger 1 before code; founder ratified the vendor-override pattern.
2. **REVISIT-16 web side was already correct.** The REVISIT framed it as "mobile diverges from web"; investigation discovered web uses Clerk's prebuilt `<SignUp>` (no custom code) — gap is Dashboard-config-controlled. Surfaced as Halt-trigger 2; saved a wrong-direction web edit.
3. **Forced wizard non-dismissable would have been wrong.** Initial investigation suggested layout-level `<Redirect>` for non-dismissable behavior. Founder ratified Path 2 (hard-dismissable with confirm dialog) — investigation surfaced both options explicitly rather than committing to one.

**Halt trigger list (per session pattern):**
1. New copy decisions (founder ratifies Bulgarian text unless mirror-verbatim from existing surface)
2. Founder operational steps (Clerk Dashboard, Supabase migration, env var changes)
3. Cross-surface scope (web edit in a "mobile sub-round" or vice versa)
4. Vendor/library-level fixes (override patterns, peer adjustments)
5. LOC budget overrun beyond estimate
6. TS errors that require structural changes
7. Architectural decisions not previously ratified
8. Smoke-test failures

**2-fail-attempts-then-instrumentation.** If two hypothesis-driven fix attempts on the same surface fail, halt and instrument before attempt 3. The REVISIT-18 picker saga consumed 7 hours partly because this rule wasn't applied early; the lesson is captured in `SUB-ROUND-4-CLOSE.md` "Picker saga retrospective."

**Custom build first-class after 2-3 library debugging cycles.** Don't bias toward feature-degradation over bounded custom build. The TimePicker (`apps/mobile/components/wizard/TimePicker.tsx`, ~190 LOC) is the precedent.

**Bulgarian copy mirror discipline (D2).** For shared web/mobile surfaces, mobile mirrors web's existing Bulgarian vocabulary verbatim — no calibration unless mobile-specific adaptation is needed (e.g., width constraints). Net-new strings get `bulgarian-skill` calibration at sub-round close unless founder explicitly ratifies ship-as-is.

**Dead code = delete OR fail-fast guard.** Don't leave dead branches with stable references. B.0f-2 added a fail-fast `throw` to the m3-uat harness because the cap-gate test block was predicated on the old mechanism (REVISIT-35). REVISIT-38 documents the dead `LockedTopicTeaser` state for explicit deletion at P.12.

**Founder operational steps require explicit confirmation.** Don't assume Dashboard/migration/env-var changes have been applied. Surface as halt-trigger pre-code; verify post-action via founder confirmation. B.0g-2 depended on the Clerk "Require name fields" toggle — founder confirmed at ratification, then smoke-tested at T2.

**Trigger language should be semantic, not numeric.** When filing REVISITs, prefer "fires during Phase B middle weeks when soft-launch UX completeness becomes active" over "fires at P.7 specifically." Numeric pinning ages poorly; semantic pinning survives sub-round reordering. The B.0g audit pass critiqued REVISIT-23's original "post-2026-04-20" framing for this reason.

**Memory pre-check.** Before orienting on multi-step work, query the user's memory system (`MEMORY.md` and pointed files at `C:\Users\ntone\.claude\projects\C--Users-ntone-Desktop-sub-project\memory\`) for prior-session context. Especially `feedback_*.md` entries.

**Explain in paragraphs after substantive prompts.** Verification gate, not cosmetic — paragraphs force the assistant to demonstrate understanding rather than performing tasks blindly.

**No background-agent triage.** Decision/prioritization work stays in-thread; `/schedule` is for mechanical execution only.

**Conservative SDK defaults posture.** Opt-out of third-party SDK richness pre-launch. Expand only on evidence with named revisit triggers. Don't add SDK features speculatively.

---

## 5. REVISIT lifecycle state

**Tallies after B.0g:**

| Bucket | Count | % of 41 filed |
|---|---|---|
| CLOSED (in-file with markers) | 7 (5, 12, 15, 16, 23, 30, 33) | 17.1% |
| CLOSED-BY-RECLASSIFICATION | 3 (20, 21, 22) | 7.3% |
| SUPERSEDED-at-filing | 1 (39, never filed) | 2.4% |
| **Total resolved** | **11** | **26.8%** |
| OPEN | 30 | 73.2% |
| — of which OPEN-NO-TRIGGER (now batched) | 8 | 19.5% of total / 26.7% of open |

The 8 OPEN-NO-TRIGGER items are no longer truly orphaned — they're now claimed to a defined future window via PRE-LAUNCH-POLISH-BATCH-INTENT.

### OPEN items by trigger condition

**Future sub-round will naturally fire (19 items):**

| REVISIT | Triggers in |
|---|---|
| 1, 27 | SR 9 (Phase B close — EAS Dev Client + TestFlight + biometric) |
| 25, 26 | Phase B opener / first push-delivery SR |
| 28 | Phase C/D cross-device sync |
| 29, 34 | 4 weeks post-soft-launch (data-triggered) |
| 31 | Periodic 4–6 weeks |
| 32 | **P.2 pre-flight** (folded in per ratification) |
| 35, 36 | Phase B mid OR before SR 9 |
| 37, 38, 40 | P.12 (Oracle parity polish) |
| 41 | Every Stream P sub-round close |
| 24, 18 | Post-Phase-A polish / Phase D |
| 19 | Dedicated polish OR user feedback |
| 42 | Post-soft-launch typographic polish |
| 6 | Clerk paid-plan upgrade for launch |

**Feature-request triggered (3 items):**
- 2 (Sign in with Apple), 3 (OAuth), 4 (Passkeys) — peer installed, waiting on first feature request.

**OPEN-NO-TRIGGER, batched to PRE-LAUNCH-POLISH-BATCH-INTENT (8 items):**
- 7 (color contrast audit)
- 8 (mobile streak footer drift from web vocabulary)
- 9 (Sentry org slug rename — plan tier decision)
- 10 (test email domain `@celestia-ai.dev` rename)
- 11 (GitHub repo rename `Project379/celestiai`)
- 13 (birth date validation error format)
- 14 (landing splash heading overflow)
- 17 (web TIME_RANGES hour string asymmetry)

### PRE-LAUNCH-POLISH-BATCH-INTENT (filed at B.0g close 2026-05-12)

**Trigger:** Phase B middle weeks (~P.6 to P.12) OR before SR 9 if not absorbed earlier.

**Scope:** ~150–200 LOC consolidated sweep. Likely two-commit shape:
1. **Mechanical fixes** (~80–120 LOC): REVISIT-8, 13, 14, 17 — straight code edits.
2. **Founder-decision items** (~40–80 LOC): REVISIT-7 (brand vs WCAG AA), REVISIT-9 (Sentry plan cost-benefit), REVISIT-10 (domain registration), REVISIT-11 (GitHub rename cascade).

**Discipline closure:** B.0g audit pass surfaced 11 OPEN-NO-TRIGGER items; 3 burned down at B.0g; remaining 8 are claimed to a defined future window rather than left as orphans. Compounds the close-discipline pattern.

### REVISITs firing during upcoming sub-rounds

| Sub-round | REVISITs that fire |
|---|---|
| **P.2** | **REVISIT-32 (pre-flight)** |
| P.6–P.12 | PRE-LAUNCH-POLISH-BATCH-INTENT (8 items) |
| P.9 | REVISIT-1.3 stub completion (Premium badge tier-source) |
| P.12 | REVISIT-37, 38, 40 |
| P.13 | REVISIT-29 setup (10-event taxonomy wiring) |
| Phase B opener | REVISIT-25, 26 |
| Phase B mid OR before SR 9 | REVISIT-36 |
| Stream P every close | REVISIT-41 (parity-gap sweep) |
| SR 9 (Phase B close) | REVISIT-1, 27 |
| Phase C/D | REVISIT-28, 34, 42 |

---

## 6. Technical gotchas learned (mobile + otherwise)

**NativeWind v4 static class scanner.** The Tailwind class scanner runs at build time and only picks up classes that appear literally in `className` strings. Dynamic lookups (`PLANET_COLORS[chunk.planet]`) don't survive the scan — classes resolved at runtime get tree-shaken. Workaround pattern (used in `apps/mobile/app/(authed)/(tabs)/index.tsx` `PLANET_HEX_COLORS`): use hex constants resolved at runtime, not Tailwind class strings.

**NativeWind drop-shadow doesn't apply to `<Text>`.** Tailwind's `drop-shadow-*` maps to CSS `filter: drop-shadow(...)`, which doesn't apply to RN `<Text>`. Use the RN-native `textShadow*` style props instead (color/offset/radius). Pattern from P.1-b's greeting block faux halo at `index.tsx:236-242`.

**Supabase SQL Editor BEGIN/COMMIT silent-failure.** The hosted SQL Editor wraps each statement in its own transaction; explicit `BEGIN`/`COMMIT` blocks silently fail or partially apply, especially with multiple statements. **Pattern:** paste statements without `BEGIN`/`COMMIT`, run each separately, OR use `psql` for atomic multi-statement migrations. Historical bite point — surface this if any SQL Editor work is requested.

**Reanimated 4.1.7 + babel plugin.** `babel-preset-expo` (now ~54.0.10) handles the Reanimated plugin configuration automatically when Reanimated 4 is installed. Don't manually add `react-native-reanimated/plugin` to `babel.config.js` — duplicate plugin registration causes silent worklet failures. Verified working at P.1-e (`SunSigil` component).

**AI SDK `consumeStream()` pattern for stream-abort.** When a client disconnects mid-stream, the server must call `consumeStream()` on the AI SDK response to continue draining the upstream LLM response. Without it, the server-side generation halts when the client disconnects, the cache is left empty, and the user-clicked-stop scenario fails to persist content. Pattern verified at B.0f-2-fix-2 (Approach C). The user-visible "Stop" button is now client-cosmetic only — the server always completes.

**PostgREST column-self-arithmetic limitation.** PostgREST's `.update({ col: 'col + 1' })` syntax doesn't exist; you can't atomically increment a column in a single REST call. **Forced pattern:** SQL function + RPC call. Quota decrement uses this — single `claim_oracle_quota(user_id)` RPC that performs check + decrement atomically with row lock. Pure PostgREST UPDATEs would race.

**Expo web is sanity check, NOT fidelity verification.** `npx expo start --web` renders a degraded view useful for catching gross logic bugs but NOT for visual/behavioral verification. Reanimated worklets degrade, gesture handlers behave differently, NativeWind output is browser-mode CSS. **Always verify on simulator/emulator/real device** for any UX-touching sub-round. Expo Go on iPhone is the canonical Phase A/B fidelity check.

**Clerk localization deep-merge.** When overriding Clerk's vendored locale (e.g., `bgBG`), keys are top-level on the object (not deeply nested under feature paths). Spread + override works for any leaf key: `{ ...bgBG, formFieldLabel__firstName: 'X' }`. Don't try to deep-merge `userProfile: { deletePage: { ... } }` patterns — the keys you typically need to override are flat. Verified at B.0g-1.

**Per-launch in-memory state pattern (vs AsyncStorage).** When you want state that clears on app re-launch (forced wizard re-fire, ephemeral session flags), use module-level `let` in a dedicated file (`apps/mobile/lib/onboarding/dismissState.ts`). JS context resets on app cold start; the boolean drops. Don't use AsyncStorage for this — AsyncStorage persists across launches by design. Pattern verified at B.0g-3.

**`useFocusEffect` vs `useEffect` for screen-mount fetches.** `useFocusEffect` fires on every screen focus (tab switch back to the screen, return from push). `useEffect` fires on mount only. Use `useFocusEffect` for "refetch on return" patterns (e.g., Днес `useFocusEffect` to pick up newly created chart after wizard-submit replaces the route).

**Expo Router `<Stack>` vs `<Slot>`.** `<Slot>` is a passthrough router with no header/animation. `<Stack>` adds native push animations and header bars. Converted at SR 7.6 for the Oracle route. If you need a header on a route nested under `(authed)`, the parent must be `<Stack>`.

**`isAuthenticated` / `isSignedIn` from Clerk needs `isLoaded` guard.** Returning `<Redirect>` before `isLoaded === true` causes a flash of the destination route on cold start. Always `if (!isLoaded) return null` first, then check `isSignedIn`. Pattern at `(authed)/_layout.tsx`.

**`expo-router` `usePathname()` returns the leaf route.** Useful for layout-level "am I in /wizard?" checks (B.0g-3 forced-wizard skip condition). String prefix matching works (`pathname.startsWith('/wizard')`).

---

## 7. Documentation files to reference at sub-round start

| File | Purpose | Status |
|---|---|---|
| `.planning/HANDOFF-CC-2026-05-12-EOD.md` (this file) | Session-handoff for fresh CC sessions | NEW — read first |
| `.planning/phases/phase-b-mobile-parity/HANDOFF-2026-05-09.md` | Phase B opening, two streams, strategic items, D1–D12 ratifications, sub-round chain | Authoritative for Phase B framing |
| `.planning/phases/phase-b-mobile-parity/MOBILE-WEB-PARITY-GAP.md` | Stream P single source of truth, surface-by-surface gap items with status | **KNOWN STALE per REVISIT-41** — section-by-section sweep happens at each Stream P sub-round close. Verify the relevant section before opening any P.x investigation pass. |
| `.planning/phases/phase-a-mobile-scaffold/REVISIT-TRIGGERS.md` | All REVISIT items with current trigger conditions; CLOSED markers preserve historical record | Authoritative; updated 2026-05-12 with B.0g closures + PRE-LAUNCH-POLISH-BATCH-INTENT |
| `.planning/phases/phase-a-mobile-scaffold/SUB-ROUND-{1..8}-CLOSE.md` | Phase A historical record | Frozen historical; cite for trail but do not treat claims as current state (per REVISIT-31 doc-debt sweep discipline) |
| `.planning/phases/phase-a-mobile-scaffold/HANDOFF-2026-05-08.md` | Phase A handoff snapshot | Frozen historical |
| `.planning/PHASE-A-CLOSE-RATIFICATION.md` | DELETED — content migrated into the Phase B handoff | Do not reference |
| `.planning/PROJECT.md` | High-level milestone framing (v0.1 web complete, v1.0 mobile-led launch in progress) | Authoritative |
| `.planning/ROADMAP.md` | Phase A historical + Phase B framing | Authoritative |
| `.planning/STATE.md` | Current position snapshot | Authoritative; verify currency at session start |
| `apps/web/lib/supabase/SECURITY-MODEL.md` | INTERNAL/USER_DATA/CATALOG classifications + server-side access pattern | Authoritative (updated at B.0e) |
| `apps/web/lib/manifest/PROMPT_VOICE.md` | Bulgarian editorial-voice reference for prompt strings | Authoritative |
| `.planning/research/MOBILE_UX_RESEARCH.md` | Mobile UX direction (5-tab + Oracle, Кръг = premium spine) | Authoritative |
| `.planning/research/DATA_FETCHING_INVENTORY.md` | Server-side data-fetch inventory | Updated 2026-05-09 at B.0e |
| `.planning/RENAME.md` | Celestia → Stellaeum rename status | Updated 2026-05-09 at B.0e |

**Stale-doc discipline (REVISIT-31):** when citing any `.planning/` doc claim as foundational for new work, verify the claim still holds against current code. Surface drift as a halt-trigger before proceeding.

---

## 8. Next action specifics — P.2 (Карта parity batch)

**Scope:** Section 2 items 2.1–2.7 in `MOBILE-WEB-PARITY-GAP.md`. **Carta tab parity port from web.** Heaviest component: `AstrologyReference` sub-component.

**Original LOC scope:** ~700 LOC (per Phase B handoff `:149`). Item 2.7 wheel arrival animation has D8 budget recalibrated to ~150–250 LOC; if it balloons further, surface via budget_overrun_discipline.

**Pre-flight fold-in: REVISIT-32 (mobile direct-anon Supabase usage audit).** 30–45 minute audit:
1. Grep `apps/mobile/` for `from('`, `createClient(`, and `useSupabaseClient`.
2. For each reach: confirm authentication path is one of (a) `accessToken()` callback with live Clerk session, (b) routes through an API endpoint, (c) anon for explicitly CATALOG tables (`bulgarian_cities`, `crystals`, `crystal_listings`, `crystal_vendors`).
3. Surface any direct anon read against an INTERNAL or USER_DATA table — those would be silently broken under B.0d lockdown.
4. **Halt-trigger:** if any silent-break is found, scope a fix into P.2 itself or surface as a separate halt before P.2 code begins.

**Pre-investigation discipline:**
- Read `MOBILE-WEB-PARITY-GAP.md` Section 2 (items 2.1–2.7) but treat the spec as KNOWN STALE per REVISIT-41 — verify each item's claim against current web + mobile state during investigation pass. Surface section drift at close per the REVISIT-41 institutionalized close-time sweep.
- Read the web Карта surface for ground-truth (`apps/web/app/(protected)/chart/page.tsx`, `apps/web/components/chart/*`).
- Check `MOBILE_UX_RESEARCH.md` for any Карта-specific UX direction.

**Founder's likely investigation prompt template (per session pattern):**

> P.2 — Карта parity batch. Investigation pass only, no code changes.
>
> 1. Sweep MOBILE-WEB-PARITY-GAP.md Section 2 (items 2.1–2.7) — items aged from 2026-05-09; treat as stale, verify each claim against current state.
> 2. REVISIT-32 pre-flight audit per ratified plan — grep `apps/mobile/` for direct Supabase usage, classify each by auth path, surface any INTERNAL/USER_DATA direct anon reads.
> 3. For each Section 2 item: status (done / partial / not-started), LOC estimate, web ground-truth file references, Bulgarian copy mirror vs net-new.
> 4. D8 wheel arrival animation budget — recalibrate if needed from ~150–250 baseline.
> 5. Sub-commit layering proposal (single atomic vs split).
> 6. Halt triggers + Bulgarian copy scope + TS green plan.
>
> Halt for ratification before any code lands.

**HALT EXPECTATION:** Do NOT fire P.2 until founder explicitly authorizes. Investigation pass first, founder ratification, then code. Speed-mode discipline preserved.

---

## 9. Verification protocol for next CC session

**Step 1 — Read this file first.** Before any other action in the new session, read `.planning/HANDOFF-CC-2026-05-12-EOD.md` (this file).

**Step 2 — Summarize back to founder.** Demonstrate understanding by stating in your own words:
1. **Security model** — INTERNAL/USER_DATA/CATALOG classifications, service role + manual filter pattern, B.0d lockdown active.
2. **Quota system** — 3/month free, monthly period, premium uncapped, horoscope exempt, regeneration exempt, Pattern B atomicity, Approach C stream-abort.
3. **Next action** — P.2 Карта parity batch, ~700 LOC, with REVISIT-32 folded into pre-flight.

**Step 3 — Reconcile.** If your summary doesn't match this file's contents (founder corrects you on any of the three), halt and re-read the relevant section before continuing. Do not fire P.2 until the reconciliation is clean.

**Step 4 — Memory pre-check.** Query the memory system (`MEMORY.md` + pointed files) for any session-relevant feedback entries. Especially:
- `feedback_develop_branch.md` — confirms active trunk is `mobile-parallel-test`
- `feedback_conservative_defaults_posture.md` — SDK posture
- `feedback_custom_build_after_library_debugging.md` — 2-3 fail-attempts rule
- `feedback_budget_overrun_discipline.md` — LOC overrun protocol

**Step 5 — Branch state verification.** Run `git status` and `git log --oneline -6`. Verify:
- Branch: `mobile-parallel-test`
- HEAD: `3d06e24` (B.0g close docs)
- Working tree drift matches Section 1 of this file. If new files appeared since EOD, surface them.

**Step 6 — Wait for founder authorization before firing P.2 investigation.**

---

*Document generated 2026-05-12 EOD at B.0g close + push. Authoritative for tomorrow's CC session opening. Single-shot reference.*
