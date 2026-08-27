---
title: Wizard partial-value — feasibility investigation
status: DESIGN A RULED 2026-08-27. Build deferred to the wizard mockup. See the ruling block below.
created: 2026-08-27
updated: 2026-08-27
context: DESIGN-RESEARCH-2026-08-27.md §C.2 found the 4-step wizard collects
  date + location + time before showing any value — the shape onboarding
  research most warns against. Founder ruling: scope it as its own
  investigation, separate from Batch 8, report before deciding. Approved
  mockup order unchanged (paywall stays next).
method: read the chart engine, the birth-data core module, the shared Zod
  contract, and the mobile wizard gate. Every claim tagged VERIFIED
  (code read) / INFERRED / NEEDS-CHECK (a production-schema fact I did
  not query).
---

# Wizard partial-value — can we show something before the birth-time step?

**Short answer: yes, and the astrology engine already supports it fully —
it has always accepted an unknown birth time. The only real work is a
stateless way to call it, and one product decision about whether a
half-finished chart is allowed to exist as a row. There is a clean design
that needs no migration and no change to the wizard-completion gate.**

---

## RULING — 2026-08-27 (founder)

**Design A.** Stateless `POST /api/chart/preview` wrapping the existing
`calculateNatalChart` pure function, plus one wizard screen state. **No
schema change, no migration, no change to the wizard-completion gate.**

**Design B is rejected** — cross-session "finish later" is not a need
anyone has asked for, and A does not block B if it ever appears.

**Build is deferred to the wizard mockup.** Not now. The paywall stays
the next mockup. The four §4 decisions get answered as a batch when the
wizard mockup comes up, not piecemeal.

### ⚠ TRAP — carry this forward prominently if Design B is ever revisited

**The forced-wizard gate keys on row existence, not completeness.**
`apps/mobile/app/(authed)/_layout.tsx:31–40` fires the redirect only
while `useFirstChart().data === null`. Persist a provisional chart row at
the date+location step and `firstChart.data` goes non-null — **the wizard
is silently marked complete** and the user is never pushed back to add
their birth time. They land on Днес built from a noon-placeholder chart.
Design B therefore also costs a gate rework and an abandoned-row sweep.
Design A exists to sidestep exactly this. Also mirrored in
`COMPLETION-TRACKER.md` §6 so a fresh session sees it without opening this
file.

### Three things the implementer must get right (at mockup time, not now)

1. **The noon-local convention must be visible to the user.** A
   provisional chart is computed at noon local time (§1), so adding a
   real birth time will visibly change the Ascendant, the houses, and
   possibly the Moon sign. If that change is unexplained it reads as the
   app having been wrong. Propose the framing when the wizard screen is
   designed — e.g. the teaser explicitly says "your rising sign and
   houses need your exact birth time; this is your sign layer, which
   doesn't."
2. **Rate-limit `/api/chart/preview`.** It runs a real ephemeris
   compute. **Confirmed 2026-08-27:** the wizard sits *behind* auth —
   `AuthedLayout` redirects unauthenticated users to `/sign-in` before
   any wizard screen renders — so a preview call made mid-wizard is an
   authenticated request. Build the route as a normal `auth()` +
   `assertRateLimit` handler, identical posture to `/api/chart/calculate`.
   It must **not** ship as a public/unauthenticated endpoint; if a future
   change moves any part of the wizard ahead of auth, this becomes the
   most exposed compute endpoint in the app.
3. **Answer the four §4 decisions as a batch** with the wizard mockup.

---

## 1. What the chart engine needs — VERIFIED

`calculateNatalChart(input)` in `packages/astrology/src/calculator.ts`:

- **Required:** `date` (a `Date`), `lat`, `lon` (numbers), `birthTimeKnown`
  (bool).
- **Optional:** `time`. Line 144: `const time = input.time ?? DEFAULT_UNKNOWN_TIME`.
  Lines 159–173: when `birthTimeKnown` is false or `time` is absent, it
  uses **noon local time at the birth location** (the correct Swiss
  Ephemeris convention for unknown time — minimises max error for
  slow-moving bodies) and still computes the full result: all planet
  positions, a full Placidus house system, Ascendant, MC, aspects.
- It never touches the database, Clerk, a city row, or the network. It
  needs a timezone, which it derives from `lat`/`lon` internally
  (`localTimeToUTC`). Pure function, Moshier ephemeris (built-in, no
  external `.se1` files), single-digit-millisecond runtime.

**So "what can the engine compute from date + location with no birth
time?" — everything it ever computes.** The output is complete; some of
it is just approximate and already disclaimed in the app.

### 1.1 What is actually trustworthy without a birth time — INFERRED (astronomy, not code)

| Output | Without birth time | Show in a teaser? |
|---|---|---|
| Sun sign | reliable from date alone, except a birth on a sign-cusp day (~1 day/month). With location in hand, resolvable. | yes |
| Mercury–Pluto signs | reliable — these move slowly enough that noon-vs-actual-time is well within the sign. | yes |
| **Moon sign** | **~20–25% chance of being wrong** — the Moon moves ~12–13°/day, so noon can land it in the neighbouring sign. | only if explicitly marked provisional, or omit |
| Ascendant / MC / house cusps | **meaningless** without time — they're the noon placeholder. The app already disclaims this (`PlanetDetail.tsx:437`, `wizard/confirm.tsx:178`). | omit entirely, or show as "unlocks with your birth time" |
| Aspects | planet–planet aspects are fine; anything involving the Ascendant/MC is not. | planet–planet only |

**The honest teaser = Sun + planetary signs (Mercury through Pluto), no
houses, no Ascendant, Moon either omitted or flagged.** That is still a
substantial "here is what we can already tell you" — it is most of a natal
chart's sign layer.

The wizard step order is `date → location → time → confirm` (VERIFIED:
`apps/mobile/app/(authed)/wizard/` holds `date.tsx`, `location.tsx`,
`time.tsx`, `confirm.tsx`). So by the point a teaser would appear —
after `location`, before `time` — we already have date **and** location,
which is enough for every row marked "yes" above.

---

## 2. The data-model question — VERIFIED, with one sharp edge

### 2.1 The schema already supports a timeless chart — but not a *time-less-less* one

`charts` columns (from `BirthChartRow`, `packages/core/src/charts/birth-data.ts:13`):
`birth_date`, `birth_time` (nullable), `birth_time_known` (bool),
`approximate_time_range` (nullable), `city_id` (nullable), `city_name`,
`latitude`, `longitude`. A row with **no exact time** is already a
first-class, shipped state — that is the "I don't know my birth time →
pick a rough range" path.

**But the shared Zod contract (`schemas.ts:109–130`) requires one of the
two time fields to be set:** if `birthTimeKnown === true` then `birthTime`
is required; if `birthTimeKnown === false` then `approximateTimeRange` is
required. **"No time information at all" is not a submittable state
today.** A persisted provisional chart would be exactly that state
(`birth_time_known: false`, `approximate_time_range: null`), so it would
need either a schema carve-out or a separate code path that bypasses the
shared schema.

- NEEDS-CHECK: whether `charts.birth_time` / `approximate_time_range` are
  nullable at the DB level with no CHECK constraint tying them together.
  The `charts` base schema has no `CREATE TABLE` in tracked migrations
  (Drizzle-era, per TECHNICAL-SWEEP-2026-08-26 §1.4), so this must be
  confirmed by a read-only production query, not inferred from the TS
  type.

### 2.2 The sharp edge — the wizard-completion gate keys on row existence

`apps/mobile/app/(authed)/_layout.tsx:31–40`: the forced-wizard redirect
fires when `useFirstChart().data === null`. It checks whether **any** chart
row exists — not whether it is complete.

**If a provisional chart is persisted at the date+location step,
`firstChart.data` becomes non-null and the forced wizard stops firing.**
A user who quits mid-wizard would land on Днес built from a timeless
chart and never be pushed back to finish. Batch 1's infinite-loop fix
also seeds `['first-chart']` from the POST response — that plumbing
assumes the POST is the *completed* chart.

This is the single reason "persist a provisional row" is more than a
small change.

---

## 3. Two designs, and a recommendation

### Design A — in-memory teaser, nothing persisted until completion (RECOMMENDED)

- New stateless endpoint, e.g. `POST /api/chart/preview`, body
  `{ birthDate, latitude, longitude }`, returns `calculateNatalChart({
  date, time: null, lat, lon, birthTimeKnown: false })` output. No DB
  read or write. Rate-limited like every other route. ~40 lines wrapping
  an existing pure function.
- Wizard gains an intermediate state after `location`: "Here's your Sun
  and planetary signs — add your birth time to unlock your rising sign,
  houses, and Moon." One `CtaPanel`-style continue.
- Wizard completion is unchanged: still a single `POST /api/birth-data`
  with the full validated payload at the end.
- **Schema: no change. Completion gate: no change. Migration: none.
  Litter: none** (no half-charts can exist).
- Cost: +1 Moshier compute per wizard run, thrown away (single-digit ms,
  in-process, not metered, no AI). If the teaser shows the full
  provisional wheel it is recomputed once on completion — still trivial.
- Trade-off: the teaser result isn't cached, and the provisional wheel
  (if shown graphically) is computed twice. Both negligible.

### Design B — persist a provisional chart row

Needs, in order:

1. Schema carve-out to allow `birth_time_known: false` +
   `approximate_time_range: null` (breaks the current `schemas.ts`
   superRefine — affects web and mobile wizard validation identically).
2. A distinguishing column — `is_provisional` or `wizard_completed_at` —
   so everything downstream can tell a real chart from a stub.
   **This is a migration, which halts for ratification regardless of
   size (standing rule).**
3. `useFirstChart` + the `_layout.tsx` gate updated to ignore provisional
   rows (else the forced wizard breaks, §2.2).
4. A sweep for abandoned provisional rows (a user who never finishes),
   or they accumulate against `MAX_CHARTS_PER_USER = 20`.
5. A decision on whether a provisional row counts toward that cap.

Design B only earns its cost if there's a product reason to keep the
provisional chart around after the wizard (e.g. "come back and finish
later" across sessions). Nothing in the current product asks for that.

### Recommendation

**Design A.** The engine already does the hard part. The remaining work
is one small stateless route + one wizard screen state + copy, with no
schema change, no migration, and no change to the completion gate. It
delivers exactly the §C.2 fix — value before the birth-time toll gate —
at the smallest possible surface.

---

## 4. What still needs a founder decision

Item 1 is ruled (Design A — see the ruling block up top). Items 2–4 are
answered as a batch when the wizard mockup is designed, not now.

1. ~~Go / no-go on Design A~~ — **ruled: Design A.**
2. **Teaser content:** Sun + planetary signs only? Include the Moon with
   a "provisional" mark, or omit it? Show the provisional wheel
   graphically, or just a sign list?
3. **Framing of the time step after the teaser:** keep "I know / I don't
   know my time" as-is, just now preceded by a payoff — or also make the
   "time unknown → approximate range" option more prominent (that part
   needs no ruling, it's a pure UX improvement).
4. Whether this is a Batch 8 wizard-redesign concern or a separate small
   piece that lands before the wizard's visual redesign.

No code was written for this. `tokens.ts`'s `faint` fix is the only
change on disk from this session's design work.
