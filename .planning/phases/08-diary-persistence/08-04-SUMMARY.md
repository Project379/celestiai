# §8.4 — API endpoints close summary

**Opened:** 2026-04-21 (after §8.3 shipped `public.diary_entries` to prod).
**Closed:** 2026-04-21 (real close after UAT pass + environmental-blocker recovery).
**Outcome:** 5 REST endpoints under `/api/diary/*` live on `mobile-parallel-test`. UAT harness executed against dev server and **passed 81/82, fail: 0** — all 5 diary unauth 401 gates and all 11 diary CRUD assertions green. Zero non-diary regressions observed post-recovery (birth-data, chart/calculate, crystals, stripe, transits, oracle cap-gate, middleware gates all still pass). Environmental blocker (Next.js 15.5.9 bundler regression for native modules) surfaced during UAT and resolved via four-step escalation ladder — see drift-tracker #14 and the "Environmental-blocker recovery" section below.

---

## Endpoint surface

| Method | Path | File | Error code |
|---|---|---|---|
| `GET` | `/api/diary/entries` | `apps/web/app/api/diary/entries/route.ts` | `ERR-DI-004` |
| `POST` | `/api/diary/entries` | same file — upsert on `(user_id, entry_date)` | `ERR-DI-003` |
| `GET` | `/api/diary/entries/[id]` | `apps/web/app/api/diary/entries/[id]/route.ts` | `ERR-DI-005` (404 stays plain) |
| `PATCH` | `/api/diary/entries/[id]` | same file | `ERR-DI-006` (404 stays plain) |
| `DELETE` | `/api/diary/entries/[id]` | same file | `ERR-DI-007` |

**HTTP semantics:**
- `POST` always returns `200 OK` with `{ ...DiaryEntryRow, created: boolean }`. Founder-ratified Alt A from the commit-2 surface (unifies success path; diverges from birth-data.ts's 201-on-create because birth-data isn't an upsert).
- `PATCH` returns `200` + row on success, `404 "Страницата не беше намерена"` on missing, `400 + details{}` on Zod fail, `500 ERR-DI-006` on other failure.
- `DELETE` returns `204 No Content` on success (matches birth-data convention). `500 ERR-DI-007` only on `DELETE_FAILED`.

## Bulgarian copy register — locked 2026-04-21

| Code | Body |
|---|---|
| `ERR-DI-003` | `Не успяхме да запазим страницата в дневника. Опитай отново. Код: ERR-DI-003.` |
| `ERR-DI-004` | `Не успяхме да заредим дневника. Опитай отново. Код: ERR-DI-004.` |
| `ERR-DI-005` | `Не успяхме да заредим страницата. Опитай отново. Код: ERR-DI-005.` |
| `ERR-DI-006` | `Не успяхме да обновим страницата. Опитай отново. Код: ERR-DI-006.` |
| `ERR-DI-007` | `Не успяхме да изтрием страницата. Опитай отново. Код: ERR-DI-007.` |

Register is locked for the diary domain. Consistent with ERR-DI-001/002 from §8.1 (the `"страницата"` write-path metaphor + `"дневника"` for the whole-diary read).

404 + 400 bodies are plain (not in the ERR-DI-NNN namespace):
- `404`: `Страницата не беше намерена` (diary entry missing for id)
- `400`: `Невалидни данни` + `details: { field: [messages] }` (Zod / users.created_at bound)
- `401`: `Неоторизиран достъп` (matches post-`635f1a4` Bulgarian-only 401 convention)

## Decisions resolved at commit-2 surface

**HTTP semantic on POST upsert** — Alt A (always 200 + `{created}`). Amendment shipped at `f1522da`.

**Phase snapshot on same-date re-write** — Option X (UPDATE `phase_id` + `phase_name` on re-write, mirroring client behavior). §8.2 Decision C's "snapshot at write time" concern is temporal stability across code changes, not intra-day-rewrite immutability — sealed without amendment to the core layer.

**Bulgarian copy register** — approved as drafted; sibling copy for 005/006/007 ratified in the same approval.

## users.created_at bound (§A2 sealing)

Zod validates entry_date format + future bound (`≤ today + 1 day`) inline. The lower bound (`≥ users.created_at`) requires a DB read (service-role on `users` table), so it lives in the POST route handler rather than the Zod schema. Surfaces through the same 400 channel with a Bulgarian field-error: `"Датата е преди създаването на профила"` on `entryDate`.

Behavior when the `users` row doesn't exist yet: the bound is silently skipped (caller treats absence as "no lower bound to enforce"). The users row is upserted on first write elsewhere in the system; diary doesn't pre-create it because no FK exists (§C1).

## Core layer shape

`packages/core/src/diary/entries.ts` — 5 operations mirroring the birth-data.ts pattern:
- `listDiaryEntries(userId, { phaseId? } = {})` — newest-first by `entry_date`; optional `phaseId` filter for §8.8 variant-count.
- `upsertDiaryEntry(userId, input)` — pre-lookup on `(user_id, entry_date)`; UPDATE if row exists else INSERT. Returns `{ created: boolean }` so the route handler can report the flag in the body.
- `getDiaryEntry(userId, id)` — `NOT_FOUND` is a legitimate variant, not an error.
- `updateDiaryEntry(userId, id, input)` — currently intentions-only. Distinguishes `NOT_FOUND` (404) from `UPDATE_FAILED` (ERR-DI-006).
- `deleteDiaryEntry(userId, id)` — idempotent at Supabase's row-count level; 204 regardless of pre-existing presence.

Uses the service-role Supabase client (`createCoreSupabaseClient`). RLS is bypassed; isolation is enforced by explicit `.eq('user_id', userId)` on every read/write. This matches the established pattern across `birth-data`, `crystals`, `oracle`, etc.

## Zod validators

`apps/web/lib/validators/diary.ts`:
- `createDiaryEntrySchema` — `entryDate` format regex + future bound; `phaseId` 8-member LunarPhaseId enum; `phaseName` non-empty; `intentions` tuple of 3 × 1..500 chars.
- `updateDiaryEntrySchema` — optional `intentions` tuple (only updatable field per commit-2 phase-snapshot decision).

Bulgarian error messages per the `birth-data.ts` register. The Zod layer is the user-facing voice (§8.2 Decision B); DB CHECK constraints are the silent guardrail — any CHECK violation surfaces as `ERR-DI-003` generic write failure with the detail `console.error`'d but not shown to the user (two-voice framing preserved).

## UAT harness additions (commit 6)

`apps/web/scripts/m3-uat-harness.mjs` extended:

**Unauth gates** — 5 new entries in `UNAUTH_ENDPOINTS`, one per method/path. Each asserts 401 + `"Неоторизиран достъп"` substring.

**Authenticated CRUD flow** — new `checkDiaryCrudFlow(jwt, clerkId)` function:
1. POST today's entry → 200 + `created:true` + `user_id === clerkId` + entry_date + intentions tuple.
2. Invalid POST (empty body) → 400 + `details{}`.
3. GET list → includes the new entry.
4. GET single by id → matches.
5. GET non-existent id → 404 + `"не беше намерена"` Bulgarian body.
6. POST same (user_id, today) again → 200 + `created:false` + same id.
7. Verify UNIQUE (user_id, entry_date) holds — single row for (user, today) via service-role count.
8. PATCH intentions → 200 + updated text.
9. Invalid PATCH (1-element tuple) → 400 + `details{}`.
10. DELETE → 204 no body.
11. GET after delete → 404.

Cleanup function extended to DELETE any residual `diary_entries` rows for the test user.

Harness parses clean (`node --check` pass). Founder-local execution completed 2026-04-21 post-blocker-recovery: **pass: 81 / fail: 0 / total: 82** (the one non-passing assertion is a pre-existing `skip`, not related to §8.4). All 5 diary unauth 401 lines PASS with correct Bulgarian body. All 11 diary CRUD lines PASS — POST create + GET list + GET single + POST upsert (`created:false`) + UNIQUE invariant + PATCH + bad PATCH → 400 + DELETE + GET 404 after delete. RESULTS.json written to `.planning/phases/m3-uat/RESULTS.json` per harness convention.

## Scope observation — RLS vs service-role pattern

Post-§8.4 architectural verification (grep across 25 API route files under `apps/web/app/api/`) confirmed: **RLS policies on user-scoped tables function as defense-in-depth; primary access control is app-layer `.eq('user_id', userId)` with `auth().userId` from Clerk middleware.** §8.2's RLS design on `public.diary_entries` is still correct; its role in the security model is backup, not primary.

This pattern is universal across the codebase. Every authenticated user-scoped endpoint uses either `createServiceSupabaseClient` (`@/lib/supabase/service` — 14 routes including oracle, horoscope, stripe, GDPR, push, webhooks, cron) or `createCoreSupabaseClient` (`@celestia/core/lib/supabase` — used inside core package operations called from birth-data, chart/calculate, crystals, transits route handlers). Both factories have explicit docstrings that state they bypass RLS and require manual `.eq('user_id', userId)` filtering.

**No endpoint in the codebase uses anon-client-with-forwarded-JWT** where RLS would be the actual gate. That pattern is reserved for any future direct client-side `@supabase/supabase-js` usage from the browser — today that's zero; if §8.5+ ever adopts it, the RLS policies are ready.

Post-surface consistency fix: `apps/web/app/api/diary/entries/route.ts` originally inlined `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {...})` rather than importing the `createServiceSupabaseClient` factory. Functionally identical but stylistically out-of-convention. Amended to match the codebase pattern in the §8.4 close-consolidation commit. Drift-tracker entry **#13** filed for the "asserted pattern ≠ verified pattern" class.

---

## What the harness does NOT cover

- **True RLS policy test against real Clerk JWT.** The API layer uses service-role, so RLS is NOT the gate — `auth().userId` + explicit `.eq('user_id', userId)` is. A pure RLS test would require a Supabase client configured with the anon key and the user's Clerk JWT as bearer token, then SELECTing from `diary_entries` to verify isolation works at the policy layer. That's a §8.5+ concern if any future code path uses direct client-side `@supabase/supabase-js`; not shipped here.
- **Cross-user isolation.** The harness runs against one test user; doesn't verify that user A can't see user B's entries. The explicit `.eq('user_id', userId)` + DB RLS combine to guarantee this, but integration-testing it would require minting two Clerk users.

## Execution trail — endpoint work

| Commit | SHA | What |
|---|---|---|
| 1 | `d135203` | core `diary/entries.ts` + validators `diary.ts` + package.json export — no routes |
| 2 | `d70b115` | POST + GET list on `/api/diary/entries` + Bulgarian copy draft (ERR-DI-003 + ERR-DI-004) |
| 2 amend | `f1522da` | HTTP semantic switch to Alt A (always 200 + `{created}`) |
| 3 | `0520284` | GET `/api/diary/entries/[id]` + ERR-DI-005 |
| 4 | `6775c3b` | PATCH `/api/diary/entries/[id]` + ERR-DI-006 |
| 5 | `26b7536` | DELETE `/api/diary/entries/[id]` + ERR-DI-007 |
| 6 | `4c4dac1` | M3 UAT harness additions: unauth gates + checkDiaryCrudFlow |
| close | `4cbeca4` | Initial §8.4 close summary (pre-UAT, harness ready-to-run state) |
| consolidation | `323ba60` | Service-role factory consistency fix + scope-observation block + drift #13 |

## Environmental-blocker recovery trail

Between the initial close (`4cbeca4`) and real close, the UAT attempt surfaced a Next.js-bundler regression unrelated to §8 scope. Four-step escalation ladder executed:

| Commit | SHA | What |
|---|---|---|
| recovery 1 | `fd6dd8b` | `serverExternalPackages: ['sweph']` in `apps/web/next.config.js`. Insufficient alone. |
| recovery 2 | `4832def` | `transpilePackages: ['@celestia/astrology', '@celestia/core']`. Insufficient in combination with #1. |
| recovery 3 | `d9bd940` | `createRequire` refactor of three astrology files (calculator.ts, transit.ts, utils/julian-day.ts) to route sweph through CJS entry. Insufficient — sweph still entered Webpack's graph. |
| recovery 4 | `7fa5684` | **Working combination.** Next pinned exact to `15.2.4` (dropped caret; lockfile regenerated); explicit `webpack.externals` hook added alongside the existing `serverExternalPackages`; diagnostic `console.log` at config-load time confirms config is being read. This landed the dev server green. |

All four recovery artifacts **retained on the branch** — they compose defense-in-depth even though only #4's combination was strictly load-bearing for this specific regression. Detail in drift-tracker #14.

## Durable infrastructure artifacts — post-§8.4

Three patterns inherited by future Celestia work as load-bearing defaults (none to be removed casually):

1. **Next.js pinned to `15.2.4` exact** (`apps/web/package.json`). Lockfile spec `15.2.4`, no caret. Rationale: 15.3+ exhibited a bundler regression where `serverExternalPackages` did not externalize native modules (sweph, likely also sharp / bcrypt / similar). Until Next 15.6+ or later restores the documented behavior, the exact pin prevents silent forward drift. Post-launch queued: re-test sweph externalization on each Next release as they ship; consider unpinning only when the regression is empirically resolved.
2. **`webpack.externals` hook in `next.config.js`** marking `sweph` as an external for `isServer: true` builds. Known-working pattern across Next.js versions for native N-API modules. **Keep regardless of Next version** — it's a durable safety net orthogonal to `serverExternalPackages`. If a future native dep lands (e.g., a different crypto primitive), add it to the same hook.
3. **`createRequire` pattern in `packages/astrology/src/{calculator,transit,utils/julian-day}.ts`** to route sweph through its CJS entry (`index.js`) rather than ESM entry (`index.mjs`). Defensive against any future bundler that statically analyzes `import * as sweph` and tries to bundle it. 39/39 tests still pass on this pattern; no behavior change vs the old ESM import. Keep.

The diagnostic `console.log` in `next.config.js` (line ~80) is **removable** after the sweph saga stabilizes across a few deploys — it's just a belt-and-suspenders config-load confirmation. Not load-bearing.

---

## Next: §8.5 opens

`useManifestEntries` hook swap from localStorage to server. Consumers unchanged. From the §8.0 plan:

- `useEffect` initial load: `fetch('/api/diary/entries')` → populate state.
- `saveEntry`: `fetch('/api/diary/entries', { method: 'POST', body })` → optimistic state update, rollback on failure with `ERR-DI-003`.
- `deleteEntry`: `fetch('/api/diary/entries/[id]', { method: 'DELETE' })` → optimistic, rollback on failure with `ERR-DI-007`.
- `findByDate`: unchanged.

Carry-forwards from §8.1 / §8.2 / §8.3 / §8.4:
- `ERR-DI-001` / `ERR-DI-002` banner stays; extend to clear on successful refetch once the read path gains re-read triggers (the §8.5 TODO at `useManifestEntries.ts`).
- Offline / network-failure surface via `ERR-DI-008` (new code, network-class — draft copy at §8.5 commit time).
- `ManifestEntryForm.tsx:125-131` gets `maxLength={500}` on textareas (§8.2 B sealing carry-forward).
- Optimistic rollback pattern: state updates first, rolls back if fetch rejects; banner surfaces the error; no offline queue in §8.5 (acknowledged scope bound).
- `isoDate` stays browser-local per §A2 A2 sealing — no Sofia switch needed (contrast with the A1 that was rejected).
