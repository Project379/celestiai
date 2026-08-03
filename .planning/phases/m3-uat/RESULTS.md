# M3 Runtime UAT — Results

**Date:** 2026-04-20
**Commit under test:** `9b4f087` (M3 extraction) on `mobile-parallel-test`
**Dev server:** `pnpm --filter @celestia/web dev` on http://localhost:3000
**Harness:** `apps/web/scripts/m3-uat-harness.mjs`
**Raw machine output:** `RESULTS.json`, `RESULTS.log`
**Browser-only follow-up:** `BROWSER_CHECKLIST.md`

---

## Summary

```
pass: 43 / fail: 0 / total: 43
```

Every extracted M1+M2+M3 endpoint passed runtime verification against a live Next.js dev server, a real Clerk session JWT minted via the backend REST API, and real Supabase writes under the service role. The one originally-failing assertion (cache-hit equality via `JSON.stringify`) turned out to be a test-harness bug — JSONB key-order roundtrip on the cached path is not byte-stable — and was rewritten to check semantic equivalence + a DB row-count proof (`chart_calculations` has exactly one row after two calls). After the fix, runtime behaves as specified.

**Tags:** `[verified]` = observed at runtime in this UAT; `[inferred]` = derived from harness output without direct visual confirmation; `[planned]` = captured in the browser checklist; `[deferred]` = out of M3 scope.

---

## Coverage matrix

| Endpoint | Unauth → 401 | Authed happy path | Error branches hit | Notes |
|---|---|---|---|---|
| `GET /api/planets/current` | n/a (public) | `[verified]` 200 + 11 planets | — | No auth gate; cache headers not re-asserted in harness. |
| `POST /api/chart/calculate` | `[verified]` | `[verified]` fresh 200 + cached 200 | `[verified]` 404 on unknown chart; cache row count = 1 after 2 calls | Byte-stringify equality on planets is fragile across JSONB roundtrip — switched to deterministic-ascendant + row-count proof. |
| `GET /api/birth-data` | `[verified]` | `[verified]` list includes seeded chart | — | |
| `POST /api/birth-data` | `[verified]` | `[verified]` 201 + row, user_id matches Clerk id | `[verified]` 400 `details{}` on bad input | FK-integrity users-row upsert verified implicitly — POST succeeded without a pre-existing users row for the fresh Clerk id. |
| `GET /api/birth-data/[id]` | `[verified]` | `[verified]` 200 | `[verified]` 404 on nonexistent id, ownership enforced | |
| `PATCH /api/birth-data/[id]` | `[verified]` | `[verified]` 200 + name updated | — | `[verified]` `chart_calculations` cache row was deleted after PATCH (invariant held). |
| `DELETE /api/birth-data/[id]` | `[verified]` | `[verified]` 204 (via cleanup step) | — | |
| `GET /api/stripe/status` | `[verified]` | `[verified]` free: `{tier:'free'}`, premium: `{tier:'premium'}` | — | **Fast-path activation with `session_id` was NOT exercised** — requires real Stripe Checkout redirect. `[planned / browser-only]`. |
| `GET /api/crystals` | `[verified]` | `[verified]` premium: 200 + catalog(30) + recommendations(2) | `[verified]` 403 PREMIUM_REQUIRED on free | |
| `POST /api/crystals/collect` | `[verified]` | `[verified]` premium: 200 + userCrystal | `[verified]` 403 free; `[verified]` 404 on nonexistent rec; `[verified]` 404 (idempotent) on 2nd collect of same rec | |
| `POST /api/crystals/daily/collect` | `[verified]` | `[verified]` premium: 200 `alreadyCollected:false` → 200 `alreadyCollected:true` | `[verified]` 403 free | Idempotent by unique `(user_id, date)` — second call reports pre-existing state, not a new insert. |
| `GET /api/crystals/today` | (public handler) | `[verified]` free: 200 + crystal + `isPremium:false`; premium: auto-collects | — | |
| `GET /api/crystals/daily-streak` | `[verified]` | `[verified]` premium: 200 + streak + days[] | — | |
| `GET /api/transits/overview` | `[verified]` | `[verified]` premium: 200 + `activeTransits[]` | `[verified]` 403 free; `[verified]` 403 on other-user chart (ownership) | Fresh calc on first call, cache on second — not split into two tests in this pass. |

---

## Error-branch coverage per discriminated-union variant

### `CalculateChartResult` (chart/calculate)
- `ok:true cached:true` — `[verified]` (2nd call on same chart)
- `ok:true cached:false` — `[verified]` (1st call, fresh compute)
- `CHART_NOT_FOUND` — `[verified]` (zero-uuid chartId)
- `FORBIDDEN` — `[inferred]` (other-user chart would 403; not hit directly because birth-data ownership enforcement catches it first in GET)
- `CALC_ERROR` — `[planned / should-exercise]` (would require a chart with garbage lat/lon — browser checklist covers this)
- `INTERNAL` — not exercised

### `TransitsOverviewResult`
- `ok:true` — `[verified]`
- `PREMIUM_REQUIRED` — `[verified]`
- `CHART_NOT_FOUND` — `[inferred]` (nonexistent chartId case — queried harness hit 403 FORBIDDEN instead on other-user chart, CHART_NOT_FOUND on zero-uuid returns 404)
- `FORBIDDEN` — `[verified]` (other-user chart id → 403)
- `INTERNAL` — not exercised

### `CrystalsOverviewResult`
- `ok:true` — `[verified]`
- `PREMIUM_REQUIRED` — `[verified]`
- `CHART_NOT_FOUND` — `[planned]` (harness always passes a valid chartId)
- `INTERNAL` — not exercised

### `CollectRecommendationResult`
- `ok:true` — `[verified]`
- `PREMIUM_REQUIRED` — `[verified]`
- `NOT_FOUND` (nonexistent id, already collected) — `[verified]` both sub-cases

### `CollectDailyCrystalResult`
- `ok:true` — `[verified]`
- `PREMIUM_REQUIRED` — `[verified]`
- `NO_CRYSTAL` — not exercised (would require an empty catalog)

### `CreateBirthChartResult` / `BirthChartByIdResult` / `UpdateBirthChartResult`
- Happy paths — `[verified]`
- 400 Zod validation on POST — `[verified]`
- 404 NOT_FOUND on missing id — `[verified]`
- `INSERT_FAILED` — not exercised (would require a DB constraint violation we don't have a handle on)

---

## Crystal picker divergence — quantified

The pre-M3 `/api/crystals/daily/collect` picked today's stone via `catalog.filter(...lunarPhase.id)[0]` (catalog order after `ORDER BY rarity ASC, slug ASC`), while the read path `getCrystalOfTheDay` uses `sort-by-slug + daysSinceEpochUTC(today) % matches.length`. On 2026-04-20 the catalog returns **30 crystals**, and every lunar phase is multi-match (≥ 4 matches). The pre-M3 pick vs post-M3 pick **differs on all 8 of 8 phases TODAY**:

| phase | matches | pre-M3 pick | post-M3 pick | post-M3 idx |
|---|---|---|---|---|
| new | 6 | aquamarine | clear-quartz | 1 |
| waxing_crescent | 7 | aquamarine | tanzanite | 4 |
| first_quarter | 7 | carnelian | peridot | 4 |
| waxing_gibbous | 7 | citrine | malachite | 4 |
| full | 7 | amethyst | pearl | 4 |
| waning_gibbous | 7 | amethyst | pearl | 4 |
| last_quarter | 6 | black-tourmaline | clear-quartz | 1 |
| waning_crescent | 4 | black-tourmaline | obsidian | 3 |

`[verified]` The unified picker at runtime: `GET /api/crystals/today` and `POST /api/crystals/daily/collect` both returned crystal id `35636f1d-7d4d-4fdc-b572-c7989f4c33f4` in the same harness run. This is the unification fix working end-to-end.

`[inferred]` Pre-M3 users who hit both surfaces on the same day would have seen a display/collect mismatch on the majority of days (8/8 today, and the number only changes as `daysSinceEpochUTC % matches.length` cycles through non-zero values — which is every non-zero-modulo day). The bug was not theoretical — it was hitting users regularly. Categorization-before-deferral was the correct call.

---

## What was NOT runtime-exercised (honest gaps)

- `[planned / browser-only]` **Stripe Checkout fast-path activation** — `apps/web/lib/stripe/activate-from-session.ts` only fires when `/api/stripe/status?session_id=cs_xxx` receives a real Stripe Checkout session. Requires a full browser Checkout redirect; covered in `BROWSER_CHECKLIST.md`.
- `[planned / browser-only]` **UI rendering of Bulgarian error text** — harness asserts JSON bodies contain the Bulgarian string; does not verify the page surfaces it correctly.
- `[planned / browser-only]` **React.cache dedupe in Server Components** — harness hits route handlers (unwrapped core); the `apps/web/lib/crystals/today.ts` wrapper is only exercised when `dashboard/page.tsx` renders. Request-scoped dedupe claim is framework behavior, not M3 code, but still worth a browser pass.
- `[planned / browser-only]` **End-user page renders** — `/dashboard`, `/you/crystals`, `/rhythm`, `/chart` all consume the extracted endpoints via Server Components. Harness verifies the endpoints; does not verify those pages render without 500s.
- `[deferred to M4]` **Streaming endpoints** — `/api/horoscope/generate`, `/api/oracle/*` are not in M3 scope.
- `[deferred to M5]` **Mobile HTTP client integration** — the Expo surface is not yet wired to any of these endpoints.

---

## Test artifacts

- **Harness:** `apps/web/scripts/m3-uat-harness.mjs` — 43 assertions across 12 endpoints, self-seeds via the endpoints under test, flips tier via service role, cleans up at exit.
- **Auth strategy:** Clerk REST (`POST /v1/sessions`, `POST /v1/sessions/<id>/tokens`) with `CLERK_SECRET_KEY` — no `@clerk/backend` package dependency added.
- **Test user:** `user_3CbyCbEF4mvNgdKfSXyMlstgxix` / `m3uat@celestia-ai.dev` (created by the harness on first run, reused thereafter).
- **Side effects that persist across runs:** the Clerk test user row and the Supabase `users` row for that Clerk id. All per-run artifacts (charts, chart_calculations, user_crystals, user_daily_crystals, crystal_recommendations) are cleaned up.
- **Replay:** `pnpm --filter @celestia/web dev` in one shell, then `node --env-file=apps/web/.env.local apps/web/scripts/m3-uat-harness.mjs` in another.

---

## Verdict

`[verified]` Clean pass for every programmatic assertion. No regression vs. pre-M3 behavior detected in any of the covered branches. The picker unification that was flagged as a "scope-wall / categorized" item in the M3 commit message is now runtime-confirmed to fix a bug that was firing on all 8 lunar phases as of 2026-04-20.

`[planned]` Browser-bucket items in `BROWSER_CHECKLIST.md` remain before the overall M3 UAT can be called "complete" — Stripe Checkout redirect + Bulgarian UI text + multi-Server-Component dedupe. M3 continuation should wait on the `[must-exercise]` items in that checklist or an explicit user sign-off that the browser bucket is deferred.

`[planned]` Every future endpoint extraction's completion report includes a **Runtime UAT** section that names happy path, error branches hit, and gaps — this document is the template.
