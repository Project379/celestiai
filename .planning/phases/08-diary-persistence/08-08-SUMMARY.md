# §8.8 — Prompt library variant expansion + rotation close summary

**Opened:** 2026-04-23 (after §8.7 close — GDPR cascade + export shipped).
**Closed:** 2026-04-24 (typecheck-verified monorepo-wide; astrology suite 39/39; §8.9 e2e verification round opens next).
**Outcome:** Diary prompt library refactored from a single-variant-per-phase record to variant-arrays with entry-count-indexed rotation. 24 prompts (7 phases × 3 variants + 1 phase × 2 variants) generated against a voice-baseline doc and the pinned Bulgarian skill, then audited in two grammar passes. Single consumer (`ManifestEntryForm`) updated; typecheck green at every push.

---

## Pre-stage — skill pin + voice-baseline doc

Before any variant generation, two artifacts landed so that all downstream prompt work had a stable reference:

| Artifact | Commit | Purpose |
|---|---|---|
| `.claude/skills/bulgarian-skill/` | `e700c13` | Pinned Bulgarian language skill — grammar, orthography, natural-phrasing references. Referenced in every variant-generation and audit pass; the SHA locks which version of the skill the prompts were authored against. |
| `apps/web/lib/manifest/PROMPT_VOICE.md` | `635a6e0` | Voice-baseline doc derived from the original 8 variant-0 prompts. Documents heading pattern, lead structure, fieldLabels shapes, placeholder conventions, astrology-terminology density, and gendered inclusive form discipline. Intended as calibration for future variant generation, not as a rigid spec. |

Both are now referenced from the `prompts.ts` library header so future maintainers generating new variants have a self-contained trail: read the skill, read the voice doc, then generate.

---

## Generation rounds — batched with surface-before-doing discipline

The 16 new variants (v1 and v2 across all phases except last_quarter v2, which was retired) were generated in three surfacing rounds. Each round was a proposal-surface → review → commit loop. Per-prompt iteration paths stayed open throughout — blanket approval was never assumed.

| Commit | SHA | Batch | Size |
|---|---|---|---|
| 1 | `5a87976` | Stage 1 sample — `new` v1 only | 1 prompt |
| 2 | `9d442f4` | Stage 2 Batch 1 — v1 for remaining 7 phases | 7 prompts |
| 3 | `a0de5a5` | Stage 2 Batch 2 — v2 for all 8 phases | 8 prompts |

The sample-then-batch shape was deliberate: the first `new` v1 flushed out the voice baseline's application before scaling to a 7-prompt commit, and the Batch 1 cross-batch coherence check (heading pattern, imperative verb ratio, lead-image metaphor, fieldLabels shape, placeholder ellipsis) was reused for Batch 2 to verify variants didn't drift from the baseline as variety accumulated.

### Per-phase angle divergence

Each phase's three variants stake a distinct epistemic or affective stance on the same lunar moment. The per-phase table below summarizes the angles (recorded in `prompts.ts` headings and `PROMPT_VOICE.md` observations; reproduced here for quick reference):

| Phase | v0 heading | v1 heading | v2 heading |
|---|---|---|---|
| `new` | Три намерения (intend) | Три семена (plant) | Три въпроса (inquire) |
| `waxing_crescent` | Три първи стъпки (act) | Три обещания (commit) | Три радости (notice) |
| `first_quarter` | Три решения (decide toward goal) | Три граници (bound) | Три опори (lean on) |
| `waxing_gibbous` | Три настройки (refine) | Три надежди (hope) | Три врати (open) |
| `full` | Три благодарности (thank) | Три открития (discover) | Три истини (know) |
| `waning_gibbous` | Три урока (learn) | Три спомена (remember) | Три реколти (harvest) |
| `last_quarter` | Три освобождавания (release) | Три прошки (forgive) | — |
| `waning_crescent` | Три акта на грижа (care) | Три тишини (be silent) | Три завръщания (return home) |

`last_quarter` intentionally ships with 2 variants. During Batch 2 generation, a third angle between освобождавания (general release) and прошки (specific-release-via-forgiveness) was attempted twice (Три благослови, then Path-B rephrase to Три записа) and both collapsed to weak differentiation. Per §8.0's "register consistency over mechanical variety" principle, shipping 2 strong variants beat forcing a third. The rationale is captured as an in-line comment above the `last_quarter` entry in `prompts.ts` so future maintainers don't reach for a fourth-variant "completion" without knowing the history.

---

## Grammar audit — two passes, corpus-clean

After Batch 2 committed, native-speaker review surfaced that Bulgarian correctness had slipped through the variant-generation rounds. Two dedicated correction passes followed:

### Pass 1 — user-flagged (commit `5d65b50`, 5 fixes)

5 lead-sentence issues across three layers (v0 `last_quarter`, v1 `waxing_gibbous`, v1 `waning_gibbous`, v2 `first_quarter`, v2 `waning_crescent`):

- `Време е да пуснеш` → `Време е да отпуснеш хвата` (transitive verb needed object; masculine short-form definite article applied)
- `Пълнолунието е на крачка` → `Пълнолунието наближава` (completed idiom)
- `Светлината се връща в себе си` → `Пълнолунието вече отминава` (broken reflexive-within-reflexive)
- `Половин път е зад теб` → `Половината път е зад теб` (definite article for portion-of-known-whole)
- `Нощта преди новото` → `Нощта преди новото начало` (sentence fragment completed)

### Pass 2 — skill-assisted audit (commit `7889ad9`, 6 fixes)

Invoked the pinned `bulgarian-skill` and walked `grammar.md` + `natural-phrasing.md` across all 24 prompts × 8 string fields = 192 Bulgarian strings. Surfaced 6 additional issues:

- v0 `full` fieldLabel: `Честувам` (non-standard) → `Празнувам` (aligned with placeholder, which already used the standard form)
- v1 `first_quarter` placeholder: `Отказвам се да...` (reflexive) → `Отказвам да...` (matches transitive fieldLabel)
- v1 `waning_gibbous` heading+lead: `спомени` → `спомена` (count-form correction for masculine non-person noun — same bug class as the user-flagged `благослови`)
- v2 `new` fieldLabel: `Питам` (transitive) → `Питам се` (reflexive; matches introspective placeholder)
- v2 `last_quarter` full Path-B rephrase: heading `Три благослови` → `Три записа`; lead + fieldLabels + placeholders refactored (dative-reflexive style fix + count-form fix rolled in)
- v2 `waning_crescent` lead: `към кого` → `при кого` (idiom correction — `прибирам се при` is the fixed pattern for "come home to [person]")

### Evidence of completion

All 24 prompts × 8 string fields (192 strings: headings, leads, fieldLabels, placeholders) clean against `grammar.md` + `natural-phrasing.md` as of commit `7889ad9`. No calques, article errors, tense issues, clitic-placement errors, count-form mismatches, or missing `ѝ` diacritics in the final corpus. Surveyed categories: definite article (full/short), count forms for masculine non-person nouns, gendered inclusive `/a` pairing, reflexive/transitive verb form consistency between labels and placeholders, idiomatic prepositions (`при` vs `към` vs `на`), sentence completeness.

---

## Stage 3+4 — schema + consumer refactor (commit `a38c23d`)

Rolled into a single atomic commit because the consumer footprint was small (one call site).

### Schema change

```ts
// Before
MANIFEST_PROMPTS: Record<LunarPhaseId, ManifestPrompt>

// After
MANIFEST_PROMPTS: Record<LunarPhaseId, readonly [ManifestPrompt, ...ManifestPrompt[]]>
```

Tuple typing `[ManifestPrompt, ...ManifestPrompt[]]` guarantees non-empty arrays at compile time — the first element is required. Runtime assertion (`if (variants.length === 0) throw ...`) in `getManifestPrompt` is belt-and-suspenders for a function that renders on every diary surface paint; cost is negligible and the loud error message beats a silent undefined propagating to the form.

### Function signature

```ts
// Before
getManifestPrompt(phaseId: LunarPhaseId): ManifestPrompt

// After
getManifestPrompt(phaseId: LunarPhaseId, entryCountForPhase: number): ManifestPrompt
// Selection: variants[entryCountForPhase % variants.length]
```

### Consumer update

`ManifestEntryForm` accepts new `entryCountForPhase: number` prop. `ManifestDiaryContent` computes it via `useMemo(() => entries.filter(e => e.phaseId === phase.id).length, [entries, phase.id])` and passes through. The `useMemo` guards against redundant recomputation when the entries array reference changes but this phase's count doesn't (common during re-renders triggered by non-entry state).

Grep for `getManifestPrompt` callers confirmed single call site — no missed consumers. The `@celestia/core` moon-phase module has a separate `phase.journalPrompt` field for the /rhythm surface, but that's a distinct prompt entirely; the comment at the top of `prompts.ts` explicitly calls out the split so neither gets consolidated into the other by mistake.

### Staging file deletion

`apps/web/lib/manifest/prompt-variants.ts` deleted in the same commit. Its own header declared it as pre-Stage-4 staging only ("Nothing imports this file until Stage 4 — it is pure staged data"). All 24 records merged into `MANIFEST_PROMPTS` tuple arrays; the file is now pure dead code.

### Verification

- `npm run typecheck` (turbo) green across all 5 packages (`@celestia/astrology`, `@celestia/core`, `@celestia/mobile`, `@celestia/ui`, `@celestia/web`).
- `packages/astrology` test suite 39/39 passing (non-regression check — no astrology code path touches the manifest library, but the suite is the cheapest signal the core workspace didn't break).

---

## Rotation math — verification

### Today's rotation shape

- **7 phases × 3 variants** (`new`, `waxing_crescent`, `first_quarter`, `waxing_gibbous`, `full`, `waning_gibbous`, `waning_crescent`): user entry count for that phase advances through `0 → 1 → 2 → 0 → 1 → 2 → …`
- **1 phase × 2 variants** (`last_quarter`): user entry count advances through `0 → 1 → 0 → 1 → …`

Each phase rotates independently — the cursor is `entries.filter(e => e.phaseId === phase.id).length`, not the total diary entry count. A user who has written 5 `full`-phase entries sees variant-2 on their next `full` entry (5 mod 3 = 2), regardless of how many entries they've written for other phases.

### Future-proofing — adding variants

- **Adding a 4th variant to any currently-3-variant phase**: users mid-rotation experience a soft re-start. A user who had written 3 entries (seeing variant-0 on entry 4 under the old 3-variant count) will see variant-3 (the new one) on entry 4 under the 4-variant count. Not a break — just a rotation reset. Document in release notes if it ships; users don't lose data, but the prompt cadence shifts.
- **Adding a 3rd variant to `last_quarter`**: forward-only change. Existing rotation state recomputes cleanly from the user's entry count — no migration, no special-case. The inline comment above the `last_quarter` entry in `prompts.ts` explicitly calls this out so a maintainer knows the third slot is open to a future variant if a strong third angle emerges.

### Integer edge cases

`entryCountForPhase` comes from `.length` on a filtered array — always `>= 0`, always an integer, never `NaN` or negative. `entryCountForPhase % variants.length` is therefore always `[0, variants.length - 1]`. No overflow or underflow paths. The runtime assertion in `getManifestPrompt` guards the `variants.length === 0` case that the tuple type already makes unreachable — redundant by design.

---

## Post-launch revisit triggers

| Trigger | Action |
|---|---|
| **Decision to add a variant to an existing phase** | Author against `PROMPT_VOICE.md` + current skill; run the two-pass grammar audit (native-speaker pass + skill-assisted pass); append to the phase array. Note the soft re-start in release notes if the phase already shipped 3 variants. |
| **Decision to add the 3rd variant to `last_quarter`** | Forward-only; no migration. Strike or update the in-line comment above `last_quarter` that documents why it shipped with 2. |
| **Bulgarian skill updates (SHA advances past `e700c13`)** | Two choices: (a) lock the existing prompts to the original skill SHA and only audit future prompts against the newer skill — preserves consistency at cost of stale calibration, or (b) re-audit the full 192-string corpus against the new skill — surfaces drift at cost of churn. Decision gate is whether the skill changed materially in a way that affects the diary register. Default lean: (a) unless a specific issue triggers (b). |
| **A native speaker reports a grammar issue that the two-pass audit missed** | Fix in a dedicated commit referencing this summary; update the voice doc if the issue reveals a new register observation (same amendment pattern as ERR-DI-NNN at §8.4). |

---

## Commit trail

| Commit | SHA | What |
|---|---|---|
| Pre-stage 0a | `e700c13` | `chore(skills): pin Bulgarian astrology skill for §8.8 reference` |
| Pre-stage 0b | `635a6e0` | `docs(manifest): voice-baseline doc for diary prompt register` |
| Stage 1 sample | `5a87976` | `feat(manifest): §8.8 Stage 1 — variant-1 for new moon (sample approved)` |
| Stage 2 Batch 1 | `9d442f4` | `feat(manifest): §8.8 Stage 2 — variant-1 Batch 1 for 7 remaining phases` |
| Stage 2 Batch 2 | `a0de5a5` | `feat(manifest): §8.8 Stage 2 — variant-2 Batch 2 for all 8 phases` |
| Grammar pass #1 | `5d65b50` | `fix(manifest): §8.8 Bulgarian grammar pass — 5 lead sentences across v0/v1/v2` |
| Grammar pass #2 | `7889ad9` | `fix(manifest): §8.8 Bulgarian grammar pass #2 — skill-assisted audit of remaining 19 prompts` |
| Stage 3+4 refactor | `a38c23d` | `refactor(manifest): §8.8 Stage 3+4 — prompt library to variant arrays with rotation` |
| Close summary | (this doc) | §8.8 close summary |

---

## Voice-baseline observations preserved from pre-stage 0b

(Reproduced from `PROMPT_VOICE.md` for standalone reference — consult the doc for full treatment.)

- **Heading pattern is `Три + noun`.** Rigid across all 24 variants; two- to three-word nominal phrase, no verbs, no articles. `Три` is load-bearing (mirrors the three input fields).
- **Lead is 2 sentences, 23–35 words.** Sentence 1 is a phase-image metaphor (light/time/motion) that implies the phase without naming it technically. Sentence 2 is the imperative instruction introducing the three-slot exercise.
- **Dominant imperative is `Запиши`** (22 of 24 prompts). Divergences are semantically load-bearing: `Посей` on v1 `new` (sowing seeds), `Напиши` on v0 `first_quarter` (composing decisions), `Направи` on v2 `last_quarter` (making entries, post-Path-B rephrase).
- **FieldLabels follow two shapes**: ordinal+noun (`Първо намерение` / `Първи запис`) or 1st-person-singular-present verb. Parallel structure within a single variant is non-negotiable.
- **Placeholders always end in `...`**, are never complete sentences, never imperatives, and lead with 1st-person-present verbs where possible.
- **Astrology-terminology density is deliberately light.** No planet names as actors, no aspect vocabulary, no house references, no technical phase-names. The heaviest tolerated term is `цикъл`.
- **Gendered inclusive `/a` pairing** is preserved wherever the register forces an addressee-gendered form (`благодарен/на`, `изправен/а`). 1st-person-singular-present verbs route around this because Bulgarian doesn't gender-mark them in present tense.
- **Register is grounded-poetic** — between gentle therapist and thoughtful friend. Not ceremonial, not clinical. One or two metaphoric images per prompt; not three.

---

## §8.8 close — §8.9 opens

With the library refactored and the prompt corpus clean, §8.9's e2e verification round opens next: cycling through all 24 variants on the live diary surface, verifying the rotation cursor advances correctly across phase switches, and confirming the type guarantee holds in the production bundle. Runbook and UAT assertions to be specified in the §8.9 plan.
