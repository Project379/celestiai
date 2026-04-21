# §8.3 — Migration-history drift recon

**Opened:** 2026-04-21 (§8.3 mid-round, drift surfaced)
**Status:** recon complete; **awaiting founder sign-off on proposed repair before executing**.
**Trigger:** `pnpm exec supabase db push` refused with `Remote migration versions not found in local migrations directory`.

Read-only queries ran against prod per founder instruction. No repair state was modified. All findings below.

---

## Query 1 — Supabase CLI's view (`supabase migration list`)

```
  Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
                  | 20260413113051 | 2026-04-13 11:30:51
   20260420100254 |                | 2026-04-20 10:02:54
   20260421150801 |                | 2026-04-21 15:08:01
```

**Two drifts, not one:**

- `20260413113051` — tracked in remote `schema_migrations` but no local file. This is the one that blocked `db push`.
- `20260420100254` — local file exists (the §7 Bug-1 realign) but NOT in remote `schema_migrations`. The DDL effect **is** in prod (charts.approximate_time_range is now `text NULL`, per Query 3) — meaning someone applied it out-of-band and the migration history never caught up.
- `20260421150801` — our new diary migration, not yet applied.

`supabase db push` blocked only on the first drift; the second (local-but-not-remote) is not a push-blocker but is a real tracking-hygiene issue.

---

## Query 2 — Git history for the migrations directory

```
$ git log --all --oneline -- supabase/migrations/
575158c feat(db): §8.3 draft migration — create public.diary_entries
1c4e551 fix(db): migrate charts.approximate_time_range tstzrange → text — ...
a0c1635 chore(db): adopt Supabase CLI for migrations, document tooling choice

$ git log --all --oneline --diff-filter=D -- supabase/migrations/
(empty)

$ git log --all --oneline -- supabase/migrations/20260413113051_*
(empty)

$ git log --all --oneline -S "20260413113051"
(empty)
```

**Interpretation:**

- Only 3 commits ever touched `supabase/migrations/` — none of them created or deleted a `20260413113051` file.
- No migration file has ever been **deleted** from git history (`--diff-filter=D` empty).
- The timestamp `20260413113051` has never appeared in any diff content anywhere in git history.
- `20260413113051` **never existed as a committed artifact** in any branch.

---

## Query 3 — Prod schema snapshot (read-only recon via `postgres` npm package)

### `supabase_migrations.schema_migrations` (full table)

```
20260413113051  migration_for_database_optimisation
```

**Only one row.** The phantom migration has a name: `migration_for_database_optimisation`. This is the kind of auto-generated name Supabase produces when someone uses the dashboard's "Generate migration" feature or runs `supabase db diff` to capture drift-to-migration. Highly consistent with a pre-Drizzle-removal "squash current schema into one baseline migration" action that was applied but whose generated file was never committed.

**Notably absent:** `20260420100254` (§7 Bug-1 realign). Its DDL effect is visible in the schema snapshot below (charts.approximate_time_range is `text NULL` as intended), but the history table doesn't record it. **Second drift.**

### `public.*` tables — 17 present

`ai_readings`, `audit_logs`, `bulgarian_cities`, `chart_calculations`, `charts`, `crystal_listings`, `crystal_recommendations`, `crystal_vendors`, `crystals`, `daily_horoscopes`, `daily_transits`, `processed_webhook_events`, `push_subscriptions`, `subscription_quotas`, `user_crystals`, `user_daily_crystals`, `users`.

**No `diary_entries`** (expected — not yet applied).

### `charts.approximate_time_range` — `text NULL` ✅

Matches the §7 Bug-1 fix intent. So the DDL from `20260420100254_realign_charts...sql` **has been applied to prod** despite not being tracked in `schema_migrations`. Confirms the second drift: an out-of-band application.

### `public.*` routines / custom functions

```
(none — output block was empty; no custom functions exist)
```

**No existing `public.set_updated_at`** — consistent with the grep done during §8.2 recon (§F). Our §8.3 migration will be introducing it.

### Indexes (spot-check)

All the tables have primary-key indexes. No `diary_entries_*` indexes (expected).

### Everything else in the snapshot

The schema covers the full set of features that ship in Celestia today: charts + calculations, users + subscription quotas, Stripe webhook idempotency, crystals (lookup + vendors + listings + recommendations + user collection + daily), horoscopes + transits, push subscriptions, audit logs, AI readings, Bulgarian cities seed. All of it corresponds to schema that predates Drizzle removal — none of it is declared in the two committed migration files. The `20260413113051` "database optimisation" migration very likely represents **the baseline squash** that captured all this state when someone moved from Drizzle to Supabase CLI.

---

## Scenario classification

Per the four scenarios the founder enumerated:

- **A — Phantom-only (CLI tracking only, no DDL effect):** ❌ Not the best fit. The name `migration_for_database_optimisation` + the fact that the entire 17-table baseline schema has no other recorded migration strongly suggests `20260413113051` DID have DDL effects — specifically the baseline-squash kind.
- **B — Drizzle-era / pre-standardization real migration:** ✅ **Best fit.** Dates to 2026-04-13, pre-§7 Bug-1 work (which landed 2026-04-20). Name matches the "squash at transition" pattern. Real DDL effects in prod (the entire baseline schema), not committed as Supabase SQL file. Consistent with the `MIGRATION_TOOLING.md` note that "13 drifts across 5 tables" were known at transition.
- **C — Abandoned / accidental:** ❌ Unlikely. The name implies intent; abandoned migrations usually retain dev-generated names like `remote_schema` or timestamp-only.
- **D — Missing commit (file exists in another branch):** ❌ Definitively ruled out by Query 2 — `git log --all` + the `-S` search both came back empty.

**Classification: Scenario B.**

### What `20260413113051_migration_for_database_optimisation` actually did (inferred)

It captured the then-current prod schema as a squashed baseline migration. The schema of all 17 tables that now exist in prod. Its "effect" is visible as the current baseline; no specific diff is identifiable because the migration IS the baseline.

Running it again would be problematic — it's a snapshot of a past state, not a forward-only delta. The correct treatment is to mark it applied (it is — and has been since 2026-04-13) and leave it alone.

---

## Second drift finding — `20260420100254` local-but-not-tracked

Beyond the primary `20260413113051` blocker, the recon surfaced a second drift direction:

`20260420100254_realign_charts_approximate_time_range.sql` — committed locally in `1c4e551`, DDL effect verifiably in prod (schema shows `charts.approximate_time_range text NULL` per `USING NULL` clause's intent), but the Supabase `schema_migrations` history table doesn't contain it.

Interpretation: the §7 Bug-1 fix's DDL was applied via some path other than `supabase db push` against the fully-tracked history. Possible paths: `supabase db push` at a time when the local/remote diff skipped it for some reason; direct `psql` execution against the DB URL; applying via the dashboard; or `supabase db push --include-all` bypass. Without the CLI's history log from that day it's not forensically recoverable, but the practical state is clear: DDL in prod, no tracking row.

This needs its own repair step alongside `20260413113051` — the CLI should be told "this migration is already applied" to prevent it from trying to re-apply the ALTER COLUMN on the next `db push`.

---

## Proposed repair — two `supabase migration repair` calls + doc-drift entry

### Step 1 — mark `20260413113051` reverted (CLI-tracking only)

```bash
pnpm exec supabase migration repair --status reverted 20260413113051
```

**What this does:** updates `supabase_migrations.schema_migrations` to mark `20260413113051` as `reverted` (a CLI-tracking status). **Does NOT alter the prod schema in any way.** The baseline-squash's DDL effects stay in prod exactly as they are. The CLI simply stops considering it a "remote migration" that local must match.

**Why reverted vs applied:** `--status applied` would require `20260413113051` to also exist as a local file (otherwise the CLI complains about a tracked-but-unfiled migration). `--status reverted` removes it from the tracking set altogether. The baseline schema is what it is; we're just stopping the CLI from pretending there's a missing file.

### Step 2 — mark `20260420100254` applied (tracking now matches reality)

```bash
pnpm exec supabase migration repair --status applied 20260420100254
```

**What this does:** inserts a tracking row for `20260420100254` as applied. **Does NOT re-run the ALTER COLUMN** (that already happened out-of-band). The tracking catches up to the schema reality.

**Why this matters:** without this step, the next `db push` would attempt to apply `20260420100254_realign_charts...sql`. The ALTER COLUMN on an already-`text` column with `USING NULL` would probably succeed (no-op-ish), but "probably" isn't good enough for a migration-integrity discipline. Marking it applied aligns tracking with reality without executing DDL twice.

### Step 3 — doc-drift tracker entry #12

Propose filing entry #12 in `09-01-PRECISION-FLOOR.md` alongside #10 and #11:

> **12. Supabase migration-history drift — phantom `20260413113051` and out-of-band `20260420100254`.** Discovered 2026-04-21 during §8.3's real-push attempt (blocked by CLI). `20260413113051_migration_for_database_optimisation` is a baseline-squash migration that was applied to prod (likely via dashboard-generated SQL during the Drizzle→Supabase-CLI transition) but never committed to `supabase/migrations/`. `20260420100254_realign_charts_approximate_time_range.sql` is the inverse: committed as a local file in `1c4e551`, DDL effect present in prod, but the `schema_migrations` history table doesn't contain its tracking row. Repaired in §8.3 via two `supabase migration repair` calls. **Discipline going forward:** every `supabase db push` must be preceded by `supabase migration list` output review; any Local-vs-Remote mismatch surfaces before the push attempt, not after. The dry-run (BEGIN/ROLLBACK via `postgres` npm package) does NOT catch this class of drift — it's pure CLI-tracking state, not DDL state. A pre-push `migration list` check is a separate discipline layer.

### Step 4 — re-attempt `pnpm exec supabase db push`

After the two repairs, the CLI should see:

```
Local          | Remote         | ...
--------------|---------------|-----------
20260420100254 | 20260420100254 |
20260421150801 |                |
```

The only unapplied-local migration is `20260421150801_create_diary_entries.sql` — exactly what we want pushed.

---

## Why this is Scenario B, not Scenario C

The `name` column value `migration_for_database_optimisation` is the strongest signal. Auto-generated names in Supabase's tooling tend to follow patterns: `remote_schema` for dashboard "Generate from current state", or the user's chosen slug. A name like "migration_for_database_optimisation" indicates someone deliberately named it when running the CLI's migration-new or diff workflow — intentional, not accidental. The fact that it captured the baseline schema (rather than a narrow optimisation) is a mismatch between name and effect that tracks with a Drizzle→Supabase transition: "optimisation" as in "switching to a better migration tooling," the body being the unavoidable baseline-squash.

Scenario C (accidental) would leave a `remote_schema` or timestamp-only name, and would be less likely to correlate 1:1 with the baseline. This is a deliberate-intent migration whose file just didn't get committed — Scenario B.

---

## Awaiting founder decision

**Proposed execution order on approval:**

1. `pnpm exec supabase migration repair --status reverted 20260413113051`
2. `pnpm exec supabase migration repair --status applied 20260420100254`
3. `pnpm exec supabase migration list` — verify both drifts resolved
4. `pnpm exec supabase db push --yes` — only `20260421150801_create_diary_entries.sql` should apply
5. `pnpm --filter @celestia/web run diag:probe-diary > 08-03-PROBE-PROD.txt` — verify 19 facts
6. Compare to dry-run; stop-and-surface on any delta
7. Atomic commit with drift-tracker entry #12 per §3 above

All four `supabase migration` commands modify tracking state; none alters prod schema data. The push in step 4 is the only step that runs DDL against prod — and only `20260421150801`'s DDL, which the dry-run already verified runs clean.

**Stop-and-surface triggers reinforced for this repair path:**

- If either `migration repair` errors unexpectedly (e.g., "migration already in target status"), surface before re-running.
- If `migration list` after step 2 still shows any mismatch beyond the expected `20260421150801` Local-only state, surface.
- All other §8.3 stop-and-surface triggers remain.

Holding for sign-off before touching tracking state.
