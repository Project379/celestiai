# Migration Tooling

**Canonical path for Celestia AI schema changes, effective 2026-04-20.**

This doc replaces the migration half of `.planning/research/DRIZZLE_DECISION.md` (see §9 of that file for the reversal). Drizzle is removed; Supabase CLI owns migrations and typed-client generation from here on.

---

## One-line summary

Schema changes ship as timestamped SQL files under `supabase/migrations/`, applied via `pnpm supabase db push` against the hosted Supabase project, with types regenerated into `packages/db-types/` (or wherever we land them) via `pnpm supabase gen types typescript --linked`.

## Why this replaces Drizzle

2026-04-20 drift audit showed `packages/db/drizzle/` represented a schema that doesn't exist in production — 13 columns across 5 tables diverged. Drizzle migrations were not reliably applied; whoever last altered production `charts.approximate_time_range` to `tstzrange` did not use Drizzle, and the text declaration in the Drizzle schema silently drifted. The audit artifact lives at `.planning/research/SCHEMA_DRIFT_AUDIT.md`; the reversal is documented at `.planning/research/DRIZZLE_DECISION.md §9`.

## Workflow

### Creating a migration

```bash
# 1. Create a new timestamped migration file.
pnpm supabase migration new <descriptive_snake_case_name>
# → writes supabase/migrations/<timestamp>_<name>.sql

# 2. Edit the file. Write forward-only DDL. Don't emit DROP statements
#    for anything with production data unless the data migration is
#    explicit in the same file.

# 3. Dry-run against a local psql if available, OR apply directly to
#    the hosted dev database (we don't have staging today):
pnpm supabase db push
# → applies any migration whose hash isn't in supabase_migrations.schema_migrations yet

# 4. Regenerate types.
pnpm supabase gen types typescript --linked \
  > <path/to/database.generated.ts>
# (target path is TBD — see "Open items" below)

# 5. Commit the migration file + regenerated types together.
```

### Linking to the project

First-time setup per machine:

```bash
pnpm supabase login     # one-time, interactive
pnpm supabase link --project-ref <project-ref>
```

The project-ref comes from the Supabase dashboard URL. Don't commit it — it's per-developer/CI context.

### Reading a migration someone else wrote

`supabase/migrations/` is chronological by timestamp. Each file is a plain SQL DDL script that Postgres executes top-to-bottom. No magic, no DSL. If you can read Postgres docs you can read a migration.

### Drift detection

`apps/web/scripts/diagnostics/audit-schema-drift.mjs` compared Drizzle snapshot JSON to live `information_schema`. Post-Drizzle, the script is retargeted to compare the declared schema from `supabase/migrations/**.sql` (or a `supabase db diff` invocation that produces the equivalent) against live schema. If CI catches drift, someone applied a change outside the migration system — that's the regression the audit prevents.

Run via:

```bash
pnpm --filter @celestia/web run diag:drift
```

Today the script still reads the old Drizzle snapshot; re-target is a follow-up task when `packages/db/` is deleted.

## What NOT to do

- **Do not alter production schema via the Supabase dashboard** unless emergency. The change won't be in `supabase/migrations/` and the audit will flag it. If it's a real emergency, immediately capture the DDL that was applied and land it as a retroactive migration file with a comment explaining the out-of-band origin.
- **Do not reintroduce Drizzle** without re-running the §4.2 cost/benefit analysis against the drift history. The 2026-04-18 decision to keep it was wrong in hindsight; the bar for reintroducing it is higher than "I like its TypeScript API."
- **Do not write "down" migrations.** Supabase CLI's workflow is forward-only. If you need to revert, write a new forward migration that reverses the change. Down migrations are easy to get wrong and we don't run them in prod anyway.

## Open items

- **Where do generated types live?** `packages/db/` is being deleted. Options: `packages/db-types/` (new package), `apps/web/lib/types/database.generated.ts` (web-local), or top-level `database.generated.ts`. Pick when generation is first run. For now, out of scope.
- **CI drift check.** `apps/web/scripts/diagnostics/audit-schema-drift.mjs` exists as tooling but isn't wired to CI. Wiring is a follow-up once `supabase db diff` shapes the drift signal we want to check.
- **Seed data.** `packages/db/src/seed/data/*` (Bulgarian cities, crystal catalog) moves to `supabase/seed/` during the `packages/db/` deletion commit. The loader scripts that used Drizzle are deleted; seed files become reference data consumed by whatever ad-hoc tooling the next seed pass writes.

## Trail

- Reversal rationale: `.planning/research/DRIZZLE_DECISION.md §9`
- Drift audit: `.planning/research/SCHEMA_DRIFT_AUDIT.md`
- Drift script: `apps/web/scripts/diagnostics/audit-schema-drift.mjs`
- This doc: `MIGRATION_TOOLING.md` (repo root)
