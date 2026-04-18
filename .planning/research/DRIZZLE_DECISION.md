# Drizzle vs Supabase Client — Decision Analysis

**Written:** 2026-04-18
**Status:** Decision proposed; not executed. Prerequisite to Option-B migration (`DATA_FETCHING_INVENTORY.md §5.4`).
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

## 6. Migration unblock summary

- Prerequisite to Phase M1: run actions 1-3 above. Should be 1 day of work, all mechanical.
- No blocker for the rest of Option-B beyond that.
- Flag: **someone with Supabase Dashboard access must provide `SUPABASE_PROJECT_ID`** for the CLI to work. `[open]` — who has this? If no one, the CLI invocation has to run in an environment that does.
