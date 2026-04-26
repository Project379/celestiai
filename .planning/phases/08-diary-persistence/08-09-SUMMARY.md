# §8.9 — UAT harness verification round close summary

**Opened:** 2026-04-26 (after §8.8 close — prompt library variant expansion + rotation).
**Closed:** 2026-04-26 (typecheck-verified monorepo-wide; harness 100/101 with cascade running live; §8 workstream closes).
**Outcome:** Four new verification blocks added to `apps/web/scripts/m3-uat-harness.mjs` covering the post-§8.6/§8.7/§8.8 surfaces — diary prompt rotation math, markdown export formatter, GDPR export shape (diaryEntries inclusion), and GDPR cascade smoke (env-gated). Harness baseline 81 pass / 1 skip / 82 total → 100 pass / 1 skip / 101 total. All four blocks pass clean against current HEAD; no regressions surfaced in pre-existing 82 assertions.

---

## Pre-run baseline check

Before writing any new code, the existing harness ran against current HEAD (post-§8.8 commits `5a87976` → `5fae192`). Result: **81 pass / 0 fail / 1 skip / 82 total** — matches the prior baseline at `.planning/phases/m3-uat/RESULTS.json`. The §8.8 Stage 3+4 refactor (`a38c23d`) which changed `getManifestPrompt` from single-prompt-record to variant-array-with-rotation introduced no consumer-side regressions despite the signature change. Confirmed `ManifestEntryForm` is the single call site as claimed in the §8.8 close.

The 1 skip is the dev-mode `redirect_url` round-trip test — Clerk's protect-rewrite in dev mode does not expose the `Location` header, requiring browser UAT for full session_id verification. Unrelated to §8 workstream; carried over unchanged.

---

## New harness blocks — four additions, +19 assertions

### Block 1 — Rotation math (pure-function, no API)

Imports `getManifestPrompt` and `MANIFEST_PROMPTS` directly from `apps/web/lib/manifest/prompts.ts`. Node 24's built-in `--experimental-strip-types` (auto-enabled at 23.6+, explicit at 22.6+) handles the `.ts` import from the `.mjs` harness because both target modules use `import type` only — no runtime `@/` path-alias resolution needed.

| # | Assertion | What it catches |
|---|---|---|
| 1 | `MANIFEST_PROMPTS` shape: 7 phases × 3 variants + `last_quarter` × 2 | Variant count drift in source data |
| 2 | 3-variant rotation against `new`: counts 0/1/2/3/6 → variants `[0,1,2,0,0]` | Modulo formula off-by-one or wrap break in 3-variant phases |
| 3 | 2-variant rotation against `last_quarter`: counts 0/1/2/4 → variants `[0,1,0,0]` | Modulo formula off-by-one or wrap break in 2-variant phases |
| 4 | Per-phase invariant: `getManifestPrompt(phase, k * variants.length).heading === variants[0].heading` for all 8 phases | Catches a class of bugs where one phase's array is malformed (non-tuple, frozen wrong, etc.) without the others tripping |

**Decision: empty-array runtime assertion test was deliberately dropped.** The `throw new Error('No prompt variants registered for phase ${phaseId}')` branch in `getManifestPrompt` is statically unreachable — the tuple type `readonly [ManifestPrompt, ...ManifestPrompt[]]` guarantees non-empty at compile time, and a fake phase id triggers a `TypeError` from `undefined.length` rather than the documented Error. Mutation testing (forcing `MANIFEST_PROMPTS.new = [] as any` to exercise the throw) would introduce state leak risk worse than the coverage it adds. The defensive throw stays in code as runtime documentation; the per-phase invariant test (assertion #4) covers the actual behavior at scale.

### Block 2 — Markdown export (pure-function, no API)

Imports `buildDiaryMarkdown` and `buildDiaryFilename` from `apps/web/lib/diary/export.ts`. Same import mechanism as Block 1.

| # | Assertion | What it catches |
|---|---|---|
| 1 | First codepoint is U+FEFF (UTF-8 BOM) | Windows / Excel charset detection regression |
| 2 | Contains `# Лунен дневник` title | Title removal or rename |
| 3 | Contains `Изтеглен на ` prefix and ` г.` suffix on export-date line | Bulgarian long-form date formatter regression (drift to ISO or English) |
| 4 | Contains ` · ` (U+00B7 MIDDLE DOT) and does NOT contain ` • ` (U+2022) or ` — ` (U+2014) | Codepoint drift on the per-entry separator — the comment in `export.ts:11-15` warns that similar-looking codepoints render inconsistently across markdown consumers |
| 5 | Each entry's intentions numbered `I.` / `II.` / `III.` | Roman-numeral helper drift (must stay in sync with `romanize()` in `ManifestEntryForm.tsx`) |
| 6 | Both entries' phase names (`Новолуние`, `Растяща сърп`) appear | Per-entry header omission |
| 7 | `buildDiaryFilename` matches `/^celestia-дневник-\d{4}-\d{2}-\d{2}\.md$/` | Filename pattern drift |

The export-date assertion deliberately checks prefix+suffix substrings (not a regex on numeric date) so that the test stays robust across timezones — the Date passed in is UTC `2026-04-26T12:00:00Z`, but `buildDiaryFilename` uses local-time accessors, and `formatBgLongDate` uses `Intl.DateTimeFormat('bg-BG', ...)`. The shape stays identical regardless of locale; only the numeric date varies. (Spec said "Изтеглен на YYYY-MM-DD г." — actual code emits Bulgarian long form like "Изтеглен на 26 април 2026 г." Code is truth; assertion adapted.)

### Block 3 — GDPR export shape (auth'd API)

Seeds a fresh diary entry with the existing test user's session JWT, then hits `GET /api/gdpr/export`. **Important note**: the existing `checkDiaryCrudFlow` at line 1107 deletes its own probe entry at the end of that block, so by the time GDPR export runs the user has zero diary entries unless we seed a new one inside this block. The trailing `cleanup()` sweeps this seeded entry along with the rest of the test user's data.

| # | Assertion | What it catches |
|---|---|---|
| 1 | Setup: `POST /api/diary/entries` → 200 with id | Setup failure short-circuit (skips downstream assertions if setup didn't seed) |
| 2 | `GET /api/gdpr/export` → 200 + `diaryEntries` is an array | Export endpoint regression or missing `diaryEntries` key |
| 3 | `diaryEntries` array contains the just-seeded entry id | Filter regression — the §8.7 Commit 3 (`01a8b82`) wiring of diary entries into the export must remain in place |
| 4 | Full payload shape: `exportedAt` + `user` + `charts` + `aiReadings` + `dailyHoroscopes` + `diaryEntries` | Shape drift — adding/removing top-level keys without GDPR review |

### Block 4 — GDPR cascade smoke (env-gated, isolated test user)

Spins a dedicated throwaway Clerk user (`m3uat-cascade@celestia-ai.dev`, overridable via `UAT_CASCADE_EMAIL` env var), seeds a diary entry, back-dates `users.deletion_scheduled_at` past now, then hits `GET /api/cron/cleanup-deleted-accounts` with the cron Bearer token. After cron returns, service-role queries verify diary entries, users row, and the Clerk account itself are all gone.

| # | Assertion | What it catches |
|---|---|---|
| 1 | `GET /api/cron/cleanup-deleted-accounts` → 200 + `deleted ≥ 1` | Cron endpoint or auth regression; cascade row-count drop |
| 2 | Service-role query: `SELECT COUNT(*) FROM diary_entries WHERE user_id = <cascade_user>` → 0 | `deleteUserDiaryEntries` helper regression — diary entries leaking past the cascade |
| 3 | Service-role query: `SELECT COUNT(*) FROM users WHERE clerk_id = <cascade_user>` → 0 | `users` row leak past the cascade |
| 4 | Clerk REST: `GET /v1/users/<cascade_user>` throws (404 from Clerk) | Clerk account leak past the cascade — `clerk.users.deleteUser` not being called or silently failing |

**Env-gating decision:** if `process.env.CRON_SECRET` is missing, the block records a documented skip (`'CRON_SECRET not set — pre-launch sweep should export it before running the harness'`) rather than failing. Rationale: the harness should remain broadly runnable across CI / dev / contractor environments without secret provisioning. The pre-launch full-verification sweep, run by the founder before launch, exports `CRON_SECRET` and gets the assertions hard-required.

**Isolation decision:** spun a dedicated throwaway test user rather than reusing the shared `TEST_EMAIL`. Cascade is destructive — the cron deletes the user across `diary_entries`, `users`, and Clerk itself. Sharing the user with the rest of the harness would couple ordering (cascade must be dead-last) and risk state corruption if the cascade fails partway and leaves orphaned rows. Dedicated user makes the block re-runnable in isolation, atomic, and free of ordering coupling. Cost was a 3-line refactor of `ensureClerkUser` to accept an optional `email` parameter (default = `TEST_EMAIL`), not a ~50-line duplicate helper.

**Defensive cleanup:** wrapped in try/finally. If the cascade ran clean (assertions all passed and the user is gone), `cascadeUserId` is nulled out and the finally is a no-op. If the cascade failed mid-flow (assertion failure or thrown exception), the finally best-effort deletes the diary entries, users row, and Clerk account — tolerant of already-deleted state.

---

## Spec corrections applied silently

Three drifts between the §8.9 plan spec and the actual code were corrected unilaterally — code is truth.

| Spec said | Actual code | Where |
|---|---|---|
| `formatDiaryAsMarkdown` | `buildDiaryMarkdown` | `apps/web/lib/diary/export.ts:47` |
| `recordResult(name, status, detail)` | `record(name, status, detail)` | `apps/web/scripts/m3-uat-harness.mjs:80` |
| `POST /api/cron/cleanup-deleted-accounts` | `GET /api/cron/cleanup-deleted-accounts` | `apps/web/app/api/cron/cleanup-deleted-accounts/route.ts:13` |
| `Изтеглен на YYYY-MM-DD г.` | `Изтеглен на 26 април 2026 г.` (Bulgarian long form) | `apps/web/lib/diary/export.ts:42-45` |

---

## Final harness state

| | Pass | Fail | Skip | Total |
|---|---|---|---|---|
| Pre-§8.9 baseline | 81 | 0 | 1 | 82 |
| Post-§8.9 (CRON_SECRET set) | 100 | 0 | 1 | 101 |
| Post-§8.9 (CRON_SECRET unset) | 96 | 0 | 5 | 101 |

Delta breakdown: +4 (rotation) + 7 (markdown) + 4 (GDPR shape) + 4 (cascade) = +19 pass, all four blocks active.

---

## Manual cross-device UAT runbook (founder, pre-launch, ~10 min)

Automating a multi-JWT / cross-device scenario adds little signal beyond the existing CRUD flow. True cross-device verification is a founder-at-launch-time check. Captured here so the §8.9 close has the runbook in one place:

1. **Browser A: sign in, write a diary entry, verify it shows in history.** Standard flow — confirms write reaches the server, history reads back.
2. **Browser B (different browser, same Clerk account): sign in, navigate to diary, verify entry from Browser A is visible.** Confirms cross-device read — the entry persisted server-side and is fetched on the second device.
3. **Browser A: open DevTools Console, run `localStorage.clear()`, reload diary page, verify entry is still visible.** Confirms reads come from the server, not localStorage. This was the §8 workstream's load-bearing claim — diary persistence is server-backed, not client-cached. If the entry disappears here, the claim is wrong and there's a regression in the read path.
4. **Browser B: write a new entry, return to Browser A, reload, verify Browser A sees it.** Confirms bi-directional sync — both write paths converge on the server.

If any of the four steps fails, surface immediately; do not launch.

---

## Disciplines inherited and applied

- **Typecheck green before push** — `npx turbo run typecheck` clean across all 5 packages (web, mobile, core, astrology, ui) before each of the two commits.
- **Atomic commits per deliverable** — split into 2 commits at the natural pure-vs-API seam. Per-§8.9 instruction "single commit if ≤250 lines; split if larger" — final diff was +330/-6 lines, triggering split.
  - Commit 1 (`8752f51`) — pure-function blocks (rotation + markdown), 147 insertions
  - Commit 2 (`1204017`) — API blocks (GDPR shape + cascade) + `ensureClerkUser` email-param refactor + main() wiring, 186 insertions / 9 deletions
- **Surface-before-doing on scope changes** — two scope decisions surfaced before writing code: (a) whether to test the unreachable empty-array assertion (decided: drop), (b) whether to share the cascade test user with the existing flow or isolate (decided: isolate). Both surfaced with options, recommendation, and reasoning; both confirmed before code was touched.
- **Stop-and-surface if rotation drift surfaced** — pre-run check on existing 82 assertions passed clean (81/0/1) before any new code was written, confirming `ManifestEntryForm` is the single `getManifestPrompt` consumer as claimed in §8.8 and the signature change introduced no regression.
- **Stop-and-surface if GDPR export shape changed since §8.7** — Block 3 verified the export shape against §8.7 Commit 3 wiring: `exportedAt` + `user` + `charts` + `aiReadings` + `dailyHoroscopes` + `diaryEntries`. No drift.

---

## Commit trail

| Commit | SHA | What |
|---|---|---|
| Pure-function blocks | `8752f51` | `test(uat): §8.9 harness additions for diary rotation math + markdown export` |
| API blocks | `1204017` | `test(uat): §8.9 harness additions for GDPR export shape + cascade smoke` |
| Close summary | (this doc) | §8.9 close summary |

---

## §8 workstream — closed

§8.0 through §8.9 are all closed. The full chain from product decisions → schema → CRUD → markdown export → GDPR export → GDPR cascade → prompt-library variant expansion → UAT harness verification has shipped end-to-end:

| Phase | Closed | What shipped |
|---|---|---|
| §8.0 | (decisions captured pre-execution) | `.planning/research/DIARY_PRODUCT_DECISIONS.md` — 3-variant per phase, server-backed, GDPR-cascading, markdown-exportable |
| §8.1 | — | (rolled into §8.2) |
| §8.2 | 2026-04-22 | `diary_entries` table + RLS + UNIQUE(user_id, entry_date) constraint |
| §8.3 | 2026-04-22 | Pre-work + recon + dry run; `useManifestEntries` localStorage-only audit |
| §8.4 | 2026-04-22 | `/api/diary/*` CRUD with `ERR-DI-NNN` error domain + Bulgarian 401/404 |
| §8.5 | 2026-04-23 | `useManifestEntries` cutover from localStorage to API; `ManifestHistory` reads from server |
| §8.6 | 2026-04-23 | Markdown export (`buildDiaryMarkdown` + `downloadDiaryMarkdown`) — UTF-8 BOM, U+00B7 separator, Bulgarian long-form dates |
| §8.7 | 2026-04-23 | GDPR cascade in `cleanup-deleted-accounts` cron + diary entries in `/api/gdpr/export` |
| §8.8 | 2026-04-24 | Prompt library refactored to variant arrays; 24 prompts (7 × 3 + 1 × 2) generated and grammar-audited; rotation via entry-count modulo |
| §8.9 | 2026-04-26 | UAT harness extended with rotation/markdown/export-shape/cascade verification (this doc) |

Pre-launch prerequisite item 8 (diary persistence gate) is now eligible to move from `[deferred post-ephemeris]` to `[done]`. Updating in the same commit as this summary.

---

## Surfaced: pre-launch prerequisites still open

Per the closing instruction, surveying remaining `PRE_LAUNCH_PREREQS.md` items as item 8 closes:

| # | Item | Status |
|---|---|---|
| 1 | Telemetry / analytics wired | `[not started]` |
| 2 | Error monitoring (Sentry or equivalent) | `[not started]` |
| 3 | Browser UAT sign-off (recurring per release) | `[not started]` |
| 4 | Load-test Scenarios B and C passing | `[blocked]` on M4 |
| 5 | AI provider verification (OpenRouter/Llama) | `[not started]` |
| 5a | Fallback strategy for AI provider outages (product decision) | `[not started]` |
| 6 | Swiss Ephemeris validation | `[done]` (closed 2026-04-21) |
| 7 | Privacy / GDPR compliance (cookie consent, copy review, processor contracts) | `[not started]` |
| 8 | **Diary persistence** | **`[done]` — closing now via this summary** |
| 9 | Third-party licensing compliance | `[partial]` — `sweph` resolved (§9.1 + §9A); service-provider TOS review outstanding |

Hard correctness gates still open: items **2, 7**. Items **5a** is a founder product call that doesn't depend on engineering. The rest are tractable incrementally; none block §8 closure.
