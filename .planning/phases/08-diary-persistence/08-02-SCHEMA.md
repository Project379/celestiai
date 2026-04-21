# §8.2 — `diary_entries` Schema Design

**Opened:** 2026-04-21 (§8.2)
**Status:** **DRAFT — awaiting user review of scrutiny points A/B/C before §8.3 executes.**
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

Three specific scrutiny points (A/B/C) require explicit user decision before §8.2 closes; a handful of smaller choices are called out and tentatively resolved in-line with `[inferred]` tags the user can override.

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

`[inferred]` **Recommendation: A1 (server-interpreted).** Bulgarian market + Sofia-anchored display formatter + no existing UI for backfill all point the same way. Surfacing nonetheless — timezone semantics are a data-integrity contract the user should ratify, not a coding preference.

**User: pick A1, A2, or A3.**

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

`[inferred]` **Recommendation: both Zod and DB CHECK, N = 500.**

Implementation sketch:
```sql
intentions TEXT[] NOT NULL
  CHECK (array_length(intentions, 1) = 3)
  CHECK (char_length(intentions[1]) BETWEEN 1 AND 500)
  CHECK (char_length(intentions[2]) BETWEEN 1 AND 500)
  CHECK (char_length(intentions[3]) BETWEEN 1 AND 500)
```
(Using `char_length` not `octet_length` so the constraint talks in user-visible characters, not UTF-8 bytes. The lower bound `>= 1` also enforces Decision E's "all three filled" guard at DB level, paired with Zod.)

Zod layer (to be finalized in §8.4):
```ts
intentions: z.tuple([
  z.string().min(1, { error: 'Моля, попълни и трите намерения' }).max(500, { error: 'Текстът е твърде дълъг — макс. 500 символа' }),
  // ... × 3
])
```

**User: confirm "both layers, N = 500", or specify a different N / different enforcement layering.**

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

`[inferred]` **Recommendation: C1 (match existing pattern, RLS-only).** Consistency with 6+ existing user-scoped tables is worth more than the marginal automatic-cascade benefit. §8.7's explicit cleanup line is trivial (one query) and keeps GDPR behavior discoverable by reading a single route file.

Counter-case worth naming: if the user's longer-term vision is *every* user-scoped table should get an FK going forward (starting here, migrating existing tables later), then picking C2 now makes §8.2 the precedent. Acceptable direction, but it's a schema-style decision that outlives §8.

**User: pick C1 or C2.**

---

## Smaller choices (tentatively resolved in-line; user can override)

### D. `phase_id` constraint

`phase_id TEXT NOT NULL` — `[inferred]` keep as unconstrained TEXT matching how the codebase treats `LunarPhaseId` elsewhere (Zod enum at the endpoint boundary, not at DB). Add a `COMMENT ON COLUMN` documenting the expected value set:
```sql
COMMENT ON COLUMN public.diary_entries.phase_id IS
  'LunarPhaseId snapshot at write time. Valid values: '
  '''new'' | ''waxing_crescent'' | ''first_quarter'' | ''waxing_gibbous'' | '
  '''full'' | ''waning_gibbous'' | ''last_quarter'' | ''waning_crescent''. '
  'Snapshot is deliberate (Decision C): if phase logic changes, prior entries '
  'keep their original phase label.';
```

Alternative would be a PG `ENUM` type or `CHECK (phase_id IN (...))`. Both tighten safety; both add schema churn when the set ever expands. `[inferred]` TEXT + comment + Zod enum is the right weight for this value-set.

### E. Empty-string guard on `intentions`

Already folded into the CHECK constraint in scrutiny B (`char_length >= 1`). Zod also validates `.min(1)` per element. Belt and suspenders, no separate surfacing needed.

### F. `updated_at` maintenance

`updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` is correct for INSERT. For UPDATE, Postgres does *not* auto-update the default. Two options:

- **F1 — Trigger.** Install a `BEFORE UPDATE` trigger that rewrites `updated_at` to `now()`. Fires regardless of who performs the update.
- **F2 — Application-code.** Every `UPDATE`/`PATCH` handler explicitly sets `updated_at = now()`. Requires discipline; easy to forget.

`[inferred]` **Picking F1 (trigger).** More reliable, standard Postgres idiom, and the trigger is 8 lines of SQL. Will include in the §8.3 migration.

Trigger sketch:
```sql
CREATE OR REPLACE FUNCTION public.diary_entries_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.diary_entries_set_updated_at();
```

`[verified via grep across `supabase/` and `.planning/`]` no existing `set_updated_at` function or `CREATE TRIGGER` exists anywhere in the repo. §F's trigger is therefore new-for-diary, not reusable. If the user wants a generic `public.set_updated_at()` function introduced here as a reusable primitive for future tables, say so and §8.3 drafts the generic form; otherwise it stays `diary_entries_set_updated_at()` scoped to this table.

### G. Correction to §8.0 plan — `clerk_id()` helper

The §8.0 plan (`00-PLAN.md` §8.2) references `user_id = clerk_id()` as "the existing JWT-claim helper used on `charts`." `[verified]` no such helper exists. The actual pattern across the codebase (and in every planning-doc RLS snippet in `.planning/research/` and `03-birth-data-database/`) is `(select auth.jwt()->>'sub') = user_id`. This doc uses the correct form; §8.3's migration should not reference a nonexistent `clerk_id()` function.

(Non-blocking for §8.2 sign-off — just flagging the plan-doc vs reality delta so §8.3 drafts cleanly.)

---

## Proposed DDL (contingent on A1/C1 recommendations; adjust after user decision)

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_diary_entries.sql

CREATE TABLE public.diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT (select auth.jwt()->>'sub'),
  entry_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'Europe/Sofia')::date),
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
  'Europe/Sofia calendar day. Server-computed on INSERT. See §A of 08-02-SCHEMA.md.';
```

### Indexes

```sql
-- DESC variant intentionally omitted — UNIQUE (user_id, entry_date)'s
-- implicit ASC index can reverse-scan efficiently on PG 13+ for the
-- list-newest-first pattern. Add later if EXPLAIN ANALYZE shows a
-- planner regression. User may opt to include it up-front as a hedge.

CREATE INDEX diary_entries_user_phase_idx
  ON public.diary_entries (user_id, phase_id);
```

Rationale:
- `(user_id, entry_date DESC)` — primary read pattern is "list this user's entries, newest first" for `ManifestHistory`. DESC matches scan direction. `[verified from ManifestHistory consumption pattern]`.
- `(user_id, phase_id)` — supports the variant-rotation count query in §8.8 (`COUNT(*) WHERE user_id = ? AND phase_id = ?`). `[verified from §8.8 plan]`.

Note the `UNIQUE (user_id, entry_date)` constraint implicitly creates a `(user_id, entry_date)` ASC index. On PG 13+, the planner can reverse-scan an ASC index efficiently for `ORDER BY entry_date DESC`, so the explicit DESC variant is a **hedge, not a requirement** — the UNIQUE index is likely sufficient for the list-newest-first scan in practice. `[inferred]` Recommendation: **drop the explicit DESC index for now** and add it later only if `EXPLAIN ANALYZE` on the list endpoint shows a planner regression. Keeps the migration minimal. User can override if they want the hedge up-front.

### `updated_at` trigger

```sql
CREATE OR REPLACE FUNCTION public.diary_entries_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.diary_entries_set_updated_at();
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

## Open questions for user (§8.2 sign-off gate)

1. **Scrutiny A:** A1 (server-interpreted Europe/Sofia) or A2 (client-submitted) or A3 (hybrid)?
2. **Scrutiny B:** confirm "Zod + DB CHECK, N = 500 chars per element", or revise layering / N.
3. **Scrutiny C:** C1 (RLS-only, match existing) or C2 (FK with `ON DELETE CASCADE`)?
4. **Smaller points D/E/F:** any of the `[inferred]` resolutions the user wants to overturn?
5. **Anything else the user spots in the DDL or RLS blocks that should be revised before §8.3 drafts the migration.**

---

## Exit criteria (§8.2 close gate)

- User ratifies decisions on A/B/C (and smaller points if they want to push back).
- Any DDL/index/RLS adjustments agreed.
- `08-02-SCHEMA.md` updated to reflect ratified decisions (no more `[inferred]` recommendations as open questions — all decisions sealed).
- §8.3 opens with the approved schema, migration file drafted from the sealed DDL and executed via Supabase CLI. No application code changes in §8.3.

---

## §8.9 rollover note (captured here, appended to §8.9 plan separately)

Manual UAT scope additions for when §8.9 opens:
- Force ERR-DI-001 via DevTools storage override (quota exceed or disable storage); verify banner renders with correct Bulgarian copy and code.
- Force ERR-DI-002 via corrupted `celestia.manifest.entries.v1` key in localStorage; verify banner renders.
- Verify `aria-label="Затвори"` works for screen-reader dismissal.
- Verify banner clears on successful retry (write path only, per `ed0f606`).
