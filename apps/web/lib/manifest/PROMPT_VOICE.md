# Diary prompt voice — baseline reference

Voice-baseline observations for the `ManifestPrompt` library in
`apps/web/lib/manifest/prompts.ts`. Lifted from the original 8 prompts
(variant-0 of each lunar phase) during §8.8 pre-stage work, 2026-04-23.

Written as a reference for anyone generating, editing, or reviewing
Bulgarian diary prompts. Not a spec — a calibration. Variants should
feel like siblings of the baseline, not imitations.

**Skill context:** the Bulgarian astrology skill pinned at commit
`e700c13` (`.claude/skills/bulgarian-skill/`) was the basis for §8.8
variant generation against this baseline. Future Bulgarian prose work
touching the diary prompts should run against this doc + the skill.

---

## `heading` — always `Три + noun`

Rigid pattern across all 8 variant-0 prompts. Two- to three-word
nominal phrase, no verbs, no articles.

| Phase | Variant-0 heading |
|---|---|
| `new` | `Три намерения` |
| `waxing_crescent` | `Три първи стъпки` |
| `first_quarter` | `Три решения` |
| `waxing_gibbous` | `Три настройки` |
| `full` | `Три благодарности` |
| `waning_gibbous` | `Три урока` |
| `last_quarter` | `Три освобождавания` |
| `waning_crescent` | `Три акта на грижа` |

**Rule of thumb:** the noun is the *act* of the session, not the *theme*.
"Три намерения" (three intentions) — the user writes three intentions.
"Три освобождавания" (three releases) — the user releases three things.

**`Три` is load-bearing.** The UI renders three input fields; the heading
mirrors that count in plain language. Variants should retain `Три`.

---

## `lead` — 2 sentences, 23–35 words total

### Structure

**Sentence 1: phase-image metaphor.** Sets an atmosphere tied to the
lunar position without naming the phase in technical form. The phase
is implied through light / time / motion imagery.

| Phase | Sentence 1 image |
|---|---|
| `new` | `Новолунието е чист лист.` |
| `waxing_crescent` | `Светлината расте.` |
| `first_quarter` | `Половин светлина, половин сянка.` |
| `waxing_gibbous` | `Пълнолунието е близо.` |
| `full` | `Пълнолунието осветява всичко.` |
| `waning_gibbous` | `Светлината започва да намалява.` |
| `last_quarter` | `Време е да пуснеш.` |
| `waning_crescent` | `Почивка преди новото начало.` |

The noun `Новолунието` / `Пълнолунието` appears in two of eight — both
are user-facing Bulgarian phase names, not technical astrology terms.
The other six use pure light/time imagery with no phase noun at all.

### Sentence 2: imperative instruction

Introduces the three-slot exercise. Dominant verb: **`Запиши`**.
Followed by a qualifier describing what kind of three-item list.

Full lead examples:

> `Новолунието е чист лист. Запиши три намерения — ясни, лични, истински. Цикълът напред ще ги понесе.` (3 sentences for `new` — outlier; see below)

> `Светлината расте. Запиши три малки стъпки — нещо, което можеш да направиш в следващите дни, за да подхраниш намеренията от новолунието.`

> `Половин светлина, половин сянка. Напиши три решения, които те приближават до целта — включително онези, които отлагаш.`

`new`'s baseline has **three sentences, not two** — it adds a closing
line (`Цикълът напред ще ги понесе.`). This is the only variant-0 with
a third sentence. Two-sentence leads are the norm; three-sentence
leads are acceptable if the third sentence is a short lyrical coda
that reinforces the cycle metaphor.

### Variation on the imperative verb

Seven of eight use `Запиши`. `first_quarter` uses `Напиши три решения`
— both `запиши` and `напиши` are valid here; the former is more
"record for yourself," the latter is more "compose." Variants may use
either.

---

## `fieldLabels` — 3 short phrases, parallel within the phase

Array of three strings, 1–3 words each. Parallel grammatical form
within a single phase.

| Phase | Variant-0 fieldLabels | Form |
|---|---|---|
| `new` | `Първо намерение / Второ намерение / Трето намерение` | Ordinal + noun |
| `waxing_crescent` | `Първа стъпка / Втора стъпка / Трета стъпка` | Ordinal + noun |
| `first_quarter` | `Решавам да / Отказвам се от / Избирам` | 1st-person verb phrases |
| `waxing_gibbous` | `Настройвам / Подобрявам / Подготвям` | 1st-person single verbs |
| `full` | `Благодаря за / Честувам / Признавам` | 1st-person verb phrases |
| `waning_gibbous` | `Научих / Разбрах / Приемам` | 1st-person past + present |
| `last_quarter` | `Пускам / Сбогувам се с / Освобождавам` | 1st-person verb phrases |
| `waning_crescent` | `Подхранвам / Почивам в / Връщам си` | 1st-person verb phrases |

**Two distinct fieldLabels shapes observed:**
1. **Ordinal + noun** (`new`, `waxing_crescent`) — formal, tidy.
2. **1st-person verbs** (the other six) — active, interior voice.

Variants within a phase may diverge from variant-0's shape, e.g.,
variant-1 of `new` could adopt the 1st-person-verb shape and still
feel coherent. But within a single variant, the three labels must
share a grammatical form — parallel structure is non-negotiable.

---

## `placeholders` — sentence starters with ellipsis

Array of three strings, each ending in `...`. Never complete sentences.
Never imperatives. Always sentence fragments that the user completes.

| Phase | Variant-0 placeholders |
|---|---|
| `new` | `Искам да... / Канен/а съм да... / Отварям място за...` |
| `waxing_crescent` | `Днес мога да... / Тази седмица ще... / Започвам с...` |
| `first_quarter` | `Решавам да... / Отказвам се от... / Избирам да...` |
| `waxing_gibbous` | `Настройвам... / Подобрявам... / Подготвям се за...` |
| `full` | `Благодарен/на съм за... / Празнувам... / Признавам в себе си...` |
| `waning_gibbous` | `Научих, че... / Разбрах защо... / Приемам, че...` |
| `last_quarter` | `Пускам... / Сбогувам се с... / Освобождавам се от...` |
| `waning_crescent` | `Подхранвам се с... / Ще почина в... / Връщам си...` |

**Rules:**
- **Always end in `...`** (three dots, ellipsis character). Removing
  the ellipsis breaks the invitation shape — the user's text flows
  into the prompt without a visual handoff.
- **Never complete sentences.** "Искам да..." invites completion.
  "Искам свобода." is a statement the user has no way to extend.
- **Never imperatives.** "Запиши..." in a placeholder would collide
  with the lead's instruction voice and conflate author with user.
- **First-person-singular-present-tense verbs dominate.** Six of
  eight phases lead placeholders with 1st-person forms. The two
  exceptions (`new`, `waxing_crescent`) mix present-state and
  temporal phrasing (`Днес мога да...`, `Канен/а съм да...`).
- **The three placeholders within a phase often loosely echo the
  three fieldLabels** (e.g., `first_quarter`: label `Решавам да` →
  placeholder `Решавам да...`) but exact mirroring is not required.

---

## Astrology-terminology density — deliberately light

The diary voice **avoids technical astrology vocabulary** even though
it's cued by the lunar cycle. Across all 8 variant-0 prompts:

- **No planet names** (Слънце, Луна specifically referred to by name
  only in compound nouns like `Новолунието`; never as astrological
  actors).
- **No aspect vocabulary** (съединение, квадрат, опозиция,
  прилагащ/раздалечаващ — none appear).
- **No house references** (домове, асцендент, MC, etc.).
- **No technical phase-names** (*"нарастваща лунна сърца"* and similar
  never appear; the image does the work — `Светлината расте.`).

The heaviest astrology-adjacent term used in the baseline is **`цикъл`**
(two occurrences: `Цикълът напред ще ги понесе` in `new`; `в този
цикъл` in `full` and `waning_gibbous`). `цикъл` is acceptable.

**This matters for variant generation:** the pinned skill's
`references/astrology.md` provides comprehensive technical
terminology (planets, aspects, houses). The diary voice deliberately
does not use that terminology. Variants should preserve the light
metaphoric register, not pull the skill's fuller vocabulary.

---

## Gendered inclusive forms

Preserve Bulgarian's gender-inclusive pairing convention when
addressing the user:

- `благодарен/на` (from `full` placeholders)
- `Канен/а` (from `new` placeholders)

Bulgarian adjectives and some participles agree with the addressee's
gender. When the addressee is unknown (any diary user), the
convention is `masculine/feminine-ending` separated by `/`. The skill
handles this correctly; variants must retain it anywhere a gendered
form is used.

When phrasing can be rewritten to avoid the gender entirely (neutral
nouns, 1st-person-singular verbs which Bulgarian doesn't gender-mark
in present tense), that's also acceptable and often more elegant.

---

## Miscellaneous

- **No direct phase name in the lead.** The lunar-light image does
  the work. The UI already displays the phase name separately in the
  diary surface; the lead doesn't need to repeat it.
- **Tone is invitational, not prescriptive.** The lead asks, the
  placeholders invite, the headings name the gift of the session.
  Avoid "трябва да" (must) constructions; "можеш да" (can) or bare
  imperatives are the register.
- **Register is grounded-poetic.** Between gentle therapist and
  thoughtful friend who happens to know astrology. Not ceremonial,
  not clinical. One or two metaphoric images per prompt; not three.

---

## What this doc is not

- **Not a generation spec.** Following every rule exactly would
  produce prompts identical to variant-0. Variants exist to offer a
  different angle on the same phase — register stays the same,
  specific lexical choices should diverge.
- **Not exhaustive of Bulgarian naturalness rules.** The skill's
  `references/natural-phrasing.md` is the authoritative reference for
  those. This doc calibrates the *diary register* on top of that.
- **Not frozen.** If §8.8 surfaces a register observation that this
  doc missed, amend the doc and note the amendment in the §8.8 close
  summary. Same pattern as the ERR-DI-NNN register closing at §8.4.
