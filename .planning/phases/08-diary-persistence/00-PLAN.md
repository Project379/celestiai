# §8 Diary Persistence Workstream — Plan

**Opened:** 2026-04-20 (§8.0)
**Status:** **PAUSED after §8.0** — resumes at §8.1 only after §9 (ephemeris validation) ships and user confirms re-open. See **Pause rationale** below and `.planning/phases/09-ephemeris-validation/00-PLAN.md`.
**Audit source:** `.planning/research/DIARY_AUDIT.md`
**Decisions source:** `.planning/research/DIARY_PRODUCT_DECISIONS.md`
**Rough estimate:** 10-14 elapsed rounds across nine sub-rounds (baseline preserved; paused post-§8.0 pending §9 completion).

**Epistemic tags used throughout this doc:**
- `[user-decision]` — authority is the user's direct call.
- `[verified]` — traceable in source or in the audit doc.
- `[inferred]` — reasoning from planning context.
- `[skill-dependent]` — relies on the Bulgarian astrology skill's output quality.

---

## Pause rationale (2026-04-20)

The three most load-bearing pre-launch items are: (1) the astrology math is correct, (2) user data is safe, (3) payments work. Celestia has (3). (2) is partially there — diary persistence is the current gap, which this §8 workstream closes. (1) is **assumed-correct** because `swisseph-wasm` is trusted by reputation, but has never been empirically verified against reference data in this codebase.

Ephemeris validation is the only one of the three with **no graceful degradation path**. If payments break, a user retries. If a diary entry fails to save, we surface an error with `ERR-DI-NNN`. If the astrology math is wrong, every natal chart, every transit, every oracle reading, and every AI-generated interpretation is wrong — and users won't know to retry, because wrong-but-confident output looks like correct-but-confident output. Discovering "the math was wrong all along" via user reports post-launch is categorically worse than discovering it now via deliberate audit.

The pivot sequences §9 (ephemeris validation) ahead of §8.1+. When §9 closes, §8 resumes exactly where it left off — the decisions doc (`DIARY_PRODUCT_DECISIONS.md`) stays durable, the sub-round structure below stays intact, no work is wasted.

**§8 resumes at §8.1 (immediate fixes) once §9 (ephemeris validation) ships and user confirms re-open.** Nothing in this plan doc is deleted; status tag at the top is the only live indicator.

---

## Workstream overview

The diary ships to launch with full server-side persistence, per-user cross-device sync, variant rotation (3+ prompts per phase), markdown export, and GDPR deletion. This is a product-completing workstream, not incremental polish. The hook layer was architected as a backend-swap boundary from day one (`hooks/useManifestEntries.ts:9-15` docstring `[verified]`) — the swap itself is small; the surrounding infrastructure (schema, endpoints, variant authoring, export, GDPR, verification) is the bulk of the work.

## Scope bounds

**In scope for §8:**
- Supabase schema + RLS for diary entries.
- REST endpoints (`/api/diary/*`) with auth, validation, and domain error IDs.
- Hook swap from localStorage to server.
- Variant rotation logic + 16+ new Bulgarian prompts.
- Markdown export from server data.
- GDPR deletion cascade.
- Silent-failure UX fix with ERR-DI-NNN error domain.
- Minor adjacent findings surfaced in audit (typo fix, dual-prompt-systems investigation — not necessarily fix).

**Out of scope for §8:**
- Mobile parity for the diary. M5 workstream. The server endpoints shipped here will be the contract mobile consumes later; the UI work is separate.
- localStorage hygiene passes on other hooks (`useDailyHoroscope`, `useStoryList`). Flagged in §8.1 but fixed outside this workstream.
- Moon-phase calculation changes. Covered by the astrology-engine workstream; diary only consumes phases, never computes them.
- Premium-gate activation. Per PREMIUM_MATRIX row 13, the gate ships after server persistence exists — that's a §9 (or similar) concern, not §8. §8 delivers the server persistence that unblocks the gate; the gate itself lands later.

## Sub-round structure

| # | Round | Goal | Scope | Rough size |
|---|---|---|---|---|
| §8.0 | planning | Capture decisions + plan | 2 docs | 1 round (this) |
| §8.1 | immediate fixes | Non-persistence-dependent cleanups | Prompts typo, silent-failure UX, dual-prompt investigation | 1-2 rounds |
| §8.2 | schema design | `diary_entries` table + RLS design, user review | Doc + SQL draft | 1 round |
| §8.3 | migration execution | Schema live in prod via Supabase CLI | 1 migration file | 1 round |
| §8.4 | API endpoints | `/api/diary/*` CRUD with validation and ERR-DI-NNN | 5 endpoints + shared lib | 2-3 rounds |
| §8.5 | hook swap | `useManifestEntries` localStorage → server | Hook rewrite + offline handling | 1-2 rounds |
| §8.6 | export/backup | Markdown download wired to server data | 1 endpoint + 1 UI surface | 1 round |
| §8.7 | GDPR deletion | Account-deletion cascade to diary entries | Wire into existing GDPR endpoint | 1 round |
| §8.8 | prompt variants | 16+ new Bulgarian prompts + rotation logic | Skill-generated in batches, user approves | 2-3 rounds |
| §8.9 | E2E verification | UAT harness additions; cross-device, post-clear, rotation | Harness + runs | 1 round |

Total: 10-14 elapsed rounds `[inferred]`.

Dependencies between sub-rounds: §8.3 blocks §8.4 (migration must land before endpoints reference the table); §8.4 blocks §8.5 (hook can't call absent endpoints); §8.5 blocks §8.6 and §8.9 (export and verification need the live path); §8.7 can run in parallel with §8.8 but after §8.4. §8.1 is independent of the rest.

---

## Sub-round details

### §8.1 — Immediate fixes independent of persistence

**Goal:** Clear the non-persistence items surfaced by the audit so they don't accumulate risk while the persistence workstream runs.

**Scope:**
- Fix `lib/manifest/prompts.ts:8` doc-comment typo `[verified]` (Latin `p` + Cyrillic *ълнолуние* → full Cyrillic).
- Introduce `ERR-DI-NNN` error domain (Decision F). Initial codes:
  - `ERR-DI-001` — localStorage write failed.
  - `ERR-DI-002` — localStorage read corruption.
- Surface both errors in the UI with Bulgarian copy (user-approved in this sub-round, same ERR-BD-NNN cadence).
- Investigate the dual-prompt-systems adjacent finding (`lib/manifest/prompts.ts` structured 3-field vs `phase.journalPrompt` single-line): classify as intentionally-separate or as a consolidation candidate. No fix yet — classification only, flagged into a follow-up if consolidation is warranted.
- Stale comment cleanup at `DashboardContent.tsx:247` (`+ diary` tail claim is post-consolidation rot). Trivial one-line fix.

**Exit criteria:** typo fixed; error domain introduced with user-approved Bulgarian copy; stale comment corrected; dual-prompt classification filed as either "intentional" or "follow-up ticket" with reasoning.

**Not in scope:** extending ERR-DI-NNN to `useDailyHoroscope` / `useStoryList` (they share the pattern but are not diary files).

---

### §8.2 — Schema + RLS design, review round

**Goal:** Produce the `diary_entries` schema design in doc form and get user sign-off before running the migration.

**Scope:**
- SQL DDL for the `diary_entries` table mirroring the `ManifestEntry` interface (`lib/manifest/types.ts:10-18`):
  - `id UUID PRIMARY KEY` (server-generated, not `mf_${ts}_${rnd}` — clean UUID for the server era).
  - `user_id TEXT NOT NULL` — Clerk ID matching the `users.clerk_id` FK pattern used elsewhere.
  - `entry_date DATE NOT NULL` — the date the entry represents (Europe/Sofia calendar day).
  - `phase_id TEXT NOT NULL` — snapshot of `LunarPhaseId` at write time (Decision C).
  - `phase_name TEXT NOT NULL` — snapshot of Bulgarian phase name at write time (Decision C).
  - `intentions TEXT[] NOT NULL CHECK (array_length(intentions, 1) = 3)` — the three-slot tuple; DB-level length guard.
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - `UNIQUE(user_id, entry_date)` — one entry per user per date. Enforces the current upsert semantics.
- Indexes:
  - `(user_id, entry_date DESC)` — primary read pattern: list entries for a user, newest first.
  - `(user_id, phase_id)` — supports variant-rotation count query (`count WHERE user_id = ? AND phase_id = ?`).
- RLS:
  - `SELECT / INSERT / UPDATE / DELETE` allowed only WHERE `user_id = clerk_id()` (the existing JWT-claim helper used on `charts` and `chart_calculations`).
  - Service-role bypass for server-side operations (cron cleanup, GDPR deletion).
- Consideration: deletion behaviour on user-account deletion. The existing `users` table + GDPR endpoint pattern (`apps/web/app/api/gdpr/delete-account/route.ts`) is the reference. Diary cascades via explicit deletion in §8.7, not via FK ON DELETE (keeping cross-table semantics explicit rather than implicit).

**Exit criteria:** user reviews the schema proposal; any column/index/RLS adjustments agreed before the migration file is drafted.

**Artefact:** `.planning/phases/08-diary-persistence/08-02-SCHEMA.md` documenting the decision rationale per column and RLS rule.

---

### §8.3 — Migration execution

**Goal:** Schema live on the production Supabase instance via the Supabase CLI (adopted in the Drizzle-removal round `a0c1635`).

**Scope:**
- Write `supabase/migrations/YYYYMMDDHHMMSS_create_diary_entries.sql` with the approved schema from §8.2.
- Run `pnpm supabase db push --db-url $DATABASE_URL --yes` per the documented tooling.
- Verify via probe script (reuse `apps/web/scripts/diagnostics/probe-column-type.mjs` pattern from the Bug-1 audit) that the table exists and RLS policies are active.
- No application code change in this sub-round. Pure DB.

**Exit criteria:** `diary_entries` table visible in production with the specified columns, indexes, and RLS policies. Probe script output committed as evidence.

**Risk:** the Supabase CLI refused a push earlier in the §7 Bug-1 sequence due to out-of-band migration-history drift. If the same issue surfaces, repair the history before running — don't work around. `[verified]` the pattern from commit `1c4e551`'s body.

---

### §8.4 — API endpoints

**Goal:** Full CRUD surface for diary entries, Clerk-authed, RLS-enforced, Zod-validated, with ERR-DI-NNN error IDs on every failure path.

**Scope:**
- Five endpoints under `apps/web/app/api/diary/`:
  - `POST /api/diary/entries` — create (or upsert on `(user_id, entry_date)` conflict, mirroring client upsert semantics).
  - `GET /api/diary/entries` — list for caller. Supports optional `?phase_id=` for the variant-count query.
  - `GET /api/diary/entries/[id]` — read single entry.
  - `PATCH /api/diary/entries/[id]` — update (intentions / phase-on-re-write — see Decision C notes).
  - `DELETE /api/diary/entries/[id]` — delete.
- Core logic in `packages/core/src/diary/entries.ts` — mirrors the `packages/core/src/charts/birth-data.ts` pattern from M2/M3 (discriminated-union `{ ok: true, data } | { ok: false, error: 'SOMETHING' }`).
- Zod validation schema at `apps/web/lib/validators/diary.ts` — Bulgarian error messages, same register as `birth-data.ts`.
- Error IDs (draft, user approves in §8.4 commit):
  - `ERR-DI-003` POST insert failed.
  - `ERR-DI-004` GET list failed.
  - `ERR-DI-005` GET single failed (distinct from 404).
  - `ERR-DI-006` PATCH update failed.
  - `ERR-DI-007` DELETE failed.
- M3 UAT harness stub — unauth 401 shape tests, same as the birth-data endpoints from the §6 harness updates.

**Exit criteria:** five endpoints live on `mobile-parallel-test`, typecheck clean, UAT harness 401 assertions pass. User approves Bulgarian error copy before ship.

**Estimated scope:** 2-3 rounds — this is the largest sub-round and deserves its own plan checkpoint if it exceeds single-commit digestibility.

---

### §8.5 — Hook swap: localStorage → server

**Goal:** `useManifestEntries` reads/writes via the new `/api/diary/*` endpoints. Consumer components unchanged.

**Scope:**
- Rewrite `apps/web/hooks/useManifestEntries.ts`:
  - `useEffect` initial load: `fetch('/api/diary/entries')` → populate state.
  - `saveEntry`: `fetch('/api/diary/entries', { method: 'POST', body })` → optimistic state update, rollback on failure with `ERR-DI-003`.
  - `deleteEntry`: `fetch('/api/diary/entries/[id]', { method: 'DELETE' })` → optimistic, rollback on failure with `ERR-DI-007`.
  - `findByDate`: unchanged (operates on in-memory state).
- Offline / network-failure graceful handling:
  - If `fetch` rejects (offline), surface a "сейв невъзможен" banner with `ERR-DI-008` (new code, network-class failure). User sees the error; their text isn't lost from the form state until they explicitly dismiss.
  - No offline queue for later retry in §8.5 — that's a scope expansion worth explicit discussion if desired. Default is "tell the user the save failed, let them retry manually." `[inferred]`
- Drop the localStorage read/write code entirely. The old key `celestia.manifest.entries.v1` is abandoned (Implementation Decision 1).
- Revisit all `useManifestEntries` consumers — they only touch the hook's return API, which doesn't change. No component rewrites expected. `[verified from audit §2.1]`

**Exit criteria:** hook swapped; diary entries persist across devices when tested with a shared Clerk account on two browsers; localStorage is not written to; no component edits needed beyond any error-UX surfacing for the new error codes.

**Risk:** SSR/hydration — `ManifestDiaryContent` is a `'use client'` component and mounts the hook only client-side, so no hydration mismatch expected. Worth verifying in §8.9.

---

### §8.6 — Export / backup

**Goal:** User can download their full diary as a markdown file, client-generated from server data.

**Scope:**
- New UI surface: button on `/rhythm/journal` (near the history section) labelled "Изтегли дневника" (Bulgarian copy drafts in §8.6 commit, user approves).
- Client-side markdown generation from `GET /api/diary/entries` response:
  - Per entry: date header, phase name, three intentions.
  - File name: `celestia-дневник-YYYY-MM-DD.md` where date is today.
- No new endpoint needed if existing list endpoint returns the full entry list. If the list endpoint is paginated in §8.4 for scale reasons, add a `?all=true` or a separate `GET /api/diary/entries/export` — decision deferred to §8.4's final schema.
- Accessibility: downloaded file uses UTF-8 BOM for Excel-compatibility `[inferred]` if users paste into office tools.

**Exit criteria:** user with test entries downloads a readable markdown file; content matches their live diary.

**Not in scope in §8.6:** JSON format (can ship later if demand surfaces), email-based delivery, selective date-range export.

---

### §8.7 — GDPR deletion cascade

**Goal:** Account deletion cascades to diary entries. Required for EU audience per PRE_LAUNCH_PREREQS.md item 7.

**Scope:**
- Add `deleteUserDiaryEntries(userId)` in `packages/core/src/diary/entries.ts`.
- Wire into the existing `apps/web/app/api/gdpr/delete-account/route.ts` as an additional cleanup step — mirrors how existing tables are handled.
- Update `apps/web/app/api/gdpr/export/route.ts` to include diary entries in the GDPR data-export payload (Article 20 data-portability). Delivery format: JSON in the export zip/response, NOT markdown (that's §8.6's user-facing format; GDPR export is machine-readable).

**Exit criteria:** account deletion removes diary entries; GDPR export includes them.

**Cross-check:** verify the `SCHEMA_DRIFT_AUDIT.md` columns flagged as "extra in DB" are covered by the same GDPR coverage update — out of this sub-round's core scope but worth confirming.

---

### §8.8 — Prompt variants expansion

**Goal:** Ship 16+ new Bulgarian prompts so each phase has at least 3 variants. Variant selection logic operational end-to-end.

**Scope:**

**Bulgarian-skill verification gate (required first step):**
- Generate one variant (variant index 1) for one phase — likely `new` or `waxing_crescent` since those are the most-used entry phases `[inferred]`.
- Surface the generated content to the user for review. Voice checks:
  - Traditional-terminology aligned (per the terminology audit register — "съединение", "квадрат", "прилагащ/раздалечаващ").
  - Sentence-starter cadence consistent with the existing 8 prompts (short imperative → ellipsis, not full declarative sentences).
  - Heading / lead / field labels / placeholders all match the `ManifestPrompt` shape.
  - No English bleed-through, no placeholder-text artefacts.
- If sample passes → proceed to batched generation.
- If sample doesn't pass → user specifies adjustment, skill regenerates, re-review. **Do not ship any batch without a passed sample.** This mirrors the ERR-BD-NNN / noon-chart-disclaimer approval cadence.

**Batched generation (post-gate):**
- Remaining 15+ prompts generated in batches of 4-8.
- Each batch committed independently; user approves Bulgarian copy batch-by-batch. Same ERR-BD-NNN cadence.
- Batch structure flexibility: could be "one batch per phase (3 variants × 8 phases = 8 batches)" or "one batch across phases (4 phases × 2 variants each = 4 batches)." Picking in §8.8 sub-round kickoff.

**Prompt library refactor:**
- `lib/manifest/prompts.ts`: change `MANIFEST_PROMPTS: Record<LunarPhaseId, ManifestPrompt>` → `MANIFEST_PROMPTS: Record<LunarPhaseId, ManifestPrompt[]>` (array of variants per phase).
- Existing 8 prompts become variant 0 of their phase. Preserves backward-compatibility with entries already stored (entries don't track variant index — Decision 2).
- `getManifestPrompt` signature change: `(phaseId, entryCountForPhase) => ManifestPrompt` — selects `prompts[entryCountForPhase % prompts.length]`.
- Consumer update: `ManifestEntryForm` fetches `entryCountForPhase` via `entries.filter(e => e.phaseId === phase.id).length` and passes it to `getManifestPrompt`. `[inferred]` simpler than a dedicated API call.

**Exit criteria:** all 8 phases have ≥3 variants; rotation works empirically (writing a Waxing Crescent entry advances the next cycle's Waxing Crescent prompt); user has signed off on every batch's Bulgarian copy.

**`[skill-dependent]`:** everything downstream of the skill's generation is gated on the sample review + batch reviews. If skill output quality drifts partway, flag and iterate rather than ship.

---

### §8.9 — End-to-end verification

**Goal:** Full workstream verified via harness + manual UAT. Closes §8.

**Scope:**
- Add diary scenarios to `apps/web/scripts/m3-uat-harness.mjs`:
  - Unauth 401 shape on all 5 `/api/diary/*` endpoints.
  - Auth'd POST → GET list round-trip.
  - Upsert semantics (same-date re-POST updates).
  - PATCH / DELETE happy paths.
  - GDPR export includes diary entries.
  - GDPR delete removes them.
- Manual UAT (browser):
  - Fresh user → write first entry → appears in history.
  - Sign out, sign in on a different browser → entries present (cross-device).
  - Clear localStorage on original browser → entries still present on reload (confirms server-side).
  - Write ≥ 3 Waxing Crescent entries → verify variant rotates correctly across next 3 cycles (may require manipulating entry counts or testing the rotation logic in a unit test since real 3-month cycles don't fit a UAT session).
  - Markdown export → file contents match live entries.
  - GDPR account deletion → diary entries removed; GDPR export payload matches.
- Update `DATA_FETCHING_INVENTORY.md` — replace the "Manifest diary persistence endpoint — currently localStorage" entry with the shipped endpoint reference.

**Exit criteria:** harness additions pass; manual UAT signed off; §8 marked complete.

---

## Context-handoff forecasting

This workstream spans 10-14 elapsed rounds `[inferred]`. Past a certain point, this thread will hit context-window pressure and response quality will degrade. Rather than let degradation set in, we break to a fresh thread deliberately.

**Trigger signals for a break:**
- Responses start missing scope items that were explicit in earlier rounds.
- User notices repeated re-explanation of decisions that are already captured in `DIARY_PRODUCT_DECISIONS.md`.
- Claude Code starts second-guessing patterns (e.g., ERR-DI-NNN cadence) that are durable-by-now.
- Any point where context-management feels like it's competing with work-quality for attention.

**Break protocol:**
1. Create `.planning/phases/08-diary-persistence/CONTEXT_HANDOFF.md` summarizing:
   - Sub-rounds completed (SHAs + one-line summaries).
   - Active decisions not yet reflected in code (from `DIARY_PRODUCT_DECISIONS.md`).
   - Outstanding work with sub-round indices and exit criteria.
   - Open questions awaiting user input.
   - Specific code surfaces in flight (files edited, commits pending).
   - Last known good state (typecheck clean at SHA X).
2. Commit the handoff doc.
3. Fresh thread bootstraps from three files:
   - `.planning/research/DIARY_AUDIT.md` (what exists pre-workstream).
   - `.planning/research/DIARY_PRODUCT_DECISIONS.md` (why we're doing what we're doing).
   - `.planning/phases/08-diary-persistence/CONTEXT_HANDOFF.md` (where we are now).
4. Continue from the next sub-round.

The goal is to forecast this break rather than react to it. If we're mid-§8.4 and context is saturating, break at the sub-round boundary (after §8.4 ships), not mid-commit.

## Risk register

- **`[inferred]` Supabase CLI migration drift** — the Bug-1 sequence flagged an out-of-band migration-history discrepancy. If it recurs in §8.3, repair history before proceeding; don't bypass.
- **`[skill-dependent]` Bulgarian voice drift** — skill output quality is trusted in general but verified per-batch. First-variant gate in §8.8 is the safety net.
- **`[inferred]` Endpoint response-time on cold start** — localStorage is instant; server round-trip introduces latency. Optimistic updates in §8.5 mitigate the UX impact but don't eliminate the "feel" change. Worth UAT-checking in §8.9.
- **`[inferred]` Rotation math at the boundary** — if variant-count changes (e.g., adding a 4th variant to Waxing Crescent), users who wrote 3 entries move from variant 0 (of 3) to variant 3 (of 4, = 0 again) — no break, just a soft re-start. Document in §8.8 so the user understands the rotation isn't stable across library edits.
- **`[inferred]` Premium-gate premature enforcement** — §8 explicitly does not ship the gate; if any code path accidentally enforces one, catch in §8.9 UAT. PREMIUM_MATRIX row 13 is the contract.

## Closing

§8.0 is exactly two files: this plan and the decisions doc. No code changes. After user review, §8.1 opens for immediate fixes as its own commit batch with its own sign-off. Each subsequent sub-round follows the same pattern: scope declared, user-approved where required (Bulgarian copy, schema), shipped, moved on.

The workstream is big but bounded. Every decision that could have been taken now has been (see `DIARY_PRODUCT_DECISIONS.md`); the remaining work is execution with per-sub-round checkpoints.
