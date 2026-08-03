# Premium Matrix Audit

**Commit under audit:** `deee4a6` on `mobile-parallel-test`
**Source of truth for "correct":** the corrected matrix in the §5 message:
- **Free:** natal chart (calc + render), transits, daily horoscope, lunar phase summary, crystals daily + streak (as the free-tier hook), oracle with rate-limit cap (TBD cap value)
- **Premium:** lunar diary, crystals full catalog / collection, personalized crystal recommendations and history, oracle beyond free cap, Кръг (deferred)

---

## Table

| # | Feature (user-facing surface) | Call path / gate location | Current gate | Correct gate | Fix needed |
|---:|---|---|---|---|---|
| 1 | Natal chart (calc + render) | `POST /api/chart/calculate` → `packages/core/src/charts/calculate.ts` + `/chart` page | none (any authed user) | free | **no** |
| 2 | Transits (daily sky + active transits panel) | `GET /api/transits/overview` → `packages/core/src/horoscope/transits.ts` (`subscription_tier !== 'premium'` → PREMIUM_REQUIRED) | **premium** | free | **yes** — strip premium gate from core `getTransitsOverview` and the route handler; also remove the "premium" link-disabled styling on `/rhythm` if any |
| 3 | Daily horoscope (streaming reading) | `POST /api/horoscope/generate` (no tier check; chart-ownership only) | free (any authed user) | free | **no** |
| 4 | Lunar phase summary | `GET /api/crystals/today` anonymous/free path returns `{ crystal, lunarPhase, streak:null, isPremium:false }` | free (and anon) | free | **no** |
| 5 | Crystal of the day (rotation display) | `GET /api/crystals/today`; dashboard + `/you/crystals` both pass initialData to `CrystalOfTheDayCard` | free (anon + free-tier both see the daily rotation) | free | **no** |
| 6 | Daily streak (auto-collect + rolling 60-day count) | Core `getCrystalOfTheDay`: premium branch auto-inserts into `user_daily_crystals` and computes `streak`; free branch returns `streak:null` | **premium-only** (free users never accumulate a streak) | free — per matrix this is the free-tier hook | **yes** — see **product-decision #1** below before code |
| 7 | Crystals full catalog view | `/you/crystals` page renders `CrystalCollectionContent` only if `isPremium && chartId`; free gets `<PremiumGate/>` block | premium | premium | **no** |
| 8 | Crystals collection (owned user_crystals) | Same as #7 — inside `CrystalCollectionContent` (gated at the page level) | premium | premium | **no** |
| 9 | Personalized crystal recommendations | `GET /api/crystals` → core `getCrystalsOverview` (premium-only), populates `recommendations[]` | premium | premium | **no** |
| 10 | Recommendation collect action | `POST /api/crystals/collect` → core `collectCrystalRecommendation` (premium gate + collectRecommendation) | premium | premium | **no** |
| 11 | Recommendation history | Part of `/api/crystals` payload (`recommendations[]` includes historical uncollected recs within window) | premium | premium | **no** |
| 12 | Manual daily-crystal collect | `POST /api/crystals/daily/collect` → core `collectDailyCrystal` (premium gate) | premium | **product-decision #1** — if daily streak becomes free (item #6), this should move to free too so the UI's Collect button works for the free-tier streak hook | **depends on #1** |
| 13 | Lunar diary (three-line journal) | `/rhythm/journal/page.tsx` renders `<ManifestDiaryContent/>`; entries stored in browser `localStorage` via `hooks/useManifestEntries.ts`; no server endpoint, no auth-layer gate, no UI-layer tier gate | **none / any authed user** | premium — **but only after server-side persistence ships (M4/M5 predecessor)** | **deferred** — decision 2026-04-20: no UI-only gate now. Cosmetic gates train power users to bypass and are worse than no gate. Diary stays open to all authed users until localStorage is replaced by a real endpoint that can enforce the gate server-side. Canonical render site consolidates to `/rhythm/journal` in a separate commit. |
| 14 | Oracle (AI reading, topic: general) | `POST /api/oracle/generate` — topic `general` is allowed for any authed user; no cap | free (topic-based) | free (cap-based, TBD) | **yes — policy mismatch** — current impl gates by *topic*; matrix calls for gating by *message cap*. Surface as **product-decision #2** before code |
| 15 | Oracle (AI reading, topics: love, career, health) | `POST /api/oracle/generate` — non-`general` topics return 403 PREMIUM_REQUIRED for free | **premium-only** | should be free-under-cap / premium-unlimited per matrix, topic-independent | **yes — same as #14** — current topic-gate is the wrong shape |
| 16 | Oracle teaser (preview text for a reading topic) | `POST /api/oracle/teaser` — no tier check | free (any authed user) | free | **no** — consistent with "teaser is a free preview" |
| 17 | Oracle past readings | `GET /api/oracle/readings` — no tier check | free (any authed user sees their own readings) | free (if they have readings; cap still applies on creation) | **no** |
| 18 | Stripe checkout / portal / cancel / status / subscription overview | auth-gated; no tier gate (free users need to reach checkout to become premium) | free (any authed user) | free | **no** |
| 19 | Кръг (people graph, synastry) | `/circle` page exists as a placeholder (Phase B) | middleware-protected after §1 widen; no content to gate yet | premium (deferred) | **no (deferred)** |
| 20 | `/pricing` (tier comparison page) | `/pricing` page reads tier to style the "current plan" badge | public per §1 explicit intent | public (marketing) | **no** |

---

## Product decisions to surface before code

### Product-decision #1 — free-tier daily streak behavior

The matrix says "crystals daily streak" is free (the free-tier hook). The current implementation in `packages/core/src/crystals/today.ts` and the wrapping page behavior:

- Free/anon user hits `/api/crystals/today` → sees today's rotation crystal + lunar phase, **no streak, no history, no collection record**.
- Premium user → auto-collects into `user_daily_crystals`, returns a 60-day rolling streak count.

For the streak to be the free-tier hook that brings users back, free users need some form of streak tracking. Options:

- **1a (simple, my recommendation):** Auto-collect + 60-day streak for any authed user (free and premium alike). Premium keeps the same computed streak plus the existing premium-exclusive auto-collect *with FK to the specific crystal shown* for the collection-view overlay. Mechanically: drop the `isPremium` guard on the auto-collect + streak block in `getCrystalOfTheDay`. Free users now get `streak !== null`.
- **1b (restrictive):** Free users see the streak number but cannot manually re-collect via `POST /api/crystals/daily/collect` (the manual button). If auto-collect happens server-side on read, the manual button becomes redundant anyway — #1b collapses into #1a in practice.
- **1c (most restrictive):** Free users see the daily rotation + phase but no streak UI element at all; streak remains premium. This contradicts the matrix ("streak as the free-tier hook"), so only an option if the matrix flips.

**Related user-facing question:** where is the free-tier streak *displayed*? Today `/you/crystals` hides the collection behind `<PremiumGate/>` but shows `CrystalOfTheDayCard` (which receives `streak` from the Server Component prop) to everyone. If free users start accumulating a streak under #1a, the card will naturally show it without additional UI work — the `streak !== null` branch already exists in the component.

**Decision I need before touching code:** confirm #1a.

### Product-decision #2 — oracle gating shape

Matrix: "oracle with rate-limit cap (TBD cap value), premium removes cap."
Current code: topic-based gate — `general` is free, `love`/`career`/`health` are premium. No cap.

Moving from topic-gate to cap-gate is a real semantic change, not a copy edit:

- Requires choosing a cap dimension (per day? per lifetime? per chart-topic pair?) and a value (3/day? 5/week? TBD per matrix).
- Requires a counter table or a count query against `ai_readings`.
- Changes the premium upsell trigger from "click a premium topic" to "hit the cap on any topic."
- The teaser flow (already no tier gate) becomes the standard "try a premium topic for free" path — aligned.

**Decision I need before touching code:** (a) confirm the move from topic-gate to cap-gate, (b) the cap dimension + value (or confirm "TBD, defer cap logic — for now: unlimited for premium, hard-stop at ~3 messages/day for free" as a provisional rule).

### Product-decision #3 — diary gate placement

**Resolved 2026-04-20:** option 3b — no UI-only gate. The diary stays open to all authed users until server-side persistence ships (flagged as an M4/M5 predecessor in `DATA_FETCHING_INVENTORY.md §3.3` and §7.2). Rationale: cosmetic gates train power users to bypass — worse than no gate. Ship the premium gate when there is an actual server endpoint to enforce it on.

Consequence for this audit: diary is **not** in the §4/§5 fix set. The `/rhythm` → `/rhythm/journal` consolidation (product-decision #4) still ships in a separate commit because it is a UX fix, not a tier-gate fix.

Prior option-3a drafted below for historical reference, not implemented:
- ~~**3a (UI-only gate, cheap):** Wrap `<ManifestDiaryContent/>` in a `<PremiumGate/>` for free users.~~ **Rejected** — see rationale above.

### Product-decision #4 — diary canonical location

Currently diary content renders on both `/rhythm` (embedded as a section on that page) and `/rhythm/journal` (standalone page). User's §8 feedback notes that a nav link appears to lead to a non-existent location. Before I consolidate routes under §8, confirm: is the canonical diary URL `/rhythm/journal`? If yes, `/rhythm` should stop embedding `<ManifestDiaryContent/>` and just link to `/rhythm/journal` for the diary surface. If no, name the canonical path. This also decides where the premium gate from #3a goes (both render sites must be gated until the duplicate is removed).

---

## Summary counts

- **20 user-facing features mapped.**
- **15 already gated correctly** (or intentionally deferred for Кръг).
- **2 real gate bugs** — transits (premium → free) + diary (none → premium).
- **1 streak-shape bug** — free users never accumulate a streak; fix depends on product-decision #1.
- **1 policy-shape mismatch** — oracle topic-gate vs cap-gate; depends on product-decision #2.

## Resolved decisions (2026-04-20 sign-off)

1. **#1a — daily streak free for all authed users.** Shipped in `cb54ede`.
2. **#2 — oracle cap-gate.** Shape: replace topic-gate with daily message cap. Cap dimension: **Europe/Sofia calendar day** (not rolling 24h). Cap value: **`ORACLE_FREE_MESSAGES_PER_DAY=3`** free, unlimited premium. Value lives in env/named const so later changes are one-line.
3. **#3 — diary gate deferred** — no UI-only gate; ship the premium gate with server-side persistence (M4/M5). Documented above.
4. **#4 — canonical diary URL = `/rhythm/journal`.** `/rhythm` stops embedding `<ManifestDiaryContent/>` inline. URL-shape question (should `/diary` or `/journal` at top level replace the buried `/rhythm/journal`?) flagged for a later design pass, non-blocking.

## Fix order (§4 + §5 combined, each its own commit)

Already landed:
- `635f1a4` — **fix(api): bulgarian 401 on five user-scoped endpoints**
- `956e044` — **fix(api): replace auth.protect() with explicit 401 in stripe/subscription and user**
- `da69a9e` — **fix(api): transits premium-gate removal**
- `cb54ede` — **feat(crystals): daily streak available to all authed users per premium matrix**

Remaining:
- **refactor(diary): defer premium gate until server-side persistence lands** — this commit (docs-only; PREMIUM_MATRIX.md + DATA_FETCHING_INVENTORY.md)
- **refactor(pages): /rhythm/journal canonical, remove /rhythm inline diary embed**
- **refactor(oracle): topic-gate → cap-gate, provisional 3/day free cap**

Then §6 harness update.
