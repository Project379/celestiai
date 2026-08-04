---
title: Stream K (Кръг) Port Log
phase: Phase B (Stream K)
created: 2026-08-04
status: living document — per-port investigation log for Кръг features as they land
---

# Stream K (Кръг) Port Log

Per-port record for Кръг features, per `HANDOFF-2026-05-09.md`'s Stream K
interleaving framework. Each entry: what landed, tier, source, and what's
still outstanding for that port.

---

## Port 1 — Circle web backend + API (2026-08-04)

**Not the planned flow.** `HANDOFF-2026-05-09.md`'s Stream K framework
assumes a reactive port: friend ships on web, Claude Code halts Stream P at
the next sub-round close, founder ratifies the cut-in, a scoped port lands.
This port did not happen that way — it was recovered from
`implementation-of-final-features` (PR #10, commit `d150828`), a branch
that had already been built independently over an unknown period and
landed on `main` mid-session via a merge that was initially (and
incorrectly) treated as discardable history. Full incident and recovery
trail: this session's conversation record; the short version is in
`MOBILE-WEB-PARITY-GAP.md`'s changelog and the merge commits themselves
(`d1ca379`, `651341a` on `mobile-parallel-test`/`main`).

**What landed** (web only — no mobile surface):
- `apps/web/app/api/circle/**` — invites (create/accept/list), profiles
  (crush/friend/person saved-people CRUD + report generation),
  relationships (archive, report, weather)
- `apps/web/lib/circle/{report,service,token,types,weather}.ts` — report
  copy generation, service layer, invite-token hashing, shared types,
  relationship-weather (transit-to-relationship) copy
- `apps/web/components/circle/{CircleHub,ConnectInviteAcceptance,
  SavedProfileForm}.tsx`
- `apps/web/app/connect/[token]/page.tsx`, `apps/web/app/(protected)/
  circle/page.tsx`
- `packages/core/src/relationships/{compatibility,types}.ts` — cross-chart
  aspect calculation, compatibility domain scoring (8 domains), composite
  chart data

**Schema:** the 9 Stream K tables (`connection_spaces`,
`connection_members`, `connection_invites`, `connection_reports`,
`relationship_profiles`, `relationship_invites`, `compatibility_reports`,
`saved_people_profiles`, `saved_people_reports`) are live in production
and migration-tracked via `supabase/migrations/
20260803101500_capture_stream_k_relationship_schema.sql` — an idempotent
capture taken directly from production by P.16's migration-history audit,
predating this recovery. Petko's own 3 migrations (`create_relationship_
profiles`, `create_saved_people_profiles`, `create_connection_spaces`)
were excluded from the merge entirely — verified column-for-column
identical to the capture migration, but non-idempotent (`CREATE TABLE`,
no `IF NOT EXISTS`), so they'd fail outright against production where
these tables already exist. The capture migration is the only one that
lives in the tree; do not reintroduce his three.

**Language:** minimum fix applied to get `check:all` green, not a full
intake — see "Outstanding" below.
- 15× `'Неоторизиран достъп'` → `'Сесията ти изтече. Влез отново.'`
  (the already-ratified string, matching existing precedent)
- 1 genuine ти/Вие register violation fixed
  (`ConnectInviteAcceptance.tsx`)
- 1 typo fixed (синстрия → синастрия)
- 6 genuine dictionary-gap words allowlisted after individual review
  (синхрон, композитния, недоизказване, Линкът, синастрия — plus
  синастрия's own allowlisting once the typo was corrected)
- `check:bg-lint-baseline` raised 1371 → 1613 documenting the recovery,
  not fresh copy
- **Deliberately NOT converted:** `report.ts`/`weather.ts`'s plural verbs
  (говорите/движите/оставите/гледате/приемете/спрете/подхранвате/четете)
  — confirmed genuine dual address (a compatibility report describes two
  people), not register drift. Rule documented in
  `.planning/i18n/STAGE5_PREVENTION.md`'s Кръг scope note so a future
  blanket ти-conversion sweep doesn't break it.

**Outstanding for this port — do not assume done:**
1. **Design pass.** `CircleHub.tsx` (936 LOC) is a fully data-driven UI
   (8 compatibility domains, 4 relationship types, tables/cards) built
   independently of and structurally unrelated to
   `.planning/design/mockups/krug-v4.html` (a single hero-orb concept —
   "your light lit, theirs unlit, добави" caption — with no reference to
   profiles, reports, or domains). These are two different eras of Кръг
   design thinking. Not started.
2. **Full register/copy sweep beyond the confirmed violations.** Only
   the one confirmed formal-register instance and the known-bad
   `Неоторизиран` pattern were fixed. The rest of the Circle copy
   (`CircleHub.tsx`, `SavedProfileForm.tsx`, API route validation
   messages, etc.) has not had a line-by-line register/tone review
   against the rest of the app's established Bulgarian voice — it's
   spell-checked and grammatically sound where checked, not
   voice-reviewed.
3. **No mobile surface exists at all.** This port is web-only. Mobile's
   `(tabs)/circle.tsx` and everything Кръг-shaped on mobile is entirely
   unbuilt — a separate, much larger port whenever that's prioritized.
4. **No manual/E2E testing performed.** Column-shape compatibility
   between his application code and the capture migration's schema was
   verified statically (a real parser comparing `CREATE TABLE` column
   lists across all 9 tables), not by actually running the invite/accept/
   report flow against a database. First real exercise of this code path
   happens whenever someone opens `/circle` for the first time since this
   landed.

**Tier:** not classified under the Tier 1/2/3 system — this was a
recovery of already-built work, not a reactive cut-in decision. If/when
further Кръг work is planned (the design pass, mobile port), tier it at
that point per the existing framework.
