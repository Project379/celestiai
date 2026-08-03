# Phase A Sub-Round 2 — First Real Data Fetch Close Summary

**Opened:** 2026-05-03 (after sub-round 1.7 close ratification).
**Closed:** 2026-05-03 (sub-round 2.5 founder verification ratified after three fix commits).
**Outcome:** Mobile renders Crystal of the Day on Днес tab with real Clerk-authenticated data fetched through the web API and validated against the shared `@celestia/core/crystals/schemas` Zod schema. Foundation pieces — API client with JWT injection, render-loop-safe hook pattern, ESLint subpath enforcement, web-vocabulary mirror discipline — established for sub-round 3+ to consume.

---

## Commit trail — 8 total commits

### Implementation commits (4)

| Sub-round | Commit | What |
|---|---|---|
| 2.1 | `312d9fd` | `feat(mobile): phase-a sub-round 2.1 — API client foundation` |
| 2.2 | `ff03d28` | `feat(mobile): phase-a sub-round 2.2 — useCrystalOfTheDay hook` |
| 2.3 | `debd870` | `feat(mobile): phase-a sub-round 2.3 — CrystalCard + Днес integration` |
| 2.4 | `bd3a60e` | `feat(mobile): phase-a sub-round 2.4 — Bulgarian copy calibration on CrystalCard` |

### Sub-round 2.5 fix commits (3)

Founder verification surfaced three issues batched at sub-round close per the time-efficient workflow.

| Commit | What |
|---|---|
| `057bb4c` | `fix(mobile): phase-a sub-round 2.5-fix-1 — render loop in useApiClient (unstable getToken ref)` |
| `4cf07d7` | `fix(mobile): phase-a sub-round 2.5-fix-2 — mirror web vocabulary on Crystal tile (drop streak, «за {phase}» format, label alignment)` |
| `5b6630e` | `fix(mobile): phase-a sub-round 2.5-fix-3 — mirror web Crystal tile (tagline as secondary)` |

### Documentation commit (1)

`docs(mobile): phase-a sub-round 2 close — SUB-ROUND-2-CLOSE summary` — bundles this summary and the sub-round-2 close trail in a single atomic commit. This is the commit you are reading the summary of.

---

## What shipped — feature surface

### API client foundation (2.1)

`apps/mobile/lib/api/client.ts` — `useApiClient()` returns a fetch wrapper bound to the current Clerk session. Request signed with `Authorization: Bearer <token>` from `useAuth().getToken()` (read lazily via `getTokenRef.current` after 2.5-fix-1 render-loop fix). `ApiError` class with typed `status` + `body` for caller branching. Returns `unknown` typed JSON; consumers Zod-parse before use.

`apps/mobile/eslint.config.js` — `no-restricted-imports` rule blocking barrel `@celestia/core` imports. Subpath imports (e.g. `@celestia/core/crystals/schemas`) remain allowed. Catches the bundle-pollution mistake (sweph as native dep) at lint time rather than runtime with cryptic Metro errors.

### useCrystalOfTheDay hook (2.2)

`apps/mobile/hooks/useCrystalOfTheDay.ts` — first mobile-side data hook. Calls `useApiClient()`, fetches `GET /api/crystals/today`, validates response with `CrystalOfTheDayResponseSchema` from `@celestia/core/crystals/schemas`, exposes `{ data, isLoading, error, refetch }`.

Stale-while-revalidate semantics: previous data stays visible during refetch even if refetch errors. Defensive guard skips fetch if `!isLoaded || !isSignedIn`. Naming follows web's hooks/ convention (`isLoading`, `refetch`, etc.) — future-proof if mobile adopts SWR or TanStack Query later.

`apps/mobile/package.json` — added `@celestia/core` as workspace dep (was missing; first attempt at the import surfaced the gap).

### CrystalCard component + Днес integration (2.3 + fix-2 + fix-3)

`apps/mobile/components/CrystalCard.tsx` — first real-data UI on mobile. Renders six possible states explicitly (loading-no-data, error-no-data, defensive empty, data-only, data-with-error-glyph, data-during-refetch). Tile shape matches the existing bento siblings (`flex-1 min-w-[46%] rounded-2xl border border-violet-celestia/25 px-4 py-5`). Bulgarian primary with English fallback for both name and tagline.

After 2.5-fix-2 + fix-3, the rendered tile mirrors web exactly:
- **Label**: «Кристал за днес» (Cinzel uppercase, mirrors web tile)
- **Primary**: `crystal.name_bg ?? crystal.name_en`
- **Secondary**: `crystal.tagline_bg ?? crystal.tagline_en` (e.g. «Всички цветове наведнъж» for Опал)
- **Streak dropped from tile** (mirrors web tile's choice; streak metadata lives on dedicated streak surfaces, not bento tiles)
- **Phase dropped from tile** (web tile renders tagline, not phase)

`apps/mobile/app/(authed)/(tabs)/index.tsx` — bento `.map()` rewritten as 4 explicit tile elements: `<CrystalCard />` + 3 inline `<View>` blocks for the still-hardcoded Лунна фаза / Транзит / Кръг tiles. Tile shape constants extracted (`TILE_CLASS`, `TILE_LABEL_CLASS`, `TILE_HINT_CLASS`) for inline tiles. `BentoTile` component extraction deliberately deferred until a second dynamic tile arrives.

### Bulgarian copy calibration (2.4 + fix-2 + fix-3)

Sub-round 2.4 invoked `bulgarian-skill` for native-speaker calibration on first-pass copy. Two changes shipped initially:
- Error: «Не успях» → «Не се получи» (impersonal-reflexive, avoids anthropomorphizing the app)
- Streak template: `ден N` → `серия N` (gamification register; consistency with hardcoded mobile footer)

Founder verification surfaced that the streak phrasing read structurally weird in rendered context («Намаляваща луна · серия 1»). Sub-rounds 2.5-fix-2 and 2.5-fix-3 corrected this by introducing the **web-mirror discipline** (see "Workflow discipline" section below): rather than re-deriving copy via skill, mirror web's existing production Bulgarian vocabulary as source-of-truth. Streak dropped from the tile entirely (mirrors web tile's choice); secondary line replaced with crystal tagline (web tile's actual content).

«Не се получи» / «Зареждане» / «—» kept — these are mobile-specific tile states with no web equivalent (web prefetches data on the server, no tile-level loading/error UI). Bulgarian-skill calibration discipline still applies to these mobile-specific surfaces.

---

## Sub-round 2.5 verification matrix — founder execution results

Founder ran the matrix on real iPhone via Expo Go on 2026-05-03.

| Phase | Result |
|---|---|
| A1–A4 (end-to-end fetch on Днес tab) | **PASS** — Crystal tile renders Bulgarian copy with real day's data |
| B1–B2 (Pattern A vs B JWT verification) | **DEFERRED** to sub-round 3 — masked by render loop during initial verification; Vercel logs were too spammy to read JWT path. Will surface naturally when next data flow lands and renders the path cleanly. |
| C1–C3 (loading + error states) | **DEFERRED** to sub-round 3 — masked by render loop. Loading state visibility on slow fetch + error state on dead API will smoke-test naturally during sub-round 3 work. |
| D1–D2 (auto-collect side effect) | **PASS** — `user_daily_crystals` row created on first mount, idempotent on re-mount |
| E1–E4 (sub-round 1 regression check) | **PASS** — sign-out / sign-in / Излез styling / 1.4d Bulgarian copy all intact |
| F1–F3 (cross-cutting) | **PASS** — typecheck + ESLint green; no AsyncStorage warnings |

Three observations became 2.5-fix commits:

1. **Render loop in useApiClient** — `@clerk/expo`'s `useAuth().getToken` returns a new function reference every render; `useCallback([getToken])` keyed on the unstable reference, cascading through `apiFetch → refetch → useEffect` into infinite re-fetches. Fix: ref-current pattern (`useRef + .current` accessor + empty-deps `useCallback`). Pattern scales to all future hooks (2.5-fix-1).

2. **Bulgarian streak phrasing register-mismatch** — initial recalibration via skill led to web-mirror discipline change (see below) and restructure of tile (drop streak entirely, mirror web's «Кристал за днес» label, use «за {phase}» format). Subsequently revised again when founder eye-checked web tile in browser (2.5-fix-2 + 2.5-fix-3).

3. **Web tile renders tagline, not phase** — founder browser eye-check surfaced that web Crystal tile's secondary line is the crystal tagline, not the lunar phase. Mobile updated to mirror exactly (2.5-fix-3).

---

## Workflow discipline change established this sub-round

Sub-round 2.5 surfaced that bulgarian-skill calibration in isolation can produce locally-correct copy that drifts from web's actual production rendering. The drift compounded: the hardcoded mobile streak footer «· серия 12 ·» (placeholder text) misled the 2.4 calibration toward «серия N» — neither web tile nor web full-card uses that vocabulary.

**Going-forward discipline (ratified sub-round 2.5):**

1. **For shared mobile/web data surfaces** — mobile mirrors web's existing production Bulgarian copy as source-of-truth. Founder provides web's actual rendered content directly (browser eye-check); Claude Code implements without multi-cycle skill investigation. Adaptation allowed where mobile constraints differ (tile width, layout density) — adapt structure, not vocabulary.

2. **For mobile-only surfaces with no web equivalent** — bulgarian-skill calibration discipline preserved. Sign-in / sign-up / verify / two-factor screens retain their 1.4d calibrations. Tile-level loading/error states (mobile-specific because web prefetches on server) calibrate via skill.

3. **Don't treat hardcoded mobile placeholders as canonical Bulgarian copy.** The sub-round 2 «· серия 12 ·» drift cost three calibration round-trips before the right answer surfaced via founder ground-truth.

4. **Time-box per sub-round** — ~2-4 hours focused execution. Polish lands as a separate sub-round when needed rather than expanding sub-round scope.

---

## REVISIT-TRIGGERS additions

| # | Item | Status |
|---|---|---|
| 8 | Hardcoded mobile streak footer drift from web vocabulary | Logged. Trigger: when streak footer becomes data-driven. Align mobile rendering to web's «1 ден» / «{N} поредни дни» format with proper Bulgarian count-form handling. |

Items 1–7 unchanged from sub-round 1 close.

---

## What's deferred and where

| Item | Deferred to | Why | Tracker |
|---|---|---|---|
| Pattern A vs B JWT verification | Sub-round 3 | Render loop masked Vercel logs during 2.5 verification; cleaner natural surface in sub-round 3 | Carried in 2.5 verification matrix |
| Tile-level loading state visibility check | Sub-round 3 | Same render-loop masking; will surface on first slow-fetch path | Carried in 2.5 verification matrix |
| Tile-level error state visibility check | Sub-round 3 | Same | Carried in 2.5 verification matrix |
| TanStack Query install | Sub-round 2.x or 3 | Lands when 2+ coordinated fetches arrive (deferred from sub-round 2 ratification) | Sub-round plan |
| Hardcoded mobile streak footer alignment | When footer becomes dynamic | Out of scope for 2.5; placeholder still hardcoded | REVISIT item 8 |
| Bulgarian error-msg placement (M5 predecessor) | Before first write/submit endpoint | Smallest-scope sub-round 2 was read-only; predecessor not yet binding | DATA_FETCHING_INVENTORY §7.2 |
| Per-field error-detail rendering contract (M5 predecessor) | Before first write/submit endpoint | Same | DATA_FETCHING_INVENTORY §7.2 |
| Vercel preview/production deployment as stable URL | Sub-round 2 close or sub-round 3 | LAN dependency for now; toggle pattern in `.env.local` works | Founder backlog |
| Router AP isolation fix for home WiFi | Sub-round 2 close or sub-round 3 | Hotspot is the immediate working path; home WiFi requires router config | Founder backlog |
| `.env.local` Supabase prefix bug (`NEXT_PUBLIC_*` → `EXPO_PUBLIC_*`) | When mobile Supabase client first invoked | Latent bug from 1.5; not blocking sub-round 2 (Crystal flow goes through web API, not mobile Supabase) | Surfaced in 2.1 commit body |

---

## Disciplines applied

- **Investigation-before-code on every sub-round** — file reads, type lookups, primary-source verification before proposing implementation. Advisor consulted at high-uncertainty crossings.
- **Founder ratification before code lands** — every sub-round commit surfaced as proposal + decision points, founder-approved before files were written. Time-efficient mode preserved this discipline; only verification was batched.
- **Atomic commits per deliverable** — each sub-round = one commit. 2.5 fix commits each isolated to one logical change (render loop / vocabulary mirror / tagline mirror).
- **Typecheck + lint green per commit** — both ran from the correct workspace directory before every commit. No commit shipped with type or lint errors.
- **Conservative-defaults posture preserved** — Pattern A template-first-with-fallback for Supabase JWT (works in both A and B configurations); subpath ESLint rule before bundle pollution can land; web-vocabulary mirror over re-derivation.
- **Self-flagged uncertainty surfaced** — confidence levels on every Bulgarian calibration (95% on initial, 80% on recalibrations, 90% on web-mirror); founder native-speaker calls overrode skill confidence when they conflicted (Crystal `name_bg ?? name_en` fallback ratified-then-revised).
- **Web-mirror discipline** — established this sub-round; documented in REVISIT-TRIGGERS item 8 and this close summary for sub-round 3+ application.

---

## Sub-round 2 → next handoff

**Foundation paid down:**
- API client with JWT injection + ApiError + render-loop-safe ref-current pattern
- First Zod-validated mobile data hook (`useCrystalOfTheDay`)
- ESLint subpath rule for `@celestia/core` imports
- `@celestia/core` workspace dep declared in mobile
- Web-vocabulary mirror discipline ratified

**Crystal of the Day end-to-end:** sign-in → Днес tab → `useCrystalOfTheDay` → `useApiClient` → JWT-signed `GET /api/crystals/today` → `getCrystalOfTheDay` (web/core) → Supabase → response → Zod parse → `<CrystalCard />` render. First real-data path on mobile.

**Sub-round 2.5 entry conditions met:**
- All sub-round 2 ratifications closed
- Verification matrix executed and PASSED with documented deferrals (Pattern A vs B JWT + loading/error visibility deferred to sub-round 3 natural surface)
- 2.5-fix commits landed and self-consistent
- REVISIT-TRIGGERS item 8 logged

**Next queue per founder direction:**
1. **Rename sub-round** (Celestia → Stellaeum) — dedicated scope, opens after this close ratifies and branch pushes
2. **Sub-round 3** — next product feature work; expected scope per workflow discipline + DATA_FETCHING_INVENTORY:
   - 2nd coordinated mobile fetch (TanStack Query install becomes worthwhile here)
   - Pattern A vs B JWT verification on cleaner natural surface
   - First mobile-side write/submit endpoint candidates would trigger M5-predecessor decisions

---

## Branch state at close

`mobile-parallel-test` at the close commit — **30 unpushed commits** ahead of last push (`fcb646f` from §8.9 close, 22 from sub-round 1 close + 8 from sub-round 2 close). Push held for explicit founder command per sub-round 2 close ratification (matching sub-round 1 pattern). Founder pushes when ready; rename sub-round opens in the next session.
