# Diary Product Decisions

**Written:** 2026-04-20
**Trigger:** §8.0 opens the diary-persistence workstream. This doc captures every product decision made in the review of `DIARY_AUDIT.md` so future rounds (and future Claude Code sessions) can reconstruct rationale without re-asking.
**Workstream plan:** `.planning/phases/08-diary-persistence/00-PLAN.md`
**Source audit:** `.planning/research/DIARY_AUDIT.md`

**Epistemic tags:**
- `[user-decision]` — direct product call by the user; authority is the user, not the codebase.
- `[verified]` — traceable in code or in the source audit doc.
- `[inferred]` — reasoning from planning context; not directly executed.
- `[skill-dependent]` — relies on the Bulgarian astrology skill's output quality.

---

## Decisions A–F (from audit review)

### Decision A — Server persistence: ship before launch `[user-decision]`

**Context:** The audit (§3.1) confirmed the diary is localStorage-only today. The hook `useManifestEntries` was architected as a backend-swap boundary from the start (docstring at `hooks/useManifestEntries.ts:9-15` explicitly frames it as *"Today: localStorage. Tomorrow: Supabase."*). `PREMIUM_MATRIX.md` row 13 treats server-side persistence as an M4/M5 predecessor gating the diary's premium-gate activation. Question: is server persistence a launch blocker, or can it slip to post-launch?

**Options considered:**
1. **Defer to post-launch.** Ship with localStorage; migrate later. Cheap now, but users lose entries on device change or browser clear, and premium gating stays stalled.
2. **Ship before launch as a full workstream.** Schema + RLS + endpoint + hook swap + export + GDPR. Higher up-front cost; unblocks premium gating and gives users cross-device diary from day one.
3. **Partial — ship server persistence but defer export.** Compromise, but splits the user-facing backup capability from the underlying migration.

**Decision:** option 2 — ship before launch. Full workstream. `[user-decision]`

**Rationale:** The diary is an identity-carrying feature (users write personal intentions over multi-week lunar cycles). Losing that data to a browser-clear event during the first months of use is a retention disaster and a reputational one. Premium gating is also blocked until the enforcement surface exists server-side. Neither problem is negotiable at launch.

**Implementation impact:**
- New Supabase table (§8.2 designs schema).
- New `/api/diary/*` endpoints (§8.4).
- Hook swap (§8.5) — the boundary the hook's docstring already anticipates.
- Export capability (§8.6) ships in the same workstream (per Decision E).
- GDPR deletion (§8.7) ships in the same workstream (required for EU audience).
- Ten-to-fourteen elapsed rounds for the full workstream — real cost, offset by the retention and premium-gating value.

---

### Decision B — Prompt variability: 3+ variants per phase, minimum 24 total `[user-decision]`

**Context:** Audit §4.2 confirmed the prompt library has exactly one prompt per phase (8 total). No rotation, no cycle-day variation, no illumination-% variation. A user writing across multiple lunar cycles sees the same prompt for every Waxing Crescent — plausible to feel repetitive after 2-3 cycles.

**Options considered:**
1. **Keep one-per-phase.** Consistent framing; users know what to expect. Risk: repetition fatigue.
2. **Add variants rotating by cycle day.** Different prompt on day 1 vs day 3 of Waxing Crescent. More variety; larger authoring cost; risks fragmenting the mental model.
3. **Add variants rotating by illumination %.** Finer granularity than cycle day; same authoring cost trade-off.
4. **Add variants selected by per-user entry count for that phase (cycle-based rotation).** User who has written 0 Waxing Crescent entries sees variant 0; 1st entry shows variant 1 on next Waxing Crescent; wraps modulo variant-count.
5. **Random selection.** Cheapest to implement, most variety, no predictability — risks feeling arbitrary.

**Decision:** option 4 — 3+ variants per phase, cycle-based rotation computed from entry count. `[user-decision]`

**Minimum library size: 24 prompts (8 phases × 3 variants). New content needed: 16+ (8 phases × 2 additional variants — existing 8 prompts become variant 0 of their phase).** `[user-decision]`

**Rationale:** Cycle-based per-user rotation (option 4) gives variety *and* predictability. A returning user sees their 2nd Waxing Crescent cycle with a different prompt than their 1st, so the practice feels fresh. But the progression is deterministic — on a given cycle, a given user always sees the same prompt, so shared or recalled prompts don't randomize on them. Three variants per phase is enough to feel varied across 2-3 lunar cycles (roughly 2-3 months) while keeping the authoring budget reasonable. User can extend beyond 3 later if the first rotation feels thin.

Option 5 (random) was rejected because lunar practice intentionally has a rhythm — the prompt should follow the user's journey, not randomize on them. Options 2 and 3 (cycle-day / illumination-%) were rejected because they fragment the mental model within a single phase window (a user on day 2 of Waxing Crescent seeing a different prompt than on day 1 breaks the "this week's work" coherence).

**Implementation impact:**
- §8.8 ships the 16+ new prompts. Authored via the Bulgarian astrology skill (see Implementation Decision 3).
- Variant selection logic: `variantIndex = userEntriesForThisPhase % variantCount`. Entries count, page views do not (Implementation Decision 2).
- `lib/manifest/prompts.ts` schema change: single prompt per phase → array of prompts per phase. Breaking-change migration for the prompt library file; backward-compatible for stored entries (entries snapshot `phaseId` + `phaseName`, not the specific variant used).
- First-variant verification step (§8.8 — see the Bulgarian-skill protocol in 00-PLAN.md).

---

### Decision C — Phase-snapshot semantics: confirmed correct as implemented `[user-decision]`

**Context:** Audit §3.1 verified that `ManifestEntry.phaseId` + `phaseName` are snapshotted at save time, not recomputed on read. Historical accuracy is preserved: if the moon-phase calculation ever improves, old entries keep their original phase labels. Question: is that intended, or should reads recompute from the date?

**Options considered:**
1. **Keep snapshot** — as implemented. Historical accuracy preserved; calc updates don't retroactively rewrite user history.
2. **Recompute on read from entry date** — benefits from calc improvements but rewrites past entries' phase labels if the phase boundaries ever shift.

**Decision:** option 1 — keep snapshot semantics as implemented. `[user-decision]`

**Rationale:** Users remember their entries by how they wrote them. If a future fix to moon-phase calculation shifts a boundary slightly, the Waxing Crescent entry the user wrote two months ago shouldn't silently become Waxing Gibbous in their history view. The snapshot captures the user's experience of the phase, which is the right frame for a personal diary.

**Implementation impact:** none — already correct in code. Server schema (§8.2) must preserve these fields as stored columns, not computed ones. Flagged to prevent accidental "compute from date" refactoring in §8.3/§8.4.

---

### Decision D — `/rhythm` hop cost: keep intermediate CTA page `[user-decision]`

**Context:** Audit §1.2 explained the "`/you → Дневник` vs `Ритъм tab → /rhythm → Отвори дневника`" split. Two entry points, different first-hop experiences. User's early UAT finding ("different page") was the perception of this split.

**Options considered:**
1. **Keep current design.** `/rhythm` is the lunar+transits overview; diary is one click from there. Maintains the 2026-04-20 consolidation (diary not embedded inline).
2. **Add a direct diary shortcut from dashboard.** Bypasses `/rhythm`. Flattens the navigation but duplicates an entry point.
3. **Revert 2026-04-20 consolidation, embed diary inline on `/rhythm`.** Reverts a prior design decision; un-simplifies.

**Decision:** option 1 — keep current design. `[user-decision]`

**Rationale:** The `/rhythm` page's role is the "current celestial weather" surface — lunar phase, meteor showers, transits. The diary is a separate ritual, one click deeper. That's intentional separation, not friction. Users who want the diary daily will navigate via `/you → Дневник` (single click); users browsing "what's up in the sky today" stop on `/rhythm` without being forced into the diary.

**Implementation impact:** none — no code change. Decision is recorded here so a future UX round doesn't re-litigate the split.

---

### Decision E — Export / backup: ship now, wired to server data `[user-decision]`

**Context:** Audit §3.1 flagged no export capability. Pre-server-migration, a power user has no way to preserve entries across devices or browsers. Post-server-migration, data portability remains a valuable feature (user-owned data principle; also GDPR-relevant).

**Options considered:**
1. **Skip export.** Trust server sync post-migration. Cheapest but fails data-portability and GDPR Article 20 "right to data portability."
2. **Ship localStorage export now (pre-migration).** Users get backup immediately. Duplicated work — the export path needs rebuilding when server persistence lands.
3. **Ship export after server migration.** Single build path; waits until §8.6 for users to have any export capability.

**Decision:** option 3 — ship export wired to server data in §8.6, after §8.5 migration. `[user-decision]`

**Rationale:** Since the full workstream ships before launch (Decision A), deferring export by a few sub-rounds doesn't expose users to data loss — the server migration solves the primary "clearing browser loses diary" problem. Post-migration, export from server data is the right single code path. Skipping is not an option given the EU audience and GDPR.

**Implementation impact:**
- §8.6 scope: markdown download of all entries for the logged-in user, generated client-side from a `GET /api/diary/entries` response. Format: `YYYY-MM-DD, Фаза, intention 1, intention 2, intention 3` sections. Bulgarian filename (`stellaeum-дневник-YYYY-MM-DD.md` or similar).
- Format decision deferred to §8.6 sub-round — markdown is a provisional default; JSON is also viable for machine-readable backup. User picks in §8.6.
- No pre-migration export ships in §8.1 or earlier.

---

### Decision F — Silent-failure UX: ship ERR-DI-NNN now `[user-decision]`

**Context:** Audit §3.2 flagged silent catches in `useManifestEntries.ts`: quota exceeded (line 38-40) and corrupted JSON (line 28-30) both fail silently. Users can write entries that disappear without feedback. The audit also noted this pattern is shared with `useDailyHoroscope.ts` and `useStoryList.ts`.

**Options considered:**
1. **Keep silent.** Trust quota limits. Users rarely hit quota with diary entries (~5MB = thousands of entries).
2. **Surface errors immediately with ERR-DI-NNN domain error codes** — same pattern as ERR-BD-NNN for birth-data introduced in commit `c9e4672`. Errors get a Bulgarian message and a durable ID for log triage.
3. **Ship with server migration** — defer until §8.5. Problem: §8.1 (immediate fixes) is the right time to address the silent-failure class.

**Decision:** option 2 — ship now in §8.1 with ERR-DI-NNN IDs. `[user-decision]`

**Rationale:** Silent failures are bugs masquerading as success. Even if quota-exceeded is rare, the user's trust in "the app saved what I wrote" is load-bearing for diary adoption. The fix is cheap, domain-modelled (ERR-DI-NNN mirrors the established ERR-BD-NNN pattern), and independent of the persistence migration — ships now rather than waiting.

**Implementation impact:**
- §8.1 introduces the ERR-DI-NNN namespace. Initial codes:
  - `ERR-DI-001` — localStorage write failed (quota or disabled storage).
  - `ERR-DI-002` — localStorage read corruption (invalid JSON).
  - More codes added in §8.4 and §8.5 as server-side error surfaces emerge (`ERR-DI-003` DB insert failed, `ERR-DI-004` list-entries failed, etc.).
- Bulgarian error copy: same register as ERR-BD-NNN. User-facing phrasing drafted in §8.1 commit, user approves same as the ERR-BD round.
- Error IDs logged to `console.error` today, ready to swap to Sentry per PRE_LAUNCH_PREREQS.md item 2 when monitoring ships.
- Same fix class in `useDailyHoroscope.ts` and `useStoryList.ts` flagged in §8.1 but not fixed there — extending to those hooks is out of diary scope; surfaced for a separate round.

---

### Decision G — Delete UI: none, diary entries are account-lifetime permanent `[user-decision, 2026-04-22]`

**Context:** §8.5 hook swap surfaced that a delete UI exists today in `ManifestHistory.tsx:105-135` — expandable past entries show an "Изтрий запис" button with a "Сигурен/на?" confirmation flow, wired through to the hook's `deleteEntry` → `DELETE /api/diary/entries/[id]`. Decisions A–F never ratified this surface; it predates the workstream and was inherited from the localStorage-era implementation. The server `DELETE` endpoint was shipped in §8.4 as part of full CRUD coverage.

**Options considered:**
1. **Keep the delete UI as inherited.** Users can delete individual entries with confirm. Matches the inherited behaviour; no code removal needed.
2. **Ship §8.5 without a user-facing delete UI.** Entries are lifetime-permanent from the user's perspective. Only GDPR account deletion (§8.7) removes them.
3. **Gate delete behind a settings / advanced toggle.** Delete is available but intentionally hidden — user has to work to find it.

**Decision:** option 2 — no delete UI in §8.5. Diary entries remain available for the lifetime of the user's account. `[user-decision, 2026-04-22]`

**Rationale:** A diary is a personal record across lunar cycles. The product intent of "practice across time" argues against easy deletion — users reading back their journey months later shouldn't find gaps from impulse-deletes. Entries can be updated (same-date upsert preserves id, rewrites intentions), which covers the "I wrote something I didn't mean" case without losing the date-anchored record of having practiced that day. Full deletion only makes sense at GDPR account-deletion granularity.

**Implementation impact:**
- §8.5 ships without delete UI. `ManifestHistory.tsx` loses the "Изтрий запис" / "Сигурен/на?" block; `onDelete` prop removed; `ManifestDiaryContent.tsx` no longer wires `deleteEntry`.
- Server `DELETE /api/diary/entries/[id]` endpoint **retained** — §8.7 uses it (or the underlying service-role DELETE at the table level) to cascade diary entries on GDPR account deletion. Cost of retaining an endpoint with no client UI caller is low; cost of removing then re-adding if requirements shift is higher.
- Hook `useManifestEntries.deleteEntry` method **retained** symmetrically — defensive-available if any future code path adds delete UI, and pairs naturally with the retained `ERR-DI-007` registry entry. No current consumer calls it.
- `ERR-DI-007` (delete failed) remains in the error registry — unused by client code but available if any future path ever adds delete UI.
- §8.9 UAT removes the browser-level "delete happy path" and "delete failure rollback" checks. DELETE coverage remains at the harness level (`m3-uat-harness.mjs` already tests the endpoint round-trip per the §8.4 81/82 run).

---

## Implementation decisions

### Decision 1 — Existing localStorage entries: abandon on migration `[user-decision]`

**Context:** Decision A ships server persistence. Question: what happens to data in `stellaeum.manifest.entries.v1` on the first post-migration login?

**Options considered:**
1. **Migrate on first login.** Read localStorage, POST each entry to the server, clear localStorage on success. Preserves existing writes but complicates the hook swap (§8.5 needs a one-time migration path).
2. **Abandon on migration.** Server starts fresh. Users with existing entries lose them on the first post-migration sign-in.
3. **Surface a migration prompt.** "We detected local entries — import them?" User confirms. Migration path still needed but user-opt-in.

**Decision:** option 2 — abandon. Server starts fresh. `[user-decision]`

**Rationale:** The diary is pre-launch. The user population with existing localStorage entries is small (developers, internal testers, early access) and their entries are test data, not treasured records. Carrying migration code costs engineering time for value that won't exist at launch scale. Abandonment keeps §8.5 focused on the clean swap.

**Implementation impact:**
- §8.5 hook swap: no migration path. The new server-backed hook simply reads from `/api/diary/entries` and never touches localStorage.
- Old localStorage key `stellaeum.manifest.entries.v1` left untouched — not cleared, not read. Browser data stays user-owned; if they ever want to recover, they can inspect DevTools. Post-launch, a localStorage-hygiene pass can delete the stale key (out of scope here).
- Pre-launch communication: user-facing note if any early-access tester has entries they want to preserve — they can screenshot or DevTools-export before we ship §8.5. Low-urgency given small population.

---

### Decision 2 — Variant rotation: cycle-based per-user, entry-count modulo `[user-decision]`

**Context:** Decision B adopted cycle-based rotation (option 4 in that decision's options list). Question: which user actions advance the variant counter?

**Options considered:**
1. **Page view counts.** Every time the user loads the diary surface, variant advances. Simple but decouples variant from actual writing practice.
2. **Entry writes count.** Only `POST /api/diary/entries` advances. Variant stays stable across page loads until the user actually writes something.
3. **Hybrid — entry writes + deliberate "skip" action.** User can manually advance the variant if they don't want to write today.

**Decision:** option 2 — only writes count. `[user-decision]`

**Rationale:** The rotation's purpose is variety across the user's actual practice. Someone who opens the diary 10 times in a cycle but writes once has practiced once — their next cycle should see the next variant, not the variant 10 hops ahead. Page views shouldn't dilute the signal. Skip actions (option 3) add UX surface without clear product benefit; users who don't write aren't asking for a different prompt, they're asking to not write today.

**Implementation impact:**
- Variant selection formula: `variantIndex = entriesWrittenForThisPhase % variants.length` — computed server-side at prompt-fetch time, or client-side if entries list is already in memory. `[inferred]` server-side is cleaner because it aligns with eventual premium-gate enforcement point.
- Entry count is per-user per-phase, not per-user-total. Writing a Full Moon entry doesn't advance the Waxing Crescent variant.
- No variant-skip UI. Keeps the surface minimal.
- Stored entries don't need a `variantIndex` column — the variant is deterministic given (user, phase, entry count), re-derivable on read. Schema stays lean.

---

### Decision 3 — Variant content authoring: Bulgarian astrology skill, with user approval gate `[user-decision] [skill-dependent]`

**Context:** Decision B requires 16+ new Bulgarian prompts to fill out the 8 phases × 3 variants minimum. Authoring options:
- Write manually (user or Claude Code without skill assistance).
- Use the Bulgarian astrology skill in Claude Code's environment. Skill description mentions grammar, orthography, punctuation, style, and natural expression for Bulgarian.
- Third-party translation/astrology contributor (outside engineering scope).

**Options considered:**
1. **Manual authorship (user).** Highest quality baseline, slowest turnaround. User is the product expert.
2. **Skill-generated, user-approved in one shot.** Fastest; all 16+ prompts generated in one batch, user approves or rejects whole batch.
3. **Skill-generated, user-approved in batches with first-variant verification step.** Generate one variant for one phase as a sample, user reviews voice/register/cadence against existing 8 prompts, then batches of ~4-8 proceed with per-batch approval.

**Decision:** option 3 — skill-generated, batched approval, first-variant verification gate. `[user-decision] [skill-dependent]`

**Rationale:** User has confirmed trust in the skill's output quality from prior experience. Rather than inherit that trust blind, §8.8 verifies on a one-variant sample first — matches the voice-consistency discipline applied to every Bulgarian copy round in this thread (ERR-BD-NNN, noon-chart disclaimer, terminology audit). The skill produces a draft; the user is final copy authority. Batch size ≤ 8 per approval keeps feedback loops tight — if voice drifts partway, user can redirect before the drift propagates.

**Implementation impact:**
- §8.8 protocol:
  1. **Sample round.** Skill generates one variant (variant 1) for one phase (likely New or Waxing Crescent — the most-used entry phases). User reviews: register matches existing prompts, traditional-terminology aligned, sentence-starter cadence consistent, placeholders fit the 3-field structure.
  2. **Sign-off or iterate.** If sample passes → proceed. If not → user specifies the adjustment, skill regenerates with corrected framing, re-review.
  3. **Batched generation.** Remaining 15+ prompts in batches of ~4-8 per batch. Each batch committed independently; user approves the batch before the batch ships.
  4. **Final copy authority is the user's.** Skill proposes; user confirms.
- `[skill-dependent]` tag on anything downstream of the skill's output — if skill quality regresses or the specific invocation produces lower-register copy, flag and iterate rather than ship.

---

## Legend

- **[user-decision]:** the authority for this claim is the user's direct call in the 2026-04-20 §8.0 review. Not derivable from code.
- **[verified]:** claim is traceable in source files or in `DIARY_AUDIT.md`. Anyone can reconstruct by reading the cited file at the cited line.
- **[inferred]:** reasoning from planning context; the claim is one the author believes correct but hasn't executed or directly observed.
- **[skill-dependent]:** claim relies on the Bulgarian astrology skill's output quality — which the user has confirmed is trusted in general, but which is verified per-batch in §8.8 (Decision 3 protocol).

Any sub-round doc authored later in this workstream should continue using these four tags when making claims, so the epistemic chain stays legible.
