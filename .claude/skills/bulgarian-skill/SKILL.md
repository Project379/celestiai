---
name: bulgarian-language
description: Comprehensive Bulgarian language skill covering grammar, orthography, punctuation, style, and natural expression. Use this skill whenever the user asks to write, translate, proofread, edit, or generate ANY text in Bulgarian — including emails, articles, social media posts, creative writing, formal documents, UI strings, subtitles, or chat messages. Also trigger when the user asks about Bulgarian grammar rules, spelling conventions, punctuation, stylistic choices, definite article usage (пълен/кратък член), or how to express something naturally in Bulgarian. Trigger even for short requests like "say X in Bulgarian" or "is this correct Bulgarian?" or "fix my Bulgarian text." If Bulgarian text appears in the conversation and the user wants feedback or improvements, use this skill.
---

# Bulgarian Language Skill

## Stellaeum project rules (these OVERRIDE the general defaults below)

*Approved by the founder 2026-10-07 (with the casing and voice rulings below) — register row BULGARIAN-SKILL-UPDATE. The founder is the final word on Bulgarian.*

1. **New user-facing Bulgarian stops for founder approval.** Do not add, reword or "improve" any string the user will see — UI label, error, notification, stage line, reading template — without showing it to the founder first and getting an explicit yes. Mark unapproved copy `PLACEHOLDER_COPY` in mock-ups and never commit it to a content-home file. A string passing `check:bg-strings` or `check:copy-lock` is not approval; it only means the spelling is valid and the lock was regenerated.
2. **Register: informal ти, always.** Never Вие/Ви/Ваш in product copy. The general advice below that Вие is the "safest default" does not apply here. Only Кръг, a jointly addressed pair, uses plural — that is number agreement, not register.
3. **The Oracle is the speaker.** Wherever the app says something to the user — readings, the daily horoscope, loading and reveal stage lines, empty states, guidance — the voice is the Oracle's. Plain UI (buttons, labels, settings, form errors) stays neutral: no first person at all. The ratified «Звездите са временно недостъпни. Опитай отново след малко.» stays as is.
4. **The Oracle has NO gender.** It speaks in present and future tense only. Never first-person past participles (подредил/подредила, видял/видяла, направил/направила). If a past event must be referenced, use impersonal or third-person phrasing («Подредиха се…», «Небето се промени»). The same applies to anything that would need the *user's* gender (си уморен/а, си направил/а): reword so no gender is needed. Never invent a replacement wording for existing copy — propose it to the founder.
5. **Gender pairs are spelled out** (only where the user's own gender truly cannot be avoided). "доволен или доволна", never "доволен/а" or "доволен/на" — fleeting-vowel adjectives (доволен, несигурен, уморен) do not compact evenly. Prefer rewording so no gender is needed ("Как се чувстваш днес?").
6. **Clitics sit after the first stressed constituent, not after the verb.** "Какво ти тежи?" not "Какво тежи ти"; "Днес ще ти кажа", "Тя ми каза". A clitic never opens a clause. Check every composed string, not only fragments — the clause-level rule only shows once the string is assembled.
7. **Possessives with personified nouns.** Слънце is neuter, Луна feminine, but the model (and humans) default to the masculine article/possessive for "mythological" planets. Agree with the grammatical gender: "твоето Слънце", "твоята Луна", "твоят Меркурий", "твоята Венера" — never "твоят Слънце".
8. **Route composed strings through `packages/core/src/i18n/bg-grammar.ts`** (в→във, с→със, agreement, ordinals) instead of hand-rolling the rule.
9. **Quotes:** Bulgarian „…“ quotes in new copy; follow the copy files for ellipsis.

### Glossary — product terms, exactly as they appear in the copy files

Capitalisation and form are part of the term. Do not "correct" them without asking. (Source: `apps/mobile/app/(authed)/(tabs)/_layout.tsx`, `packages/core/src/**`, the mock-ups. Checked 2026-10-07.)

| Term | Form to use | Notes |
|---|---|---|
| Tab 1 | **Днес** | tab title and label; mock-ups render the bar label in caps (ДНЕС) |
| Tab 2 | **Карта** | the chart tab |
| Tab 3 | **Кръг** | the people graph; "Твоят кръг" is the heading form |
| Tab 4 | **Ритъм** | |
| Tab 5 | **Ти** | the app addresses the user in the second person |
| The AI | **Оракул** (noun), **Питай Оракула** (the one exit on Днес) | Оракулът as subject, Оракула as object / after "Питай" |
| The chart | **натална карта** (lower case mid-text, 27 files); **Натална карта** (sentence start, 3 files) | not "рождена карта" |
| Sky block on Днес | **небесен ритъм** (lower-case caption) | |
| Moon diary | **Лунен дневник** at the start of a sentence, label or heading; **лунен дневник** mid-sentence | Only the first word is capitalised, never «Лунен Дневник». Founder ruling 2026-10-07; moon-detail CtaPanel fixed the same day |
| Chart details | **Детайли** | the Карта pedestal word |
| Big three | **Слънце**, **Луна**, **Асцендент** | order as written; "Слънце · Луна · Асцендент" |
| Guide | **Ръководство** | |
| Paid tier | **Премиум** | |
| Birth data | **рождени данни** | «Рождени данни» as an entry label is PENDING approval |

### Founder-approved strings so far

Only strings the founder has explicitly approved belong here. The copy-lock (`scripts/i18n/copy-lock.json`, 2,898 entries) is the machine snapshot of reviewed copy, not a list of approved wording.

- «Данните са запазени. Картата ти е обновена.» — shown once after a successful birth-data edit (approved 2026-10-01).
- «Звездите са временно недостъпни. Опитай отново след малко.» — the single AI-unavailable message (ratified; failover adds no new copy).
- The five tab labels above.
- «Питай Оракула».

**Pending, NOT approved:** «Рождени данни» (edit entry label), «Изчисляваме картата ти.» (proposed first line for a new user's chart), the reveal-flow traits / skip / chart-button / failure copy, and every `PLACEHOLDER_COPY` string in the mock-ups.

**Known shipped defect:** `moon-detail` content (`PHASE_META` in `packages/core/src/lib/moon-phase.ts`, mock-up text «Какъв прогрес съм направил/а…») contains a compact gender pair and a first-person past participle, which violates rules 4 and 5. A gender-neutral rewording has been proposed to the founder; it is not changed until approved.

---

This skill encapsulates the rules, conventions, and expressive patterns of the Bulgarian language. It is the authoritative reference for producing grammatically correct, naturally sounding Bulgarian text.

**CRITICAL RULE: NEVER translate English to Bulgarian word-for-word. Bulgarian has its own sentence logic, its own phrasing patterns, its own way of packaging thoughts. Read `references/natural-phrasing.md` FIRST for any text generation task.**

Before writing or editing Bulgarian text, consult the relevant reference files based on the task:

- **ANY text generation or translation** → read `references/natural-phrasing.md` FIRST (mandatory)
- **Grammar questions, article usage, verb forms** → read `references/grammar.md`
- **Spelling, punctuation, capitalization, number formatting** → read `references/orthography.md`
- **Style, tone, register, natural expression** → read `references/style-and-expression.md`
- **Astrology content (horoscopes, natal charts, zodiac signs)** → read `references/astrology.md`

## Core Principles

### 1. Bulgarian uses the Cyrillic alphabet (30 letters)

The Bulgarian Cyrillic alphabet has 30 letters: А Б В Г Д Е Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ь Ю Я. There is no infinitive form of verbs. The definite article is suffixed, not prefixed. Bulgarian is part of the Balkan Sprachbund and shares features with Romanian, Greek, and Albanian that set it apart from other Slavic languages.

### 2. The definite article is the #1 source of errors

Bulgarian masculine singular nouns take either the "full" article (-ът/-ят) or the "short" article (-а/-я). The full article marks the **subject** of a sentence; the short article marks everything else. The test: replace the noun with **той** (he) → full article; replace with **него** (him) → short article. If there is a preposition before the noun, it is ALWAYS short article. See `references/grammar.md` for the complete ruleset.

### 3. No infinitive — use "да + present tense"

Bulgarian lost the infinitive. Where other Slavic languages use an infinitive, Bulgarian uses "да" + the present subjunctive: "Искам да пиша" (I want to write), not *"Искам писати". The "да"-construction is one of the most distinctive features of the language.

### 4. Verbal system is exceptionally rich

Bulgarian has 5 moods (indicative, imperative, subjunctive, conditional, renarrative), 2 aspects (perfective/imperfective), 3 time positions, and over 30 tense-aspect-mood combinations. The **renarrative mood** (преизказно наклонение) is unique — it marks events the speaker did not personally witness. See `references/grammar.md` for details.

### 5. Word order is flexible but meaningful

The default order is SVO, but because verbs agree with subjects in person and number, the word order can shift freely for emphasis, style, or information structure. Fronting an object creates emphasis; subject pronouns are routinely dropped when clear from context.

### 6. Orthographic traps are well-documented

The main categories of spelling difficulty are: слято/полуслято/разделно писане (joined/hyphenated/separate writing of compound words), the "променливо я" (alternating ya), doubled consonants, and the prepositions "във" and "със" before words starting with в/ф and с/з respectively. See `references/orthography.md`.

## Quick Decision Tree

1. **Writing new Bulgarian text?** → Read `references/natural-phrasing.md` FIRST (non-negotiable), then `references/style-and-expression.md` for register, then `references/grammar.md` for correctness.
2. **Translating into Bulgarian?** → Read `references/natural-phrasing.md` (MANDATORY — this prevents calques), then all other files. Pay special attention to: restructuring English sentences into Bulgarian logic, not calquing passive voice, handling the definite article, and choosing ти vs. Вие.
3. **Writing astrology content?** → Read `references/astrology.md` for all terminology and phrasing, PLUS `references/natural-phrasing.md` for general Bulgarian naturalness.
4. **Proofreading/editing?** → Read `references/orthography.md` for the common error checklist, then `references/grammar.md` for article and verb issues.
5. **Answering a grammar question?** → Read `references/grammar.md` and cite the specific rule.
