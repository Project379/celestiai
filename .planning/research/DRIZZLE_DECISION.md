# Drizzle vs Supabase Client — Decision Analysis

**Written:** 2026-04-18
**Status:** **REVERSED 2026-04-20** — see §9 at end of this file. Drizzle is being removed from the stack; Supabase CLI adopted for migrations going forward.
**Original status line (preserved for trail):** Decision proposed; not executed. Prerequisite to Option-B migration (`DATA_FETCHING_INVENTORY.md §5.4`).
**Epistemic tags:** `[verified]` / `[inferred]` / `[planned]` / `[assumed]` / `[open]`. Sub-claims get their own tag when they make a different claim than parent.

---

## 1. Why this decision exists

`[verified]` `packages/db/` contains complete Drizzle schemas for every table (users, charts, crystals, audit_logs, ai_readings, daily_horoscopes, push_subscriptions, webhook_events, and more — 18 schema files) plus 10 applied migrations in `packages/db/drizzle/0000..0009_*.sql`. `[verified]` Zero files in `apps/web/` import from `@celestia/db` or use Drizzle for queries. All 103 `.from(table).select(...)` query sites in `apps/web/` use `@supabase/supabase-js` fluent builder.

`[inferred]` Someone set up Drizzle schemas and migrations, then chose the Supabase client over Drizzle for querying. Before reversing that choice for Option B, the reasoning needs to be surfaced or it gets re-made and re-reversed.

---

## 2. The evidence for why Supabase client was picked over Drizzle for queries

### 2.1 Hand-maintained ChartRow type — the smoking gun

`[verified — apps/web/lib/types/chart.ts]` A file-level doc comment explicitly states:

> *"Supabase returns snake_case column names, unlike the Drizzle schema (`@celestia/db/schema`) which uses camelCase. This type is the single source of truth for the Supabase response shape across the web app. If the Drizzle `charts` schema changes, update this type to match."*

The type itself is a hand-maintained `interface ChartRow` with snake_case fields (`birth_date`, `birth_time`, `city_name`, etc.).

`[inferred]` This tells the story directly. Someone:
1. Set up Drizzle with idiomatic camelCase TS property names (Drizzle's default)
2. Wrote queries against Supabase REST which returns snake_case columns
3. Hit the impedance mismatch
4. Chose to hand-maintain a snake_case type (ChartRow) rather than either (a) configure Drizzle to use snake_case in TypeScript or (b) adopt Drizzle's query layer to get camelCase consistency
5. Left a note for future-them to keep the two in sync manually

This is a **workaround to a naming-convention conflict**, not a deliberate preference for Supabase client over Drizzle. The choice was "keep both and bridge manually" not "Supabase client is better."

### 2.2 Supabase RLS + Clerk JWT integration as a secondary pressure

`[inferred]` `apps/web/lib/supabase/server.ts` goes to significant lengths to obtain the Clerk-issued Supabase JWT via a named template (`session.getToken({ template: 'supabase' })`) and pass it as the Authorization header on the Supabase client. Drizzle can do the same by passing a session config to `postgres-js`, but the pattern is less documented and probably required its own research spike. Path of least resistance was to use the Supabase client, which Clerk has first-class integration guides for.

`[assumed]` This is a secondary pressure, not a blocker. Drizzle can work with Supabase Postgres including RLS — `drizzle.config.ts` already has `entities: { roles: { provider: 'supabase' } }` configured. But "can work" with RLS is different from "has documented Clerk template integration like the Supabase client does."

### 2.3 Simplicity of the query patterns

`[verified]` 103 `.from(table).select(...)` call sites in `apps/web/`. `[verified]` Zero use backtick-template nested selects (Supabase's join syntax, e.g. ``.select(`*, charts ( * )`)``). Spot-checked GDPR export — even when the handler reads 4 tables, it's 4 sequential `.from().select('*').eq()` calls with client-side merging, not a join.

`[inferred]` For single-table CRUD without joins, the Supabase fluent builder is a fine match. Drizzle's relational query benefits only show up when you need type-safe joins. We don't.

---

## 3. Answering the user's three specific questions

### 3.1 (a) Do @supabase/supabase-js's generated types already give us most of the type safety we'd get from Drizzle?

`[verified]` **Today: no, because we haven't generated them.** Searching the repo for `database.types.ts` or any file matching `*supabase*types*` returns nothing. The repo has no `supabase/` folder at all — no Supabase CLI config, no migrations there, no generated types. All Supabase client calls today return `data: any` typed through the generic `SupabaseClient` without a schema generic parameter.

`[inferred]` **Tomorrow, if we run the CLI: yes, mostly.** `supabase gen types typescript --linked` (or `--project-id`) produces a `Database` type that can be passed as a generic to `createClient<Database>()`, after which every `.from('charts').select(...)` becomes fully typed with the exact snake_case shape of the Postgres schema. Select narrowing (`.select('id, name')`) correctly narrows the return type. Insert/update payloads become type-checked. This covers approximately 80-90% of what Drizzle's query types provide for simple single-table operations.

`[verified]` **What Drizzle provides that Supabase generated types do not:**
- Typed joins (only beneficial when joins exist — we have zero)
- Typed aggregate helpers (sum, count, group_by) — Supabase builder has `.select('count')` but less ergonomic
- `InferSelectModel<T>` / `InferInsertModel<T>` type helpers for reuse (Supabase gives you `Tables<'charts'>` from the generated file, equivalent in practice)
- camelCase property access (Drizzle default) — though Supabase types give you the honest snake_case which matches the wire format

### 3.2 (b) How often do current queries need joins the Supabase builder can't handle cleanly?

`[verified]` **Zero.** Grep of `apps/web/` for backtick-template nested selects returned no matches. Every multi-table read in the codebase is sequential `.from().select()` calls. `[inferred]` This isn't a limitation of the Supabase builder — it supports FK-following nested selects — but a reflection of how simple our access patterns are. If that changes (e.g., Кръг needs `user_relationships` joined with `users` joined with `charts`), the Supabase builder handles it fine via the nested-select syntax. The ceiling doesn't come into play for months, probably not at all.

### 3.3 (c) Who owns migrations today — Supabase dashboard or drizzle-kit — and which do we keep?

`[verified]` **drizzle-kit owns migrations.** `packages/db/drizzle/` contains 10 applied migrations (`0000_slow_invaders.sql` through `0009_late_starjammers.sql`). `packages/db/package.json` has `db:generate`, `db:push`, `db:studio` scripts wired to drizzle-kit. No `supabase/` folder exists at repo root or anywhere else — Supabase CLI is not in the migration flow. The Supabase Dashboard might have been used for initial setup but current state is drizzle-kit-driven.

`[planned]` **Keep drizzle-kit for migrations.** The current setup works, migrations are versioned in git, and 10 migrations have successfully applied. Rebuilding this on Supabase CLI would be pure churn. Drizzle's typed schemas are also the canonical record of what columns exist — deleting them leaves no checked-in schema source.

---

## 4. The decision

`[planned]` **Keep Drizzle for migrations only. Generate Supabase types for query type safety. Delete the hand-maintained `ChartRow` type.**

Three concrete actions:

**Action 1** — Generate Supabase types via CLI:
```bash
pnpm dlx supabase gen types typescript --project-id <id> > apps/web/lib/types/database.generated.ts
```
Run this as a post-migration step. Add `db:types` script to `packages/db/package.json` that runs after `db:push`:
```json
"db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > ../../apps/web/lib/types/database.generated.ts",
"db:sync": "pnpm db:push && pnpm db:types"
```

**Action 2** — Type all `createServiceSupabaseClient()` (and its siblings) with the generated Database type:
```ts
import type { Database } from '@/lib/types/database.generated'
return createClient<Database>(url, key, { ... })
```
This makes every `.from(table).select(...)` fully typed without touching a single call site.

**Action 3** — Delete `apps/web/lib/types/chart.ts` and replace imports of `ChartRow` with the generated `Tables<'charts'>` from `database.generated.ts`. One-file type swap; mechanical.

### 4.1 What this decision explicitly rejects

**Rejected: migrate the query layer to Drizzle.**

Cost: rewriting 103 query sites in `apps/web/`, plus the ones that will be added in `packages/core/` during Option-B migration. Benefits: camelCase property access, typed joins we don't need.

`[inferred]` The cost/benefit is wrong by a wide margin. Joins are zero today; camelCase-consistency is a taste preference worth no-more-than-a-day of refactor, not weeks; type safety is achievable without Drizzle via the Supabase CLI path above.

### 4.2 What this decision explicitly rejects, part 2

**Rejected: delete Drizzle entirely and move migrations to Supabase CLI.**

Cost: rebuilding migration history, retooling scripts, losing the schemas as canonical source. Benefits: one fewer tool in the stack.

`[inferred]` The cost is real and the benefit is marginal. Drizzle migrations work today. The schemas serve as documentation. Keep the tool that's paying rent.

---

## 5. Consequences for Option-B migration

`[planned]` Given this decision:

- `packages/core/` data-access functions import `Database` from `@/lib/types/database.generated` — NO, can't, that's an `apps/web`-internal path. Move the generated file to `packages/db/src/database.generated.ts` and re-export from `@celestia/db`. That's where it belongs anyway (it's a description of what's in the DB, which is `packages/db`'s job).
- `packages/core/` constructs its own typed Supabase client via the factory in `packages/db/src/client.ts`. Signature becomes: `createSupabaseClient(accessToken: () => Promise<string | null>): SupabaseClient<Database>`.
- Hand-maintained `ChartRow` → `Tables<'charts'>` swap is a pre-Phase-M1 chore. Do it before scaffolding `packages/core/` so the first shared function lands with proper types from day one.
- Drizzle remains `packages/db/src/schema/**` + `packages/db/drizzle/**` + drizzle-kit scripts. `@celestia/db`'s exported surface stays minimal (client factory, generated types, nothing else).

`[open]` One question this decision does not resolve: `packages/db/src/schema/` camelCase TypeScript types are now redundant with `Tables<'charts'>` (snake_case). Keep both? Delete the schema-derived types from the exported surface? `[planned]` Recommend keeping the Drizzle schemas (they're the canonical column definitions) but not re-exporting their inferred types. Query code uses `Tables<>` from generated types; migration code uses the Drizzle schemas directly.

---

## 6. Migration unblock — strict ordering

`[planned]` Ordering matters. Without CI enforcement of type regeneration, deleting `ChartRow` creates a window where the first schema change creates TS errors, and the fastest "fix" under a deadline is re-creating a hand-maintained bridge — the exact failure mode this decision is supposed to eliminate. Execute in order:

### Step 1 — Add Supabase CLI to the toolchain

Either of two shapes, decision point not work:
- **Option A:** install as dev dep at workspace root: `pnpm add -Dw supabase`. Fixes the version across team machines, survives CI.
- **Option B:** document `pnpm dlx supabase` as the canonical invocation, no dep added. Cheaper but depends on registry availability during CI.

`[planned]` Recommend A — pinned version, offline-capable builds.

### Step 2 — Add `db:types` script

`packages/db/package.json`:
```json
"scripts": {
  "db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/database.generated.ts",
  "db:sync":  "pnpm db:push && pnpm db:types"
}
```

Script writes to `packages/db/src/database.generated.ts` (inside the package — belongs with the rest of the DB source). `[planned]` Re-export from `packages/db/src/index.ts` so consumers import via `@celestia/db`.

### Step 3 — Run `pnpm db:types` once, commit the output

First run establishes the generated file at a known-good state against the current migration 0009. Committed verbatim.

### Step 4 — Add CI drift check [GATE before Step 5]

This is the critical step. Goal: CI fails if someone changes the Drizzle schema, runs `db:push`, and forgets to `db:types`.

Mechanism — Turbo task in `turbo.json`:
```json
"db:types:check": {
  "outputs": [],
  "dependsOn": []
}
```

With a matching script in `packages/db/package.json`:
```json
"db:types:check": "pnpm db:types && git diff --exit-code src/database.generated.ts"
```

The script regenerates types and fails if the generated file differs from what's committed. CI runs `pnpm db:types:check` as part of the standard build/verify step. A PR that changes `packages/db/src/schema/**` without also committing regenerated `database.generated.ts` fails CI.

`[planned]` Alternatively, a pre-commit hook via husky / lefthook that runs the same check. Equivalent enforcement at a different point in the loop.

**Do not advance to Step 5 until this check exists and has failed and passed at least once in CI.** If this step is skipped, the window where someone rebuilds the bridge is open.

### Step 5 — Update `createServiceSupabaseClient()` and siblings to use the `Database` generic

```ts
import type { Database } from '@celestia/db'
// ...
return createClient<Database>(url, key, { ... })
```

Four files to update in `apps/web/lib/supabase/`: `service.ts`, `server.ts`, `public.ts`, `client.ts`. Plus `packages/db/src/client.ts`. Five mechanical edits. No query call sites change — the types flow through.

### Step 6 — Migrate `ChartRow` imports to `Tables<'charts'>`

```ts
import type { Tables } from '@celestia/db'
type ChartRow = Tables<'charts'>  // local alias, optional, can be inlined
```

`[inferred]` Grep-and-replace. Preserve the local alias name (`ChartRow`) if existing call sites reference it heavily; pure type alias has zero runtime cost. Or inline `Tables<'charts'>` at every site if the alias indirection is unnecessary.

### Step 7 — Delete `apps/web/lib/types/chart.ts`

Only after Step 6 confirms zero remaining imports of the old `ChartRow`. Run `pnpm typecheck` across the workspace; if it passes, delete the file. If it doesn't, some consumer was missed in Step 6.

---

## 7. What if CI drift check catches real drift during M1-M3?

`[planned]` Expected behavior, not a problem:
- Engineer changes `packages/db/src/schema/charts.ts` to add a column
- Runs `pnpm db:generate` (produces new migration file)
- Runs `pnpm db:push` (applies migration to DB)
- Forgets `pnpm db:types`
- Commits, opens PR
- CI runs `pnpm db:types:check`, regenerates types, sees diff, fails
- Engineer runs `pnpm db:sync` locally (shorthand for both), commits regenerated types
- CI passes

If someone wants to bypass (hypothetically), they have to actively delete the CI check or skip it with `--no-verify`. Much harder than "silently re-add a hand-maintained bridge."

---

## 8. Removed open question on SUPABASE_PROJECT_ID

`[owner: user]` Who has the project ID is a user question, not an open research question. Removed from the "flag" list below. Assume it will be supplied when Step 1 executes.

---

## 9. 2026-04-20 update — decision reversed

`[verified]` A schema-drift audit on 2026-04-20 revealed the Drizzle migrations misrepresent production Postgres schema in **13 columns across 5 tables** (full output: `SCHEMA_DRIFT_AUDIT.md`). Summary:

| table | drift count |
|---|---|
| `charts` | 5 (birth_date, birth_time, approximate_time_range, latitude, longitude) |
| `bulgarian_cities` | 3 (latitude, longitude, population) |
| `users` | 3 (subscription_tier + 2 extra DB columns not declared) |
| `daily_horoscopes` | 1 (date) |
| `daily_transits` | 1 (date) |

The most severe was `charts.approximate_time_range` — Drizzle declared `text`, production is `tstzrange`. Every birth-data form submission with `birthTimeKnown: false` has been failing at the Postgres layer since whenever that column was altered, with the raw error bubbling into the Bulgarian UI copy. Zero non-null rows in production — no user has ever successfully persisted through this path.

### Why this invalidates the 2026-04-18 rationale

The original decision rested on §4.2:

> **Rejected: delete Drizzle entirely and move migrations to Supabase CLI.**
> Cost: rebuilding migration history, retooling scripts, losing the schemas as canonical source. Benefits: one fewer tool in the stack.
> `[inferred]` The cost is real and the benefit is marginal. Drizzle migrations work today. The schemas serve as documentation. Keep the tool that's paying rent.

Two claims in that paragraph are wrong given the drift audit:

1. **"Drizzle migrations work today"** — no. Whatever applied the tstzrange type to `charts.approximate_time_range` bypassed the Drizzle migration system, and the 10 committed migrations collectively do not produce the production schema state. The migrations document a schema that doesn't exist.
2. **"The schemas serve as documentation"** — they document a fiction in 13 places. Worse than no documentation, because they mislead. The chart type file `apps/web/lib/types/chart.ts` with its hand-maintained `ChartRow` exists precisely because someone had to work around this mismatch.

The "sunk investment of 10 migrations" argument collapses when the migrations don't represent reality. There is no sunk asset to preserve.

### New decision

**Remove Drizzle entirely.** Nothing queries through it at runtime (`[verified]` 0 consumers of `@celestia/db` across `apps/` and `packages/`, per 2026-04-20 grep). The schemas are stranded fiction. The migrations are unreliable.

**Adopt Supabase CLI for migrations going forward.** Pairs naturally with `supabase gen types typescript` for the type-generation path that §6 Step 2 of this doc already planned. One tool for two jobs (migrations + types), whereas Drizzle currently does only the first.

The `Database`-typed Supabase client + `Tables<'charts'>`-derived types from §6 Step 5/6 still apply. Only the migration-tooling half of this doc is replaced; the type-generation half survives.

### What about `packages/db/src/client.ts`?

`[verified]` `createSupabaseClient(accessToken)` has zero runtime consumers across the workspace. Planning docs (`CACHE_WRAP_CONVENTION.md`, `DATA_FETCHING_INVENTORY.md §4.1`, `07-RESEARCH.md`) reference it as a `[planned]` future path; that future path belongs to the original decision which is now reversed. No reason to preserve the factory. The entire `packages/db/` package goes.

### What stays

- `apps/web/lib/types/chart.ts` hand-maintained `ChartRow` — updated/retyped against Supabase-generated types in a follow-up, NOT blocked on this reversal.
- `supabase/migrations/` — new canonical migration directory.
- `packages/db/src/seed/data/*.json` reference data — moved to `supabase/seed/` (or deleted if unused; data is already in prod).

### Trail

- Audit: `.planning/research/SCHEMA_DRIFT_AUDIT.md`
- Tooling: `apps/web/scripts/diagnostics/audit-schema-drift.mjs` (kept as CI drift check for the post-Drizzle world)
- Migration tooling doc: `packages/db/MIGRATION_TOOLING.md` (will be written into the new canonical location before `packages/db/` is deleted; may move to repo root or `supabase/README.md` in a follow-up)
