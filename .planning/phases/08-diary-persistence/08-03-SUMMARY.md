# §8.3 — Close summary

**Opened:** 2026-04-21 (§8.3 kickoff after §8.2 sealed).
**Closed:** 2026-04-21.
**Outcome:** `public.diary_entries` live in production with schema verified by 19/19 probe facts against the sealed §8.2 DDL.

---

## Final state

- `public.diary_entries` created in prod via `supabase db push` applying `supabase/migrations/20260421150801_create_diary_entries.sql`.
- `public.set_updated_at()` generic trigger function introduced as a reusable primitive for any future table needing `updated_at` maintenance.
- All 19 concrete verification facts (from the §8.3 14-item coverage list) pass against prod. Dry-run prediction matched prod reality exactly — zero divergence between the in-transaction probe output and the post-commit probe output.
- Supabase CLI migration history repaired — both pre-existing drifts resolved without touching actual schema.

---

## Execution trail (chronological)

| Step | Command | Outcome |
|---|---|---|
| 1 | Pre-work: verify local-Supabase path + probe-script availability | No local stack by project convention; `audit-schema-drift.mjs` stale; `probe-column-type.mjs` narrow — neither fit-for-purpose. Findings in `08-03-PREWORK.md`. |
| 2 | Founder call: path (c) Supabase branching | Initial outcome 1 (branching available per dashboard). |
| 3 | `pnpm exec supabase branches create preview-8-3-diary` | **402** — Management API enforced Pro-plan gate. Dashboard surfaces feature for upgrade-discovery, API is authoritative. Outcome reversed to 2-corrected. |
| 4 | Founder call: path (d) pure-Node dry-run via `postgres` npm package + `BEGIN/ROLLBACK` | No Pro upgrade; pre-launch cash conservation; dry-run catches migration-failure class that matters for this DDL. |
| 5 | Refactor probe scripts, write `dry-run-migration.mjs` | `runFactsOnClient` extracted; `FACTS` hoisted to `lib/diary-facts.mjs`; new `dry-run-migration.mjs` accepts migration + facts, throws sentinel to force ROLLBACK after in-transaction probe. All four scripts parse clean. |
| 6 | First dry-run against prod | **Exit 2**. `cannot use subquery in DEFAULT expression (0A000)` at the `DEFAULT (select auth.jwt()->>'sub')` on `user_id`. The dry-run caught a latent bug in the §8.2 sealed DDL — `(select ...)` wrapper valid in RLS context, invalid in DEFAULT context. |
| 7 | Founder call: drop DEFAULT entirely instead of patching to unverified scalar form | `user_id TEXT NOT NULL` with no DEFAULT; §8.4 endpoints pass explicitly from auth middleware's JWT sub. Louder failure mode than silent DEFAULT misbehavior. Drift-tracker #11 filed. |
| 8 | Second dry-run with amended migration | **Exit 0, 19/19 pass.** DDL parses + executes + all facts verify against in-transaction state. |
| 9 | `pnpm exec supabase db push --yes` | **Blocked**: `Remote migration versions not found in local migrations directory` — phantom `20260413113051`. |
| 10 | Read-only recon (`08-03-RECON.md`) — `supabase migration list` + git-history queries + prod-schema snapshot | Two drifts surfaced: `20260413113051` tracked-no-file (Scenario B, Drizzle→Supabase baseline-squash); `20260420100254` file-no-track (§7 Bug-1 applied out-of-band). |
| 11 | Founder call: pre-flight verify §7 file DDL matches prod reality before Step 2 | Column state + no residual constraints matched ✅. **COMMENT text mismatch** — file produces SQL-quoted enum values, prod has unquoted. Third drift discovered. |
| 12 | Founder call: Option Y' — accept COMMENT divergence, mark `20260420100254` applied, document in #12 | Philosophy: "files are authoritative" preserved; metadata-only divergence accepted; out-of-band-channel audit queued post-launch. |
| 13 | `supabase migration repair --status reverted 20260413113051` | `Repaired migration history: [20260413113051] => reverted`. |
| 14 | `supabase migration repair --status applied 20260420100254` | `Repaired migration history: [20260420100254] => applied`. |
| 15 | `supabase migration list` | Clean state. Both prior drifts resolved. Only `20260421150801` Local-only. |
| 16 | `pnpm exec supabase db push --yes` | `Applying migration 20260421150801_create_diary_entries.sql... Finished supabase db push.` |
| 17 | `pnpm --filter @celestia/web run diag:probe-diary > 08-03-PROBE-PROD.txt` | **19/19 PASS**, exit 0. |
| 18 | Dry-run vs prod-probe diff | Zero divergence. Dry-run prediction matched prod reality exactly. |

---

## Evidence artifacts

- `.planning/phases/08-diary-persistence/08-03-PREWORK.md` — pre-work verification report, Outcome 1 + Outcome 2-corrected.
- `.planning/phases/08-diary-persistence/08-03-RECON.md` — migration-history drift recon (three query outputs + scenario classification + proposed repair).
- `.planning/phases/08-diary-persistence/08-03-DRY-RUN.txt` — successful dry-run output (19/19 pass in-transaction, pre-rollback).
- `.planning/phases/08-diary-persistence/08-03-PROBE-PROD.txt` — successful prod probe (19/19 pass post-commit).

## Code artifacts

- `supabase/migrations/20260421150801_create_diary_entries.sql` — the shipped migration (post-correction: no DEFAULT on `user_id`, historical comment inline).
- `apps/web/scripts/diagnostics/lib/schema-probe.mjs` — probe primitives with `runFactsOnClient` + `runProbe`.
- `apps/web/scripts/diagnostics/lib/diary-facts.mjs` — the 19-fact FACTS list.
- `apps/web/scripts/diagnostics/probe-diary-schema.mjs` — 4-line entry point (imports FACTS, calls runProbe).
- `apps/web/scripts/diagnostics/dry-run-migration.mjs` — reusable BEGIN/ROLLBACK runner.
- `apps/web/package.json` — new scripts `diag:probe-diary`, `diag:dry-run-migration`.

## Doc / planning updates

- `.planning/phases/08-diary-persistence/08-02-SCHEMA.md` — post-seal correction note at top of Sealed DDL; DDL block updated (no `user_id` DEFAULT).
- `.planning/phases/08-diary-persistence/00-PLAN.md` — §8.5 scope carries `maxLength={500}` + `isoDate` disposition; §8.4 scope carries explicit `user_id` handling rule (no DB DEFAULT fallback).
- `.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md` — drift-tracker entries **#11** (DEFAULT subquery pattern-transfer) and **#12** (migration-history drift + out-of-band channel + COMMENT divergence supplementary finding + post-launch queued audit).

---

## Scope limitations preserved from the dry-run / probe

- **RLS JWT-shape verification is §8.4 territory.** Policies compile clean inside the transaction and inside the post-commit probe, but end-to-end isolation only validates when a real Clerk-authenticated request hits `supabase-js` with the configured JWT template. §8.4 will exercise this via authenticated UAT from `m3-uat-harness.mjs`.
- **Idempotency / re-run behavior not tested.** Migration is forward-only and `supabase db push` tracks applied state; re-runs are skipped by tracking, not by DDL idempotency. This is the standard Supabase CLI contract.

## Post-close verification

- `git status --ignored | grep supabase/.temp` — confirmed `project-ref` is properly gitignored (pattern `supabase/.temp/` in repo `.gitignore`); no tracked leak.
- Temp recon/preflight scripts (`_recon-20260421.mjs`, `_preflight-20260421.mjs`) cleaned up after use. Neither committed.

---

## Next: §8.4 opens

API endpoint drafting against the live `public.diary_entries` schema. Five endpoints under `apps/web/app/api/diary/`:

- `POST /api/diary/entries` (upsert-on-conflict, ERR-DI-003 on failure)
- `GET /api/diary/entries` (list, with optional `?phase_id=` for variant-count)
- `GET /api/diary/entries/[id]` (single-read, ERR-DI-005 distinct from 404)
- `PATCH /api/diary/entries/[id]` (update, ERR-DI-006)
- `DELETE /api/diary/entries/[id]` (ERR-DI-007)

Carry-forward discipline:

- **Explicit `user_id` handling** — every INSERT/UPSERT must pass `user_id` from auth middleware's JWT sub. No DB DEFAULT fallback (post-seal correction). Zod validates auth context provided it. `NOT NULL` violation is the intended failure mode for omission.
- **Bulgarian error copy** for ERR-DI-003..007 drafted at endpoint scaffolding time, surfaced to founder for approval before ship (same cadence as ERR-BD-NNN / ERR-DI-001/002 from §8.1).
- **Zod validator** at `apps/web/lib/validators/diary.ts` enforces B's 500-char per-slot cap + A2's `entry_date` bounds (`<=` now+1 day, `>=` users.created_at).
- **M3 UAT harness stub** — unauth 401 shape assertions on all five endpoints, matching the §6 harness updates that ship the birth-data equivalents.

**Estimated scope:** 2-3 rounds per the §8.0 plan. May warrant its own plan checkpoint if it exceeds single-commit digestibility.
