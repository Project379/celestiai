---
title: Free / Premium tier definition — FROZEN 2026-09-01
status: FROZEN definition + implementation-gap report + implementation log. See "Amendments" and "Implementation status" below.
created: 2026-09-01
supersedes: .planning/phases/m3-uat/PREMIUM_MATRIX.md (2026-04-20) where they conflict — see §9
tagging: every factual claim about current code is VERIFIED (read/ran this session) or INFERRED (from a dated doc not re-checked)
---

# Free / Premium tier definition — frozen

## Amendments (founder ruling, 2026-09-01, applied)

1. **Днес "deeper transit detail" — REMOVED from premium.** No depth
   dimension exists and none is being built. Днес stays **fully free**.
2. **Ритъм "transit correlation across journal entries" — REMOVED from
   premium, deferred post-launch.** Not built. Logged in
   `.planning/POST_LAUNCH_UPGRADES.md`. Ритъм stays **fully free**.
3. **Crystals streak and the `/rhythm` transit card stay FREE** — both
   shipped free on 2026-04-20 (`cb54ede`, `da69a9e`); the earlier draft
   definition's move to re-gate them is withdrawn. Not touched.
4. **Premium is therefore exactly four things:** Oracle depth (love /
   career / health + regenerate + 300/mo), Кръг (compatibility readings +
   unlimited saved profiles), crystal collecting (manual collect +
   personalised recommendations + history), and full Recommendations.

## The frozen definition (as amended)

**FREE (permanent):**

| Feature | Free allowance |
|---|---|
| Natal chart | Full, unrestricted |
| Днес (daily horoscope) | Every day, unlimited — no AI cap |
| Oracle | ONE reading, `general` topic, **lifetime** (not per month) |
| Кръг | One saved profile; **no** compatibility reading |
| Moon | Full |
| Ритъм (journal) | Full — unlimited entries, no premium layer |
| Crystals | Daily crystal + streak; collection grid visible with **locked slots** |
| Recommendations | One visible; rest visible and locked |
| Guide | Full |
| `/rhythm` transit card | Full |

**PREMIUM (€6.99/mo, €59.99/yr) — exactly four things:**

| Feature | Premium |
|---|---|
| Oracle | All four topics; regenerate; 300 / month |
| Кръг | Unlimited saved profiles + compatibility readings |
| Crystals | Manual collecting, personalised recommendations, history |
| Recommendations | All |

**Principle:** every feature is VISIBLE to free users. Locked content renders
as locked, never hidden. No empty states where a paid feature would be.

---

## Implementation status (2026-09-01)

Priority order from the founder's directive. VERIFIED = code written and
the gate/test suite run green this session.

| # | Item | Status |
|---|---|---|
| 1 | **Split the AI counter** — Днес off `subscription_quotas`, its own unlimited-for-free path | **DONE** (VERIFIED). `apps/web/app/api/horoscope/generate/route.ts` no longer imports or calls any quota helper. Structural ceiling documented in the route header (5/min burst + `UNIQUE(chart_id,date)` = 1/chart/day + 20-chart cap). `quota.ts` doc comments updated. Test `test/horoscope/generate-quota-gate.test.ts` inverted to assert "not consumed"; `generate-upstream-failure.test.ts` refund assertion dropped. |
| 2 | **Lifetime Oracle counter** — `users.free_oracle_used_at` | **CODE DONE, MIGRATION NOT APPLIED** (VERIFIED code; migration is founder action — see §10). Migration `supabase/migrations/20260901120000_free_oracle_used_at.sql` written, **not run**. Helper `apps/web/lib/subscriptions/free-oracle.ts` claims/releases the marker and tolerates the column being absent (dark-launch: enforcement starts when the column exists). Oracle route free branch uses it. |
| 3 | **Oracle topic gating** — `love`/`career`/`health` premium, at the route AND the UI | **DONE** (VERIFIED). Route: free + non-`general` → 429 `CAP_REACHED` / `reason: premium_topic`, before any claim or generation. Free regenerate → `reason: premium_regenerate`. UI: `TopicCards` (web + mobile) render the padlock for the three topics when not premium (tap still hits the route — the route is the gate). Tests in `test/oracle/tier-gates.test.ts` + `generate-quota-bypass.test.ts`, proved red against the pre-change route. |
| 4 | **Recommendations gating** — one visible, rest locked | **NOT DONE** — see §11. Scoped, not built. |
| 5 | **Locked-state consistency** — one shared component across all locations | **PARTIAL** — the Oracle surfaces (topic padlock, conversion notice) are done and consistent between web and mobile. The other ~7 non-Oracle surfaces (crystals grid, Кръг, recommendations) and the single shared component are **NOT DONE** — see §11. |
| 6 | **Conversion surface** — fix copy, add CTA, reach it from a locked-topic tap | **DONE for Oracle** (VERIFIED). `CapReachedNotice` (web + mobile) reworded per `reason`; lifetime wording replaces "this month / next month". Web has a **"Разгледай Премиум" → `/pricing`** CTA. Mobile has **no CTA button** — blocked on the RevenueCat native paywall (documented in the component). A locked-topic tap and a spent free reading both route here. |
| 7 | **Reversal / existing-access report** | **DONE** — see §9 (rewritten) and §12 (live-data check). |

---

# 1. Is Днес per-chart or per-sign?

**VERIFIED: Днес is generated per-chart, from the user's own transits.** It is
not a generic per-sign horoscope.

Traced through `apps/web/app/api/horoscope/generate/route.ts` and
`apps/web/lib/horoscope/transit-to-prompt.ts`:

- The route loads that user's `chart_calculations` row (their natal planet
  positions, house cusps, aspects).
- It computes `calculateTransitAspects(today's transiting planets, THIS
  user's natal positions)` — aspects between today's sky and the user's own
  chart.
- It builds a `transitOverview` from the user's calculation
  (`buildTransitOverview(calculation, today)`).
- `transitAndNatalToPromptText` serialises transiting planets **plus the
  user's natal chart plus the natal-to-transit aspects** into the prompt.

So the reading is genuinely personalised to the birth chart, same as the
Oracle. Two people born under the same Sun sign get different Днес readings.

**What this means for the tier line — "deeper transit detail" for premium is
feasible but has nothing to build on yet:**

- There is exactly **one** horoscope prompt (`buildDailyHoroscopePrompt()`,
  takes no arguments) and one output format (a short 3-line reading — the
  ground-truth audit measured 400–550 characters). There is no "depth"
  dimension in the code today. INFERRED from the ground-truth audit + the
  single no-arg prompt builder.
- The standalone transit view (`GET /api/transits/overview`, rendered as
  `TransitOverviewCard` on `/rhythm`) is **deliberately free** — the premium
  gate was removed on 2026-04-20 (commit `da69a9e`, `packages/core/src/
  horoscope/transits.ts` states "Transits are FREE per the premium matrix").
  VERIFIED. If "deeper transit detail" means re-gating that card, it
  reverses a shipped, documented decision — flag before doing it.
- Net effect: "deeper transit detail" is **net-new** — it needs a second
  prompt/format variant for premium (or a premium-only expanded section on
  the Днес screen), plus a tier read in the horoscope route. It is not a
  matter of unlocking something that exists.

> **AMENDED 2026-09-01:** "Днес deeper transit detail" is **removed from
> premium**. Днес is fully free. The `/rhythm` transit card stays free
> (its 2026-04-20 gate removal is not reversed). Nothing in this section
> is being built.

---

# 2. How many crystals are in the catalog?

**VERIFIED: 30.** The catalog lives as 30 rows in the `crystals` table
(Supabase). The canonical reference is `supabase/seed/crystals.ts` — its
header comment states "Crystal seed catalog (30 stones)" and "already loaded
into production (crystals table, 30 rows)", and the array has 30 entries.

`packages/core/src/crystals/` holds the *logic* (recommendation matching,
overview assembly, collect/daily-collect, queries) — **not** the catalog
data. The data is DB rows; no runtime code imports the seed file.

Coverage (from the seed file): all 12 zodiac signs, all 10 planets, all 8
lunar phases, so the recommender can always find a match. Rarity tiers exist
(`common` / `uncommon` / `rare` / `legendary`).

---

# 3. Does "transit correlation across journal entries" exist?

> **AMENDED 2026-09-01:** journal transit correlation is **removed from
> premium and deferred post-launch**. Not built. Logged in
> `.planning/POST_LAUNCH_UPGRADES.md`. Ритъм stays fully free. The
> analysis below is retained as the scoping record for whenever it is
> picked up.

**VERIFIED: No. It does not exist in any form. It is entirely net-new.**

- Grep across `apps/` and `packages/core` for "correlat", "transit ... journal",
  "entry ... transit" returns nothing in feature code.
- The journal entry shape (`packages/core/src/diary/types.ts`,
  `ManifestEntry`) stores only: `id`, `date`, `phaseId` (lunar phase),
  `phaseName`, `intentions` (three strings), `createdAt`, `updatedAt`.
  **No transit or planetary data is captured per entry**, so there is not
  even latent data to correlate after the fact.
- The Ритъм feature today is: create/edit/delete three-line intention
  entries tied to the moon phase, a history view, and a Markdown export.
  Nothing analytical is applied to the set of entries.

**Rough estimate to build it (INFERRED — depends heavily on product design,
which does not exist):**

- **Data capture** — at entry-write time, compute and store the active
  transits for that date against the user's natal chart (reuse
  `buildTransitOverview` / `calculateTransitAspects`, already server-side).
  New JSONB column on the diary table or a sibling table; a migration.
  ~0.5–1 day.
- **Backfill** — existing entries have no transit snapshot; compute
  retroactively from stored `date` + the user's chart. ~0.5 day (small
  data volumes).
- **The correlation itself** — this is the undefined part. "Correlation"
  could mean: group entries by the transit that was active, surface
  recurring themes ("you tend to write about endings under Saturn
  transits"), or a timeline overlay. Anything AI-assisted here also drags
  in the content-safety and cost questions from the system map. A
  deterministic version (bucket entries by active transit, show counts and
  the entry text) is ~2–3 days. An AI-summarised version is ~1 week plus a
  prompt, plus it feeds user-written free text to the LLM for the first
  time anywhere in the app — a new privacy and safety surface.
- **UI** — a premium-only section on the Ритъм screen, both platforms,
  with a locked-state treatment for free. ~2–3 days.
- **Total: ~1.5–2.5 weeks** for a deterministic version; more with AI.
  Design must come first — there is no spec.

This is the single largest new build in the frozen definition.

---

# 4. Current gating implementation, feature by feature

**Where tier lives:** `users.subscription_tier` — a text column, `'free'` or
`'premium'` (default `'free'`). Read two ways:

- `getSubscriptionTier(userId)` in `packages/core/src/subscription/tier.ts`
  — pure DB lookup, returns `'free'` on any error or missing row.
- `ensureUserRecord(clerkId)` in `apps/web/lib/users/ensure-user.ts` —
  returns the full `AppUser` (tier, status, provider, Stripe IDs, deletion
  flags). Used by the quota-gated routes.

**How AI quota is enforced:** `subscription_quotas` table, primary key
`(user_id, period_start)` — one row per user per calendar month. Columns
`ai_readings_used` / `ai_readings_limit`. Atomic Postgres RPCs
`increment_quota_if_available` (claim before generation) and
`decrement_quota_usage` (refund on failure). `FREE_MONTHLY_LIMIT = 3`,
`PREMIUM_MONTHLY_LIMIT = 300`, both in `apps/web/lib/subscriptions/quota.ts`.
**The same monthly counter is shared by Oracle generation AND on-demand
Днес generation** (VERIFIED — both routes call `checkQuotaAvailable` /
`incrementQuotaUsage`).

| Frozen rule | Current implementation | State |
|---|---|---|
| **Natal chart — full for free** | No tier check anywhere on `POST /api/chart/calculate` or `/chart`. Chart creation caps at 20 charts/user (abuse cap, not a tier gate). | **Implemented** (VERIFIED) |
| **Днес — every day for free** | `POST /api/horoscope/generate` has **no tier check** — but it consumes the shared `FREE_MONTHLY_LIMIT = 3` monthly AI quota. The Днес screen auto-fires this route on open for the current day (`useDailyHoroscope`, SWR). The `daily_horoscopes` cache makes re-views of the *same* day free, but each **new day** is a fresh generation needing a quota slot. The `daily-horoscope` cron sends only a generic push — it does **not** pre-generate content. | **BROKEN against the frozen rule** (VERIFIED). A free user gets a personalised Днес on at most 3 distinct days per month (fewer if they also use Oracle), then hits the cap. |
| **Днес — deeper transit detail for premium** | No depth dimension exists — one no-arg prompt, one short format. | **Absent / net-new** (see §1) |
| **Oracle — 1 general reading, lifetime, for free** | Gated by the **monthly** shared cap (3/month, shared with Днес). Topic is **not** gated — `TopicCards` hardcodes `isLocked={false}` for all four topics on both web and mobile; the route accepts any of the four topics from any authed user. No lifetime concept anywhere. | **BROKEN against the frozen rule** on both axes (VERIFIED): cap is monthly not lifetime, and `love`/`career`/`health` are free right now. |
| **Oracle — 4 topics + regenerate + 300/mo for premium** | 300/month cap: **implemented** (`PREMIUM_MONTHLY_LIMIT`). Regenerate: **implemented** (24h cooldown per chart+topic, quota-exempt). 4 topics: implemented in that all 4 are reachable — but they are reachable for *everyone*, not premium-only. | **Partially implemented** (VERIFIED) — premium side works; the free/premium boundary does not exist. |
| **Кръг — 1 saved profile for free, unlimited for premium** | `POST /api/circle/profiles` → `create_saved_profile_if_allowed` RPC (migration `20260814180000`). Atomic: non-premium + already has 1 profile → returns null → 403 "Без Premium можеш да пазиш само един crush профил." | **Implemented** (VERIFIED) |
| **Кръг — no compatibility reading for free** | `POST /api/circle/profiles/[id]/report`: free users **do** get a report, but a **teaser** version (`buildSavedProfileTeaserContent`, `is_full: false`); premium gets `buildSavedProfileFullContent`. Connection-space reports and invites (`POST /api/circle/invites`, `POST /api/circle/relationships/[id]/report`) are **premium-only** (hard 403). | **Partially implemented / mismatch** (VERIFIED). Frozen rule says "no compatibility reading" for free; current code gives free a teaser, not nothing. Founder must decide: keep the teaser (a conversion surface) or block entirely. Note: these reports are **deterministic templates over computed synastry — not AI**, so they cost no AI quota. |
| **Ритъм — unlimited entries for free** | No tier gate on the diary. Server-side persistence (`/api/diary/entries`) has shipped since the 2026-04-20 matrix deferred it. | **Implemented** (VERIFIED) — matches the frozen rule. |
| **Ритъм — transit correlation for premium** | Does not exist. | **Absent / net-new** (see §3) |
| **Crystals — daily crystal visible for free** | `GET /api/crystals/today` open to all (free + anon); returns the rotation crystal + lunar phase, `isPremium: false`. | **Implemented** (VERIFIED) |
| **Crystals — collection grid visible with locked slots for free** | `GET /api/crystals` (the grid/overview) is **premium-only** — returns `PREMIUM_REQUIRED`. The web page renders a `<PremiumGate/>` upsell block for free users **instead of** the grid. Mobile: `crystals.tsx` has a premium branch (`CrystalGridTile` referenced but grid gated). | **BROKEN against the frozen rule + the visibility principle** (VERIFIED). Free users see an upsell panel, not a locked grid. |
| **Crystals — collecting / streaks / gamification for premium** | Manual "collect a recommendation" (`POST /api/crystals/collect`): **premium-only** (VERIFIED). Personalised recommendations + history (`GET /api/crystals`): **premium-only**. **Daily streak**: currently **FREE** — `getCrystalOfTheDay` auto-collects and computes a 60-day streak for any authed user (shipped 2026-04-20, commit `cb54ede`, per matrix "streak as the free-tier hook"). `POST /api/crystals/daily/collect`: open to all. | **Mismatch** (VERIFIED). Frozen rule puts streaks in premium; current code deliberately made streaks free. Reversing it undoes a shipped decision — flag to founder. |
| **Recommendations — 1 visible for free, all for premium** | `StoriesContent` / `/you/recommendations`: **no tier gate at all.** Content is a hardcoded stub catalog (`packages/core/src/stories/catalog.ts`): 8 daily picks (one per lunar phase) + 12 monthly arcs (one per sun sign). The only gate is a chart gate — the monthly arc needs birth data. | **Absent / net-new** (VERIFIED). "1 visible, rest locked" is entirely unbuilt. |
| **Guide — full for free** | `you/guide.tsx` header comment: "Free page, no premium/chart gating." | **Implemented** (VERIFIED) — matches. |
| **Moon — full for free** | No tier gate on the Moon detail screen (mobile-only feature). | **Implemented** (INFERRED — no tier reference found in the moon screen; consistent with it being free) |

---

# 5. What the "lifetime one-Oracle" rule requires

**A lifetime counter is a schema change.** The current quota model cannot
express "once, ever."

- `subscription_quotas` is keyed `(user_id, period_start)` with one row per
  **calendar month**. `ai_readings_used` resets to 0 each month by virtue of
  a new row being created. There is no lifetime-scoped column and no
  lifetime-scoped row.
- The `ai_readings` table (the reading cache) is **not** a usable lifetime
  ledger: rows are keyed `(chart_id, topic)`, carry a 7-day `expires_at`,
  and are upserted in place on regeneration. A row can disappear or be
  overwritten, so counting rows there does not reliably answer "has this
  user ever had their one free reading."

**Options to implement "1 free Oracle reading, lifetime":**

1. **A boolean on `users`** — e.g. `free_oracle_used_at timestamptz`. The
   Oracle route, for a free user, checks it: null → allow + stamp it;
   non-null → return the cap surface. Simplest. One migration, one column,
   ~2–3 lines in `oracle/generate`. Must be set atomically with the
   generation claim (or accept a tiny race where a user could get 2 on
   simultaneous requests — the existing burst limiter of 10/min already
   makes this near-impossible in practice).
2. **A dedicated `lifetime_grants` / `free_entitlements` table** — more
   general if other lifetime-scoped free allowances are coming (they are
   not, in this definition). Overkill for one boolean.
3. **A sentinel row in `subscription_quotas`** — e.g. `period_start =
   '1970-01-01'`, `ai_readings_limit = 1`, checked first. Reuses the atomic
   RPCs but abuses the schema's meaning; not recommended.

**Recommendation: option 1.** It is the smallest change and the rule is a
single boolean fact per user.

**Also required regardless of option:**

- **Separate Днес from the Oracle counter.** Today they share
  `FREE_MONTHLY_LIMIT`. Under the frozen definition Днес is unlimited-daily
  and Oracle is once-lifetime — they can no longer share one number. Днес
  generation must either be quota-exempt for free users, or moved to a
  per-chart pre-generation cron so the on-demand route only ever serves
  cache. (Exempting it is the smaller change; the pre-gen cron is more
  robust and also warms the cache before the morning push.)
- **Topic gating for Oracle.** The route must reject `love` / `career` /
  `health` for free users (or the free user's one lifetime reading must be
  forced to `general`). Currently no topic check exists.
- **Premium keeps the monthly model.** `PREMIUM_MONTHLY_LIMIT = 300` and
  the existing `subscription_quotas` monthly row still apply to premium
  users unchanged.

---

# 6. Every UI location that needs a locked-state treatment

Under the visibility principle, each of these must render the feature's
shape with a lock affordance — never hide it, never show an empty state.

| # | Location | Platform | Today | Needs |
|---|---|---|---|---|
| 1 | Oracle topic cards — `love`, `career`, `health` | web (`components/oracle/TopicCard.tsx` + `TopicCards.tsx`), mobile (`components/oracle/TopicCards.tsx`) | **Hides the lock** — `isLocked={false}` hardcoded for all four; the padlock UI in `TopicCard` is built but never triggered | Pass `isLocked` from tier for the three premium topics; wire the tap to the conversion surface (§7) |
| 2 | Oracle — after the free user's one lifetime reading | web (`OraclePanelGlobal` → `CapReachedNotice`), mobile (`oracle.tsx` → `CapReachedNotice`) | Shows a **text-only notice, no CTA**, worded "this month / next month" | New locked/converted state with an upgrade CTA and lifetime-correct copy (§7) |
| 3 | Oracle — regenerate button | web (`OraclePanelGlobal` footer), mobile (`oracle.tsx`) | Shown whenever a saved reading exists | Lock for free users (regenerate is premium) |
| 4 | Crystals — collection grid | web (`you/crystals/page.tsx` → `PremiumGate` block), mobile (`you/crystals.tsx`) | **Hides the grid**, shows an upsell panel instead | Render the actual grid with locked slots; only the daily crystal is interactive for free |
| 5 | Crystals — daily streak / gamification affordances | web (`CrystalOfTheDayCard`, `DailyStreakPanel`), mobile (`CrystalOfTheDayCard`, `CrystalGridTile`) | Streak currently **free**; would need to become a locked affordance for free | Locked streak/collect UI for free (this reverses a shipped decision — confirm first) |
| 6 | Crystals — "collect this recommendation" button | web + mobile crystal detail panels | Behind the premium grid gate | Visible + locked once the grid is visible to free |
| 7 | Recommendations — daily picks list (8) and monthly arc | web (`components/stories/StoriesContent.tsx`), mobile (`you/recommendations.tsx`) | **No gating** — all shown | Show one unlocked, the rest visible + locked |
| 8 | Кръг — "save another profile" (2nd+) | web (`CircleHub`), mobile (`circle.tsx`, `SavedProfileForm`) | Server 403s; client behaviour on the 403 needs checking | A locked "add profile" affordance for free with the count made explicit |
| 9 | Кръг — compatibility report on a saved profile | web (`CircleHub` / detail), mobile (`SavedProfileDetailPanel`) | Free gets a **teaser**; premium gets full | Depending on the founder call in §4: either keep the teaser as the locked state, or replace it with a locked panel |
| 10 | Кръг — send a connection invite / generate a connection report | web (`CircleHub`), mobile (`circle.tsx`, `new-connection.tsx`) | Server 403s (premium-only) | Locked affordance rather than a raw error |
| 11 | Днес — deeper transit detail section | web (`components/horoscope/*`, `/rhythm`), mobile (`(tabs)/index.tsx`) | No such section exists | Build the premium section + its locked state for free |
| 12 | Ритъм — transit correlation view | web + mobile Ритъм screens | Does not exist | Build the premium view + its locked state for free |

**Locations that currently HIDE rather than LOCK (violations of the
principle — call these out):**

- **Crystals collection grid** (#4) — replaced wholesale by an upsell block
  (`PremiumGate`) on web. This is the clearest violation.
- **Oracle premium topics** (#1) — not hidden exactly, but the lock is
  suppressed (`isLocked={false}`), so a free user who taps `love` today
  silently gets a full premium reading. Post-change they need a visible
  lock, not a silent allow and not a hidden card.
- **Recommendations** (#7) — nothing is locked or hidden today; all content
  is shown to everyone. Adding the lock is new, but there is no hidden
  state to fix, just missing gating.

Everything else already renders *something* (a teaser, a 403-driven message,
or an upsell) — those need re-skinning to a consistent locked treatment,
not un-hiding.

---

# 7. The single conversion point — end of the free Oracle reading

**Confirmed as the intended single conversion point. What exists there now
is not a conversion surface.**

**Web** (`apps/web/components/oracle/OraclePanelGlobal.tsx` →
`components/oracle/CapReachedNotice.tsx`):

- When the free user is capped, the Oracle modal renders `CapReachedNotice`.
- It is **text only, with no CTA / no button**. The component's own comment:
  *"Text-only notice with no CTA — RevenueCat isn't wired yet and a button
  that opens nothing or web checkout would be dead UX (founder ratification,
  SR 7)."*
- Copy: «Изчерпа {cap} безплатни четения за този месец.» / «Звездите ще
  говорят отново идния месец.» — i.e. framed as *"come back next month,"*
  not *"upgrade."*
- Trigger: the route returns 429 with `code: 'CAP_REACHED'` and `cap: <n>`;
  the hook maps that to `generationError.kind === 'cap-reached'`.

**Mobile** (`apps/mobile/app/(authed)/oracle.tsx` →
`apps/mobile/components/oracle/CapReachedNotice.tsx`):

- Same component, same text, **same absence of any CTA**. Comment: *"No
  transactional CTA — the upgrade path lands when RevenueCat ships in P.15."*
- Mobile has no purchase flow at all (RevenueCat paywall unbuilt), and the
  web `/pricing` fallback link is currently gated behind an unfilled env
  var.

**So, to make "end of the free Oracle reading" an actual conversion point,
the work is:**

1. **Reword the surface for a lifetime cap.** "за този месец" / "идния
   месец" is wrong once the free grant is once-ever. New copy: the free
   reading has been used; premium unlocks the other topics, regeneration,
   and monthly readings.
2. **Add the CTA.**
   - Web: a button to `/pricing` (or an inline checkout). This is
     buildable now — Stripe checkout exists.
   - Mobile: blocked on the RevenueCat native paywall (a separate
     halt-required item) — until then the honest fallback is a link to web
     `/pricing`, which itself needs `EXPO_PUBLIC_WEB_APP_URL` set and the
     web sign-in→checkout redirect verified.
3. **Also surface it at topic-tap.** Under the frozen definition a free
   user tapping `love` / `career` / `health` should hit the same conversion
   surface immediately (they never had those), not only after spending
   their one `general` reading. So the conversion point is really *two*
   entrypoints into one surface: (a) tapping a locked topic, (b) finishing
   the one free `general` reading.

---

# 8. Consolidated: what implementing the frozen definition requires

**Schema / migrations:**

1. `users.free_oracle_used_at` (or equivalent) — the lifetime-one-Oracle
   flag. New column, one migration. (§5)
2. Diary transit-snapshot storage — new JSONB column or sibling table for
   the Ритъм correlation feature, plus a backfill. (§3)
3. (No schema change needed for premium's 300/month — it already exists.)

**Server (all in `apps/web/app/api/...` + `packages/core`):**

4. `oracle/generate` — add topic gating (free → `general` only) and switch
   the free-tier check from the monthly counter to the lifetime flag; keep
   the monthly model for premium. Gate `regenerate` to premium. (§4, §5)
5. `horoscope/generate` — stop consuming the shared free monthly quota for
   free users; make Днес generation free-unlimited (exempt it, or add a
   per-chart pre-generation cron so the on-demand route only serves cache).
   (§4, §5)
6. `crystals` overview route — change from "premium-only, 403" to
   "returns the grid for everyone, with per-slot locked/unlocked state";
   keep collect + recommendations premium-only. (§4, §6)
7. Crystals streak — **decision required**: move streak/daily-collect back
   behind premium (reverses commit `cb54ede`), or keep free and treat only
   "collecting into the collection" as the premium gamification. (§4)
8. Recommendations — add tier gating to `StoriesContent`'s data path: one
   unlocked pick, the rest returned as locked stubs (title/teaser only).
   (§4, §6)
9. Кръг compatibility on saved profiles — **decision required**: keep the
   existing free teaser as the locked state, or block free entirely to
   match the literal frozen wording. (§4)
10. Днес "deeper transit detail" — a second prompt/format variant, premium
    gated in the horoscope route. **Decision required** on whether this also
    re-gates the currently-free `/rhythm` transit card. (§1)
11. Ритъм transit correlation — the whole feature (data capture + backfill +
    correlation logic + API). Design first. (§3)

**Client (web + mobile, both platforms per the parity ruling):**

12. Oracle topic cards — wire `isLocked` from tier; both platforms already
    have (web) or need (mobile) the padlock UI. (§6 #1)
13. Oracle conversion surface — replace `CapReachedNotice` with a
    lifetime-correct, CTA-bearing state; reach it from both a locked-topic
    tap and the end of the free `general` reading. (§7)
14. Crystals — render the real grid with locked slots instead of the
    `PremiumGate` block; lock the streak/collect affordances per decision 7.
    (§6 #4–6)
15. Recommendations — render all items, one unlocked, rest locked. (§6 #7)
16. Кръг — locked affordances for 2nd profile, compatibility, invites,
    connection reports, instead of raw 403 messages. (§6 #8–10)
17. Днес — premium "deeper detail" section + its locked state. (§6 #11)
18. Ритъм — premium correlation view + its locked state. (§6 #12)
19. A shared "locked feature" component/pattern, both platforms, so the
    treatment is consistent (the principle demands it).

**Blocked / external (not new to this definition, but on the path):**

- Mobile conversion CTA is blocked on the RevenueCat native paywall
  (halt-required item) and, as an interim, on `EXPO_PUBLIC_WEB_APP_URL` +
  the web sign-in→checkout redirect.
- Any AI-assisted version of the Ритъм correlation feature inherits the
  content-safety gap and the "user free text reaches the LLM for the first
  time" privacy surface from the system map.

---

# 9. Conflicts with the shipped 2026-04-20 premium matrix

`.planning/phases/m3-uat/PREMIUM_MATRIX.md` (2026-04-20) was the prior
source of truth and several of its decisions **shipped**. Item 7 of the
founder's directive: *which of these six does this implementation reverse,
and does any of it remove access an existing user currently has?*

| # | Shipped decision (2026-04-20 matrix) | Does this change reverse it? | Existing-user access impact |
|---|---|---|---|
| 1 | **Oracle cap-gate, topic-independent** — all four topics free under a 3/day (later 3/month) cap; commit `cb54ede`/matrix decision #2 | **YES — reversed.** Free is now one `general` reading, lifetime; `love`/`career`/`health` are premium (route + UI). Regenerate is now premium. | **Yes, this narrows free access** — see §12. One existing free user has already generated `love`/`health`/`career` readings; after this they can't generate new non-`general` ones. No reading already in `ai_readings` is deleted or hidden (the cache-check path is tier-blind). Every user's `free_oracle_used_at` starts NULL, so nobody is retroactively locked out of their one free `general` reading. |
| 2 | **Днес bounded by the shared 3/month AI quota** (code, 2026-08-26 sweep #4) | **YES — reversed** (this is a *loosening*). `horoscope/generate` no longer touches `subscription_quotas`. | **Strictly expands access.** Днес was capped at 3 generations/month for free (fewer if Oracle was also used); now unlimited. Nobody loses anything. |
| 3 | **`/rhythm` transit card free** (gate removed, commit `da69a9e`) | **NO — not touched** (amendment 3). | None. |
| 4 | **Crystals daily streak free** (commit `cb54ede`) | **NO — not touched** (amendment 3). | None. |
| 5 | **Crystals collection grid premium; free sees a `PremiumGate` upsell** | **NOT YET** — item 4/5 (not built). When built it changes hide → locked-grid; still premium-gated, so not a tier reversal, a presentation change. | None yet. |
| 6 | **Ритъм diary free** (persistence since shipped) | **NO — not touched.** Amendment 2 also drops the premium correlation layer, so Ритъм is now unambiguously fully free. | None. |

**Summary:** this implementation reverses decisions **1 and 2**. #2 only
expands free access. #1 genuinely narrows it (topic + regenerate + lifetime
vs. monthly), and §12 confirms exactly one of the 15 live accounts —
`user_3DXG2tiu13Ft180WlWCZnvzjsIe`, a free account — has exercised the
access being narrowed. Nothing already generated is removed. #3, #4, #6 are
left exactly as shipped, per the amendments. #5 is deferred.

---

# 10. Item 2 — the migration, and how to apply it

**File written, NOT run:**
`supabase/migrations/20260901120000_free_oracle_used_at.sql`

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS free_oracle_used_at timestamptz;
COMMENT ON COLUMN public.users.free_oracle_used_at IS '…';
```

Additive, nullable, no default — every existing row gets NULL. Non-locking
on Postgres for a nullable column with no default. No data migration.

**Apply path (the ledger is unreconciled — `supabase db push` is
forbidden, it would replay 13 unrecorded migrations including a live
`DROP COLUMN`):**

1. Run the `ALTER TABLE` **directly** against production — Supabase
   dashboard SQL editor, or a direct `psql` / connection with
   `DATABASE_URL`.
2. **Then** record it in the ledger:
   `supabase migration repair --status applied 20260901120000`
3. `migration repair` **only writes the ledger row** — it does not create
   the column. Step 1 and step 2 are separate; doing only step 2 leaves
   the column missing and the ledger lying.

**Deploy ordering — not advisory:** the application code (helper +
`free-oracle.ts` import in the Oracle route) is written to **tolerate the
column being absent** (`isUndefinedColumn` → treat the free reading as
available, log once). So the code is safe to merge/deploy before the
migration. But the lifetime cap is **not enforced** until the column
exists. `APP_USER_SELECT` / `ensureUserRecord` were deliberately left
untouched, so no other route is coupled to this column.

**Verify after applying:** re-run the read used for §12
(`SELECT free_oracle_used_at FROM users LIMIT 1` should succeed and return
NULL for all rows), then generate one free Oracle reading and confirm a
second attempt returns 429 `CAP_REACHED` / `free_used`.

---

# 11. Items 4 & 5 — not built, scoped

Per the founder's priority order and to keep this change a coherent unit
(routes + tests + the Oracle conversion surface), the following were
**not** built and are the remaining work:

**Item 4 — Recommendations gating.** `StoriesContent` (web) +
`you/recommendations.tsx` (mobile) have zero tier gating. The screen shows
one daily pick (today's lunar phase) + one monthly arc (sun sign). Build:
- A tier read in the recommendations data path. `general`-equivalent: keep
  the **daily pick** free; lock the **monthly arc** (or, if the design
  wants a list, show the first item free and the rest as locked stubs —
  title/teaser only, no `howItConnects`/`whyNow`/`whatItGives`).
- The catalog is a hardcoded stub (`packages/core/src/stories/catalog.ts`)
  with no backend — gating is a client/prop concern, ~0.5 day.

**Item 5 — one shared locked-state component + the non-Oracle surfaces.**
The Oracle surfaces (topic padlock, `CapReachedNotice`) are done and
consistent web↔mobile, but they are bespoke. Remaining:
- Extract a shared `PremiumLock` / locked-state primitive per platform
  (padlock affordance + short copy + CTA into the conversion surface),
  fold `CapReachedNotice` into it.
- Apply it to: **crystals collection grid** (replace the `PremiumGate`
  block with the real grid rendered in a locked state — needs ~30
  placeholder locked tiles, or a new free-readable catalog endpoint);
  **crystals "collect" button**; **Кръг** "save another profile" /
  compatibility report / send-invite / connection-report; **recommendations**
  (item 4's locked stubs).
- Estimate: ~3–5 days across both platforms, and it wants a design pass —
  the founder is the judge of the locked-state visual.

---

# 12. Item 7 — live-data check: does anyone lose current access?

**Queried production directly (service-role read, 2026-09-01):**

- **15 `users` rows** — 13 `free`, 2 `premium`. All created 2026-04 →
  2026-08 (test accounts; one obvious fixture row `uat-probe-column-type`).
  (The 2026-08-31 ground-truth audit's "5 users" is stale.)
- **9 `ai_readings` rows** — the 2026-08-31 audit's "0 rows" is stale.
  By user:
  - `user_3BomMib1trh8rzWj7gjE26VAkgw` (**premium**) — 1 `general`.
  - `user_3DOpOV532rQMWWiohVH2PYelz3n` (**premium**) — `career`, `health`,
    `general`, `love` (4).
  - `user_3DXG2tiu13Ft180WlWCZnvzjsIe` (**free**) — `general`, `love`,
    `health`, `career` (4), generated 2026-05-10.
- `daily_horoscopes` 35 rows, `subscription_quotas` 7 rows,
  `saved_people_profiles` 5, `saved_people_reports` 3.
- **`users.free_oracle_used_at` does not exist yet** (confirmed — the
  migration is unapplied).

**Access impact, precisely:**

- **`user_3DXG2tiu13Ft180WlWCZnvzjsIe` (free)** is the one account that has
  exercised access this change narrows. Today it *could* generate a fresh
  `love`/`career`/`health` reading; after the topic gate it cannot. Its
  four **existing** `ai_readings` rows are untouched — but all four carry a
  7-day `expires_at` from May 2026, so they are long expired and
  `GET /api/oracle/readings` (which filters `expires_at > now`) already
  returns nothing for them. So in practice this user already has no
  viewable Oracle content, and the change removes a *latent* ability, not
  a live one.
- **No reading is deleted or hidden.** The route's cache-check path
  (`existingReading && !regenerate` → return it) is tier-blind, so any
  still-live reading — including a premium-topic one generated before a
  downgrade — stays viewable.
- **The lifetime `general` grant is fresh for everyone.** `free_oracle_used_at`
  starts NULL on every row, so all 13 free accounts (including the one
  above) get their one free `general` reading after the migration, even if
  they generated one months ago.
- **Днес:** no one loses anything — the cap it was under is removed.
- **Premium accounts:** unaffected — same four topics, same regenerate,
  same 300/month.

**One-line answer:** the only access removed is the *ability to generate
new* `love`/`career`/`health`/regenerated Oracle readings on the free
tier; one existing free test account had used it; nothing already created
is taken away; every free account still gets a fresh lifetime `general`
reading.

---

# 9-appendix. Doc precedence

Where this document and the 2026-04-20 matrix disagree, **this document
wins**. The matrix still records production's *current* state until the
code (and the migration) land.
