# §8.3 — Pre-work verification report

**Opened:** 2026-04-21 (§8.3 kickoff)
**Status:** **Holding for founder decision on two path forks before the migration drafts.**
**Plan ref:** `.planning/phases/08-diary-persistence/00-PLAN.md` §8.3.
**Sealed schema:** `.planning/phases/08-diary-persistence/08-02-SCHEMA.md`.

Two verification actions ran before any DDL was drafted, per founder instruction. Both resolved cleanly — neither is ambiguous — but both fork into options that need a founder call.

---

## Action 1 — Local-first execution path

**Outcome: No local Supabase instance exists. The project explicitly opts out of the local Docker stack.**

Evidence:

- `supabase/config.toml:1-4` is unambiguous:
  > `# Supabase CLI project config — minimal. We do NOT use Supabase's`
  > `# local dev stack (docker-compose, studio, inbucket, edge-functions).`
  > `# The dev workflow hits the hosted Supabase project directly via`
  > `# `supabase db push --db-url <DATABASE_URL>`.`
- `MIGRATION_TOOLING.md:30-32`:
  > `# 3. Dry-run against a local psql if available, OR apply directly to`
  > `#    the hosted dev database (we don't have staging today):`
  > `pnpm supabase db push`
- No `docker-compose*` or `Dockerfile` at the repo root.
- No `supabase:start` / `supabase:local` / `dev:db` script in any `package.json`.
- `supabase/config.toml` has only `project_id = "celestia-ai"` and nothing else — no `[db]`, no `[studio]`, no `[api]` stanzas that would indicate local-stack intent.

`[verified]` this is a deliberate choice, not a gap: the commented preamble of `config.toml` frames the absence of the local stack as the project's convention.

There's also no staging DB. The hosted Supabase project serves as dev, staging, and prod simultaneously — `MIGRATION_TOOLING.md:31` `"we don't have staging today"` is explicit.

### Sub-options per founder instructions (plus one more worth surfacing)

**Option (a) — Stand up local Supabase as part of §8.3.**
Install Docker Desktop (Windows → requires WSL2), run `pnpm supabase start`, let it pull ~10 container images (postgres, studio, inbucket, edge-functions, realtime, storage, kong, auth, etc.) and bind default ports. Disk cost: ~2-3 GB. Setup cost: 20-40 min depending on Docker-Desktop familiarity. Goes **against** the explicit convention in `config.toml:1-4` unless that convention is being revisited.

- **Pro:** true local testing; prod is never a first-run surface.
- **Con:** contradicts the documented "we do NOT use Supabase's local dev stack" convention. If adopted here, `config.toml` and `MIGRATION_TOOLING.md` need updates too — otherwise the next contributor reads the docs, doesn't realize §8.3 broke the convention, and we're back in drift territory.
- **Scope creep:** standing up + documenting the local stack is arguably its own phase, not §8.3 scope.

**Option (b) — Run against prod without local testing, founder-accepted risk.**
Matches the existing convention. Migration runs `pnpm supabase db push` against the hosted DB. Probe script runs against prod to verify. Risk: if the migration half-applies and leaves the DB in a broken state, recovery requires manual intervention; the only safety net is the DDL itself being review-tight before it runs.

- **Pro:** consistent with documented workflow; no new infrastructure.
- **Con:** prod is the first execution surface. Mitigated by (1) DDL tightness (every line was scrutinized in §8.2), (2) a transactional-rollback dry-run if possible (see option (d) below), (3) §8.3's stop-and-surface discipline on any failure.

**Option (c) — Supabase branching.**
Supabase's branching feature (available on Pro plan) creates a branch DB per git branch, letting migrations land on the branch's DB first before merging to main. Need to check whether the current Celestia plan includes branching. Not covered by any existing doc; would be new territory.

- **Pro:** closest thing to "local-first" without local Docker.
- **Con:** plan dependency unknown; requires dashboard config; adds a new workflow step not captured in `MIGRATION_TOOLING.md`.

**Option (d) — `BEGIN; <migration>; ROLLBACK;` dry-run against prod connection (not in original three).**
Postgres DDL is transactional. Connecting to prod via `psql "$DATABASE_URL"` and running the full migration inside a single transaction, then rolling back, verifies that every DDL statement parses and executes against the actual target without persisting. No new infra, no convention departure, and catches parse errors / constraint conflicts / trigger-creation issues that `supabase db push` would otherwise attempt in sequence.

- **Pro:** zero-infra middle ground; matches `MIGRATION_TOOLING.md:31` "local psql if available" framing (the `psql` CLI works against a remote DB URL just as well).
- **Pro:** catches every error the actual migration would catch, with full rollback protection — as safe as a local DB for DDL verification purposes.
- **Con:** requires local `psql` CLI installed; on Windows, needs `PGCLIENTENCODING=UTF8` discipline. Doesn't test `supabase db push`'s migration-history tracking — that only happens on the real push.
- **Pro:** compatible with option (b) as a defense-in-depth step. The two aren't mutually exclusive.

`[inferred]` **Recommendation: (d) + (b)** — dry-run the full migration via `psql --single-transaction --set=ON_ERROR_STOP=on -f <migration.sql> "$DATABASE_URL"` with a manual `BEGIN; \i <migration.sql>; ROLLBACK;` block or equivalent, verify clean parse/execute, then run the real `supabase db push` for actual application. Zero departure from the documented workflow; adds one psql-level safety step. The probe script runs against prod either way (no local surface to probe otherwise).

**Founder call needed:** pick among (a), (b), (c), (d)+(b), or another combination.

---

## Action 2 — Probe script status

**Outcome: `audit-schema-drift.mjs` is BROKEN. `probe-column-type.mjs` is runnable but narrow. Neither fits §8.3 as-is.**

### `audit-schema-drift.mjs` — broken

`[verified via filesystem check]`:
- Script at `apps/web/scripts/diagnostics/audit-schema-drift.mjs:51` hardcodes `META_DIR = __dirname + '../../../../packages/db/drizzle/meta'`.
- `packages/db/` was deleted in commit `52bb5e1` (message: `"chore(db): remove stranded Drizzle schema package — 0 runtime consumers confirmed, prior contents moved to supabase/seed/"`).
- `ls packages/` → `astrology  config  core  ui` — no `db`.
- `ls packages/db/drizzle/meta` → `No such file or directory`.
- Running `pnpm --filter @celestia/web run diag:drift` would crash on `readdir(META_DIR)` with ENOENT.

This is a **known-stale** condition documented in `MIGRATION_TOOLING.md:79`:
> `**CI drift check.** `apps/web/scripts/diagnostics/audit-schema-drift.mjs` exists as tooling but isn't wired to CI. Wiring is a follow-up once `supabase db diff` shapes the drift signal we want to check.`

and line 68:
> `Today the script still reads the old Drizzle snapshot; re-target is a follow-up task when `packages/db/` is deleted.`

The follow-up has been deferred; `packages/db/` is now gone and the script is stranded. **Not suitable for §8.3 probe work.**

### `probe-column-type.mjs` — runnable, narrow-purpose

`[verified via read of the full file]`:
- Uses `@supabase/supabase-js` service-role client to insert canonical values against a single column to diagnose type errors.
- Config is per-probe: edit `PROBE_TABLE` / `PROBE_COLUMN` / `PROBE_VALUES` at the top of the file for each investigation.
- Requires `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars.
- Service-role `@supabase/supabase-js` client uses PostgREST — **cannot read `information_schema`**. This is the fundamental limit that makes the script unfit for "verify 14 schema facts against live DB" scope.

The script is a useful **pattern reference** (env-loading discipline, service-role usage, setup/teardown with FK-satisfying user upsert) but is an insert-probe, not a schema-coverage probe. Reusing its configuration conventions and adapting to `information_schema` read queries is reasonable.

### What §8.3 actually needs

A schema-coverage probe with access to `information_schema` and `pg_catalog` — which means:

- Direct Postgres connection via `postgres` npm package with `DATABASE_URL` (same approach `audit-schema-drift.mjs` uses at `:44, :53, :161`), **not** the `@supabase/supabase-js` service-role client.
- Covers all 14 facts from the §8.3 scope list: column names/types/nullability, PK, UNIQUE, indexes present and absent, CHECK constraints, RLS enabled, policies with exact predicate, trigger + generic function + comments.
- Idempotent (safe to re-run); prints a pass/fail table with line per fact.
- Exit code 0 if all facts match sealed DDL, 1 if any disagreement, 2 if the DB can't be reached.

### Sub-options for Action 2

**Option (α) — Write a new script `probe-diary-schema.mjs`** scoped to this table's 14 facts, following `audit-schema-drift.mjs`'s postgres-via-DATABASE_URL conventions. Commits as `apps/web/scripts/diagnostics/probe-diary-schema.mjs` with an `apps/web/package.json` script `diag:probe-diary`. Sealed scope: the §8.3 coverage list.

**Option (β) — Write a new *generic* probe `verify-migration.mjs`** that accepts a migration file path and dynamically derives expected facts from the DDL, checking each against live schema. Broader reuse across future migrations. Higher design cost; deeper potential for bugs in the parse-DDL-to-expectations step.

**Option (γ) — Repair `audit-schema-drift.mjs`** to read `supabase/migrations/**.sql` (parsing DDL into expected-schema shape) rather than Drizzle snapshot JSON. This is the follow-up `MIGRATION_TOOLING.md:79` flags as deferred. Effectively collapses into option (β) with a forced rename.

`[inferred]` **Recommendation: (α)** — scope to §8.3. The 14-fact coverage is explicit, the sealed DDL is frozen, and a diary-specific probe is 150-250 lines of focused code vs the 300-500 lines of a generic variant with a DDL-parsing layer. Option (γ) is worth it eventually but shouldn't block §8.3.

**Founder call needed:** pick among (α), (β), (γ), or another approach.

---

## Summary of forks requiring founder decision

| Action | Status | Options | Recommendation |
|---|---|---|---|
| **1 — local-first** | No local instance; explicit project convention | (a) stand up local / (b) prod-only / (c) Supabase branching / (d) `psql` transactional dry-run against prod + (b) | **(d) + (b)** — dry-run via `psql BEGIN; ... ROLLBACK;`, then real `supabase db push`. Respects existing convention, adds a cheap safety step. |
| **2 — probe script** | `audit-schema-drift.mjs` broken (deleted path); `probe-column-type.mjs` narrow | (α) diary-scoped new script / (β) generic migration probe / (γ) repair audit-schema-drift | **(α)** — focused to §8.3's 14-fact coverage list. |

Standing by for decision on both before drafting the migration file and the probe script. Once sealed, §8.3 proceeds in the commit order the founder specified.
