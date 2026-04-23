---
name: bulgarian-language
description: Comprehensive Bulgarian language skill covering grammar, orthography, punctuation, style, and natural expression. Use this skill whenever the user asks to write, translate, proofread, edit, or generate ANY text in Bulgarian — including emails, articles, social media posts, creative writing, formal documents, UI strings, subtitles, or chat messages. Also trigger when the user asks about Bulgarian grammar rules, spelling conventions, punctuation, stylistic choices, definite article usage (пълен/кратък член), or how to express something naturally in Bulgarian. Trigger even for short requests like "say X in Bulgarian" or "is this correct Bulgarian?" or "fix my Bulgarian text." If Bulgarian text appears in the conversation and the user wants feedback or improvements, use this skill.
---

# Bulgarian Language Skill

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
