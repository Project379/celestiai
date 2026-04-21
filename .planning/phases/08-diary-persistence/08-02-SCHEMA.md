# §8.2 — `diary_entries` Schema Design

**Opened:** 2026-04-21 (§8.2)
**Sealed:** 2026-04-21 — all decisions (A/B/C/D/E/F/G and index hedge) ratified by user.
**Status:** **SEALED. §8.3 drafts the migration from the DDL in this doc.**
**Predecessor:** §8.1 closed at `bc06c3a` (ERR-DI-NNN error domain shipped, §8.5 TODO planted).
**Successor:** §8.3 drafts + runs the migration file based on the decisions sealed here.
**Plan ref:** `.planning/phases/08-diary-persistence/00-PLAN.md` §8.2.
**Decisions doc:** `.planning/research/DIARY_PRODUCT_DECISIONS.md` (Decisions A–F).

**Epistemic tags used throughout:**
- `[verified]` — traceable in existing source or earlier planning docs.
- `[inferred]` — reasoning-based choice; defensible but not forced.
- `[user-decision]` — product/architecture call; surfaced with tradeoffs; user signs off.

---

## Goal

Produce a reviewable schema design for the `diary_entries` table before the migration file is drafted in §8.3. This is a pure design artifact: no SQL executes in §8.2. Every column, constraint, index, and RLS rule is scrutinized on its own merits starting from the §8.0 sketch — nothing is rubber-stamped.

Three specific scrutiny points (A/B/C) required explicit user decision before §8.2 closed; a handful of smaller choices were called out and resolved in-line. **All decisions sealed 2026-04-21** — see each section's `[user-decision] **Sealed:**` line. Option analyses and tradeoffs are preserved below for audit trail; the `## Sealed DDL` section near the bottom reflects the ratified schema.

---

## §8.0 starting sketch (reproduced for reference)

From `.planning/phases/08-diary-persistence/00-PLAN.md` §8.2, first draft:

```
id UUID PRIMARY KEY                                            -- server-generated
user_id TEXT NOT NULL                                          -- Clerk ID
entry_date DATE NOT NULL                                       -- Europe/Sofia calendar day
phase_id TEXT NOT NULL                                         -- LunarPhaseId snapshot
phase_name TEXT NOT NULL                                       -- Bulgarian name snapshot
intentions TEXT[] NOT NULL CHECK (array_length(intentions, 1) = 3)
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
UNIQUE(user_id, entry_date)
```

Indexes: `(user_id, entry_date DESC)`, `(user_id, phase_id)`.
RLS: `SELECT/INSERT/UPDATE/DELETE` WHERE `user_id = clerk_id()` (helper function referenced).
FK: not specified — "user_id TEXT NOT NULL" with no `REFERENCES`.

---

## Scrutiny points requiring user decision

### A. `entry_date` timezone semantics — **server-interpreted vs client-submitted**

**The question.** `entry_date` is declared "Europe/Sofia calendar day." Who computes it?

**Current client behavior** `[verified from apps/web/components/manifest/ManifestDiaryContent.tsx:18-23]`: `isoDate(new Date())` composes a `YYYY-MM-DD` string from the browser's local `getFullYear() / getMonth() / getDate()`. This is the *browser's* local calendar day, not Sofia's. A Bulgarian user in Sofia hits the intended day. A Bulgarian user in Tokyo at 2am JST (which is 7pm yesterday Sofia) gets today-Tokyo, saved as today for them, but Sofia considers it still yesterday.

**Option A1 — Server-interpreted.** Server computes `entry_date` on insert using `(now() AT TIME ZONE 'Europe/Sofia')::date`. Default value on the column:
```sql
entry_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Europe/Sofia')::date)
```
Client does not submit `entry_date` on `POST /api/diary/entries`. `PATCH` cannot change it.

- **Pro:** Timezone-invariant; the Sofia-anchored brand stays correct regardless of where the user writes from. Upsert key `(user_id, entry_date)` is deterministic and matches the brand's "one entry per Sofia calendar day" mental model.
- **Pro:** Immune to client clock skew, timezone misconfiguration, travel edge cases.
- **Pro:** Aligns with `ManifestDiaryContent.tsx:11-16` where the `BG_DATE` formatter already uses `timeZone: 'Europe/Sofia'` for display — display and storage share the same anchor.
- **Con:** Users writing at 00:00-02:00 Sofia time expect "today" but technically the day just rolled; server computes correctly but mismatches clock-face intuition in that 2-hour window.
- **Con:** No ability to backfill yesterday's missed entry. Not a regression — the current UI doesn't support backfill either (form is today-only via `today` state in `ManifestDiaryContent.tsx`).

**A1 implementation consequence (§8.5 hook rewrite must absorb):** the client still needs to compute "today" to decide create-vs-edit mode (`ManifestDiaryContent.tsx:55-56` calls `findByDate(today)`). Under A1, if the client keeps computing `today` via browser-local `isoDate(new Date())` `[verified at :18-23]`, a user in Tokyo at 02:00 JST computes `today = 2026-04-22`, sees no entry under that key, writes intentions into an empty form, POSTs. Server defaults `entry_date = 2026-04-21 Sofia`, conflicts with the entry written 10 minutes earlier, upsert silently overwrites — **same silent-wrongness genus §8.1 just closed**. A1 therefore requires `isoDate` to switch to `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia' }).format(...)` (mirroring the `BG_DATE` formatter at `:11-16`). Not a §8.2 edit; a §8.5 implementation note that the user should weigh before picking A1 over A2.

**Option A2 — Client-submitted.** Client computes a local `YYYY-MM-DD` and POSTs it; server trusts. Zod validates shape. Formally captures today's naive behavior.

- **Pro:** Matches today's localStorage semantics 1:1 — no behavior change in the migration.
- **Pro:** Travelers write on their local day, which may match their experiential sense of "today."
- **Con:** A Bulgarian user in Tokyo writes "2026-04-22 (today Tokyo)" which is stored and then, when they fly home and open the app on "2026-04-22 Sofia," they see yesterday's entry (labeled 2026-04-22) as a pre-existing today's entry — strange.
- **Con:** Clock-skew on the client is silently trusted.
- **Con:** Breaks the product framing: a Bulgarian-market app with Sofia-anchored visuals (BG_DATE uses `timeZone: 'Europe/Sofia'`) stores a non-Sofia-anchored key.

**Option A3 — Hybrid.** Client submits `entry_date` as a hint; server overrides with Sofia-computed value if the client's value is not in the set {today-Sofia, yesterday-Sofia} to permit a 1-day backfill window. More logic; hedged intent.

`[user-decision]` **Sealed: A2 (client-submitted).** Client computes `entry_date` in their local timezone and POSTs; server trusts. Rationale: aligns with the diary-as-personal-ritual semantic — the entry captures the user's *lived* day, not Sofia's calendar day. Avoids the A1 silent-overwrite travel case that advisor surfaced (Tokyo-at-02:00-JST user computing `today = tomorrow-Sofia` and upserting over yesterday-Sofia's entry).

**A2 Zod constraints (§8.4 scope):** the endpoint validator rejects obviously-wrong dates to bound client trust without demanding server-side timezone compute:
- Reject dates more than **1 day in the future** (accounts for client-clock drift and minor timezone-boundary cases without allowing arbitrary future-dating).
- Reject dates earlier than the user's `users.created_at` (nothing to write about before the account existed).

Both bounds are Zod-layer rejections surfaced via the ERR-DI-NNN namespace in §8.4. DB-level CHECK for these is not added — the Zod layer is authoritative; the DB trusts what the endpoint accepted.

---

### B. Per-element `intentions` length cap — **server CHECK, Zod, or both; and what N?**

**The question.** `intentions TEXT[] NOT NULL CHECK (array_length(intentions, 1) = 3)` enforces exactly three elements but leaves each string unbounded. What's the per-element character cap, where is it enforced, and what value?

**Current client behavior** `[verified from apps/web/components/manifest/ManifestEntryForm.tsx:125-131]`: the textarea has `rows={2}` and `resize-none` — visually ~2 lines, but `maxLength` is absent. A malicious or careless paste can submit multi-KB strings today. localStorage has a hard ~5MB browser cap; it's not a DB problem yet but will become one at first server-side submission.

**Defense layers available:**

1. **Client maxLength on `<textarea>`** — cosmetic/UX-feedback; trivially bypassable.
2. **Zod validator in §8.4** — the authoritative user-facing layer; Bulgarian error messages at the endpoint.
3. **Postgres CHECK constraint** — last-resort integrity guard; rejects writes that bypass Zod (e.g., direct DB access, bugs).

**Existing Zod pattern** `[verified from apps/web/lib/validators/birth-data.ts:29, 134]`: `.max(100, { error: 'Името не може да е по-дълго от 100 символа' })`. This is the established user-facing cap convention.

**Value for N.** The product framing is "Три реда" (three lines) — short by design. Comparison points:
- Tweet: 280 chars. Too short for a reflective intention; users would feel clipped.
- Two sentences of Bulgarian prose: ~150-200 chars typical, ~300 comfortably.
- A generous cap with headroom: 500 chars. UTF-8 Bulgarian is 2 bytes/char → ~1 KB max per element, ~3 KB per entry.
- Overly generous: 2000+ chars begins to feel like "long journal entry" rather than "three intentions."

`[user-decision]` **Sealed: both Zod and DB CHECK, N = 500 chars per element.**

**Two-voice framing (ratified):** Zod is the authoritative user-facing gate; the DB CHECK is a silent defense-in-depth guardrail. They don't speak to the user in two voices:
- **Zod rejection** → user sees a Bulgarian error via the ERR-DI-NNN namespace at the §8.4 endpoint layer.
- **DB CHECK rejection** (should never fire in practice — if it does, something bypassed Zod) → the endpoint returns `ERR-DI-003` (generic "write failed") to the user; the constraint-violation detail is logged to `console.error` with the ID tag for engineering triage, **not** surfaced to the UI.

DB implementation:
```sql
intentions TEXT[] NOT NULL
  CHECK (array_length(intentions, 1) = 3)
  CHECK (char_length(intentions[1]) BETWEEN 1 AND 500)
  CHECK (char_length(intentions[2]) BETWEEN 1 AND 500)
  CHECK (char_length(intentions[3]) BETWEEN 1 AND 500)
```
(Using `char_length` not `octet_length` so the constraint talks in user-visible characters, not UTF-8 bytes. The lower bound `>= 1` also enforces Decision E's "all three filled" guard at DB level.)

Zod layer (finalized in §8.4):
```ts
intentions: z.tuple([
  z.string().min(1, { error: 'Моля, попълни и трите намерения' }).max(500, { error: 'Текстът е твърде дълъг — макс. 500 символа' }),
  // ... × 3
])
```

**§8.5 scope addition (captured here so it's not memory-dependent):** `apps/web/components/manifest/ManifestEntryForm.tsx:125-131` textareas need `maxLength={500}` added as UX-feedback — ship in §8.5 alongside the hook rewrite. Applied when the server-backed path lands; until then the Zod layer is the only cap on write and users get a post-submit rejection rather than a pre-submit hint. `[user-decision]` this is an acceptable trade for the interim. (Tracked at `00-PLAN.md §8.5`.)

---

### C. FK to `users(clerk_id)` — **RLS-only vs belt-and-suspenders cascade**

**The question.** Does `diary_entries.user_id` carry a `REFERENCES public.users(clerk_id) ON DELETE CASCADE`, or does it stand alone like the existing `charts.user_id`?

**Existing pattern** `[verified via grep — `REFERENCES users` returns zero matches across supabase/, apps/web/, packages/`]`: Every user-scoped table (`charts`, `chart_calculations`, `oracle_readings`, `user_daily_crystals`, `user_crystals`, `push_subscriptions`, etc.) uses `user_id TEXT NOT NULL` with NO foreign key. Isolation is enforced purely by RLS policies that assert `(select auth.jwt()->>'sub') = user_id`.

`[verified]` **Consequence:** The `users` table exists (columns: `clerk_id`, `subscription_tier`, and others) but is not an FK target anywhere in the schema. GDPR deletion per `apps/web/app/api/gdpr/delete-account/route.ts` cascades explicitly in application code, table by table.

**Option C1 — Match existing pattern, RLS-only, no FK.**
- Column: `user_id TEXT NOT NULL DEFAULT (select auth.jwt()->>'sub')`.
- Deletion on user-account removal: explicit `DELETE FROM diary_entries WHERE user_id = ?` in `/api/gdpr/delete-account`. That's §8.7's existing plan.
- **Pro:** Consistent with every other table. Zero schema churn vs the established pattern.
- **Pro:** Cross-table cleanup semantics stay explicit — a future engineer reading `/api/gdpr/delete-account` sees the full picture in one file.
- **Con:** An FK failure (orphaned `user_id` with no matching `users` row) is possible in principle. In practice it hasn't happened because writes go through Clerk-authed endpoints where `auth.jwt()->>'sub'` always matches a real user.

**Option C2 — Belt-and-suspenders: `user_id TEXT NOT NULL REFERENCES public.users(clerk_id) ON DELETE CASCADE`.**
- **Pro:** Orphan-row impossible at DB level.
- **Pro:** GDPR deletion happens automatically when a `users` row is deleted — `DELETE FROM users WHERE clerk_id = ?` cascades to all diary entries for free. Shrinks §8.7's scope by one explicit cleanup call.
- **Pro:** Schema self-documents that `user_id` is a reference to `users.clerk_id`, not free text.
- **Con:** First departure from the existing RLS-only pattern. A future table will either match diary's FK (prompt: "why did diary do it but charts not?") or match charts' no-FK (prompt: "why is diary the odd one?"). Creates inconsistency either way.
- **Con:** Requires `users.clerk_id` to be a `UNIQUE` or `PRIMARY KEY` constraint target. `[inferred]` likely already true given existing `.eq('clerk_id', ...)` query patterns treating it as the natural key, but should be verified in §8.3 before the migration runs.
- **Con:** Account-deletion behaviour becomes implicit (cascaded by DB) rather than explicit (one line in the GDPR endpoint). Future debugging of "where did these diary entries go?" becomes harder if the engineer doesn't immediately check for FKs.

`[user-decision]` **Sealed: C1 (RLS-only, match existing pattern).** All current user-scoped tables (`charts`, `chart_calculations`, `oracle_readings`, `user_daily_crystals`, `user_crystals`, `push_subscriptions`) are RLS-only with no FK to `users`. Breaking the pattern for diary alone creates inconsistency a future reader has to resolve without benefit. §8.7's explicit `DELETE FROM diary_entries WHERE user_id = ?` handles GDPR cascade as planned.

**Deferred precedent note:** if the codebase ever migrates toward FK-cascade as a cross-cutting pattern, that's a separate architectural workstream touching all 6+ user-scoped tables together. Not §8's problem; flagged here so the option isn't lost if the architecture debate opens later.

---

## Smaller choices — all sealed

### D. `phase_id` constraint

`[user-decision]` **Sealed: `phase_id TEXT NOT NULL` plus `COMMENT ON COLUMN` plus Zod enum at endpoint.** No PG `ENUM` type, no `CHECK (phase_id IN (...))` — matches codebase convention for enum values (Zod at the endpoint boundary, not at DB). Schema churn when the `LunarPhaseId` set expands stays minimal.

Column comment (lands with migration):
```sql
COMMENT ON COLUMN public.diary_entries.phase_id IS
  'LunarPhaseId snapshot at write time. Valid values: '
  '''new'' | ''waxing_crescent'' | ''first_quarter'' | ''waxing_gibbous'' | '
  '''full'' | ''waning_gibbous'' | ''last_quarter'' | ''waning_crescent''. '
  'Snapshot is deliberate (DIARY_PRODUCT_DECISIONS.md Decision C): '
  'if phase logic changes, prior entries keep their original phase label.';
```

### E. Empty-string guard on `intentions`

`[user-decision]` **Sealed: folded into the B length CHECK (`char_length BETWEEN 1 AND 500`).** Zod also validates `.min(1)` per element. Belt and suspenders, no separate constraint.

### F. `updated_at` maintenance — generic reusable trigger function

`[user-decision]` **Sealed: F1 trigger, with the trigger function shipped as a GENERIC reusable primitive `public.set_updated_at()`, not diary-scoped.** Rationale: this is a repo-wide utility that should exist once, not be reimplemented per-table. One-time cost, permanent reuse. Any future table needing `updated_at` maintenance uses the same trigger function.

`[verified via grep]` no existing `set_updated_at` function or `CREATE TRIGGER` exists anywhere in the repo; diary is the introducer of this primitive.

Generic function (lands with §8.3 migration):
```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Generic BEFORE UPDATE trigger function. Sets NEW.updated_at = now(). '
  'Introduced by the §8.2 diary_entries migration. Reusable across any '
  'table with an updated_at TIMESTAMPTZ column.';
```

Diary-side trigger references the generic function:
```sql
CREATE TRIGGER diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

### G. Correction to §8.0 plan — `clerk_id()` helper

`[user-decision]` **Sealed: plan-doc delta acknowledged.** The §8.0 plan (`00-PLAN.md` §8.2) references `user_id = clerk_id()` as "the existing JWT-claim helper used on `charts`." `[verified via grep]` no such helper exists. The actual pattern across the codebase is `(select auth.jwt()->>'sub') = user_id` inline in RLS policies. This doc uses the correct form throughout.

**Doc-drift tracker:** this finding is entry **#10** in the planning-doc-vs-code drift tracker at `.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md`. Captured there because it's the tenth instance of this drift pattern in ~30 rounds of work across §9 and §8 — persistent enough to deserve a process-discipline reminder: any planning doc claim about an "existing helper" or "established pattern" should be **grep-verified at the time the doc is written**, not at the time the doc is executed against. Without this discipline the drift is silent until a downstream round trips on it.

---

## Sealed DDL (from A2 / B-500 / C1 / D-TEXT / E-char_length / F-generic-trigger / G-correct-RLS)

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_diary_entries.sql
-- §8.3 drafts the file with a concrete timestamp. DDL body below is frozen
-- by §8.2; any deviation in §8.3 must surface back here first.

CREATE TABLE public.diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT (select auth.jwt()->>'sub'),
  entry_date DATE NOT NULL,
  phase_id TEXT NOT NULL,
  phase_name TEXT NOT NULL,
  intentions TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT diary_entries_intentions_count CHECK (array_length(intentions, 1) = 3),
  CONSTRAINT diary_entries_intention_1_len CHECK (char_length(intentions[1]) BETWEEN 1 AND 500),
  CONSTRAINT diary_entries_intention_2_len CHECK (char_length(intentions[2]) BETWEEN 1 AND 500),
  CONSTRAINT diary_entries_intention_3_len CHECK (char_length(intentions[3]) BETWEEN 1 AND 500),
  CONSTRAINT diary_entries_unique_user_date UNIQUE (user_id, entry_date)
);

COMMENT ON COLUMN public.diary_entries.phase_id IS
  'LunarPhaseId snapshot at write time. See §D of 08-02-SCHEMA.md.';
COMMENT ON COLUMN public.diary_entries.entry_date IS
  'Client-submitted in the user''s local timezone (§A sealed A2). '
  'Endpoint Zod validator rejects dates > 1 day future and dates earlier '
  'than users.created_at. See §A of 08-02-SCHEMA.md for rationale.';
```

Per A2, `entry_date` has **no `DEFAULT`** — the POST endpoint requires the client to send it. Zod guards the value. The UNIQUE (user_id, entry_date) constraint enforces the upsert key.

### Indexes

```sql
-- DESC variant intentionally omitted (sealed 2026-04-21) — UNIQUE
-- (user_id, entry_date)'s implicit ASC index reverse-scans efficiently
-- on PG 13+ for the list-newest-first pattern. Revisit only if
-- production EXPLAIN ANALYZE shows a planner regression.

CREATE INDEX diary_entries_user_phase_idx
  ON public.diary_entries (user_id, phase_id);
```

Rationale (sealed):
- `UNIQUE (user_id, entry_date)` implicit ASC index — handles both the upsert-key equality lookup and the list-newest-first scan via PG 13+ planner reverse-scan. `[user-decision]` **Sealed: no explicit DESC index.** Premature without an `EXPLAIN ANALYZE`-backed regression. Revisit if production profiling shows the reverse-scan doesn't perform.
- `(user_id, phase_id)` — supports the variant-rotation count query in §8.8 (`COUNT(*) WHERE user_id = ? AND phase_id = ?`). `[verified from §8.8 plan]`.

### `updated_at` trigger (generic function per §F sealing)

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Generic BEFORE UPDATE trigger function. Sets NEW.updated_at = now(). '
  'Introduced by the §8.2 diary_entries migration. Reusable across any '
  'table with an updated_at TIMESTAMPTZ column.';

CREATE TRIGGER diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

### RLS policies

```sql
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY diary_entries_select_own ON public.diary_entries
  FOR SELECT
  USING ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY diary_entries_insert_own ON public.diary_entries
  FOR INSERT
  WITH CHECK ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY diary_entries_update_own ON public.diary_entries
  FOR UPDATE
  USING ((select auth.jwt()->>'sub') = user_id)
  WITH CHECK ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY diary_entries_delete_own ON public.diary_entries
  FOR DELETE
  USING ((select auth.jwt()->>'sub') = user_id);
```

Service-role bypass: the `service_role` Supabase key bypasses RLS by default; no explicit policy needed. Used for GDPR deletion via server-side code (§8.7) and any scheduled cleanup.

`[verified]` pattern matches `charts` + `chart_calculations` RLS per `.planning/phases/03-birth-data-database/03-01-SUMMARY.md` and `.planning/research/ARCHITECTURE.md §RLS`.

### Migration file naming (for §8.3, not drafted here)

Format: `supabase/migrations/YYYYMMDDHHMMSS_create_diary_entries.sql`. Follows the existing convention (`20260420100254_realign_charts_approximate_time_range.sql`). §8.3 generates the timestamp at drafting time.

---

## Ratified decisions summary (2026-04-21 sign-off)

| Decision | Ratified choice | Notes |
|---|---|---|
| **A** — `entry_date` tz semantics | **A2** client-submitted | Endpoint Zod rejects `>1` day future + dates `<` `users.created_at`. |
| **B** — `intentions` length cap | Zod (voice) + DB CHECK (silent guardrail), **N = 500** | Two-voice framing sealed. ERR-DI-003 for DB-CHECK violations, not a second Bulgarian message. |
| **C** — FK vs RLS-only | **C1** RLS-only | Matches existing pattern across 6+ user-scoped tables. §8.7 explicit cascade. |
| **D** — `phase_id` constraint | TEXT + COMMENT + Zod enum | No PG ENUM, no CHECK-IN. |
| **E** — empty-string guard | Folded into B's `char_length BETWEEN 1 AND 500` | — |
| **F** — `updated_at` maintenance | **F1** trigger, **generic** `public.set_updated_at()` function | New reusable primitive. |
| **G** — §8.0 `clerk_id()` reference | Confirmed non-existent helper; doc uses inline `(select auth.jwt()->>'sub') = user_id` | Drift-tracker entry **#10** filed. |
| Index hedge | No explicit `(user_id, entry_date DESC)` | Reverse-scan via UNIQUE ASC index; add later if `EXPLAIN ANALYZE` regresses. |

---

## §8.3 prerequisites (carried forward from user sealing instructions)

1. **Local-first execution gate.** Before running the migration against prod, attempt it against a local Supabase instance (dev database or local docker) if one is available. Verify columns / indexes / RLS policies / trigger create without error. Only then push to prod. **If no local instance is available, surface that before running prod DDL** — don't run DDL untested if there's a local path available.
2. **Probe script evidence.** Post-migration verification via a diagnostics probe mirroring the `apps/web/scripts/diagnostics/probe-column-type.mjs` pattern that closed Bug-1 in §7. Output confirms columns / types / constraints / indexes / RLS policies match this sealed DDL exactly. Probe output committed as evidence in the §8.3 close.
3. **Atomic commits per deliverable.** Migration file creation; migration execution; probe script; probe output — each in a focused commit.
4. **Surface-before-doing on deviations.** If the Supabase CLI rejects any part of this DDL for a reason not anticipated here, surface before working around. Don't force a migration through.

---

## Exit criteria — **achieved 2026-04-21**

- ✅ User ratified A/B/C (+ D/E/F/G + index hedge).
- ✅ DDL / indexes / RLS / trigger reflect ratified decisions.
- ✅ `[inferred]` recommendations on ratified points replaced with `[user-decision]` **Sealed:** notation, rationale preserved.
- ✅ Drift-tracker entry #10 filed for §G.
- ✅ `00-PLAN.md` §8.5 scope updated with `maxLength={500}` textarea follow-up.
- ➡️ **§8.3 opens** with the migration drafted from the sealed DDL and executed via Supabase CLI. Pure DB round — no application code changes in §8.3.

---

## §8.9 rollover note (captured here, appended to §8.9 plan separately)

Manual UAT scope additions for when §8.9 opens:
- Force ERR-DI-001 via DevTools storage override (quota exceed or disable storage); verify banner renders with correct Bulgarian copy and code.
- Force ERR-DI-002 via corrupted `celestia.manifest.entries.v1` key in localStorage; verify banner renders.
- Verify `aria-label="Затвори"` works for screen-reader dismissal.
- Verify banner clears on successful retry (write path only, per `ed0f606`).
