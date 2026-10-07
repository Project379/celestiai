---
title: Voice rule audit — existing copy that breaks it, plus two proposals
created: 2026-10-07
status: LIST ONLY. No string below has been reworded. Every rewording needs the founder's approval first. The two proposals (§4 gender-neutral journal prompt, §5 Gemini validation check) are proposals; no prompt, validator or copy file was changed.
rule-tested-against: DESIGN-BRIEF.md §2.7 (the Oracle is the speaker; plain UI is neutral with no first person; the Oracle has no gender — present and future tense only, never first-person past participles).
method: "[verified] = machine-extracted from scripts/i18n/copy-lock.json (all 2,898 Cyrillic literals in the tree) with regexes for first-person forms, first-person past participles, compact gender pairs and the company “we”; then read by me. Regexes miss gendered adjectives that are not written as a pair (e.g. a bare «уморен»); that gap is stated, not closed. AI output (Gemini readings) is not in the copy-lock and was not audited — see §5."
---

# 1. Counts

| Category | What it is | Count | Breaks which rule |
|---|---|---|---|
| **A** | Company “we” in errors and plain UI («Не успяхме…», «Не получихме…», «Свържи се с нас») | **44 distinct strings, 68 code sites** | plain UI must have no first person |
| **B** | Compact gender pairs and first-person past participles | **15 strings** (list in §2.B) | no gender; no first-person past participle; skill rule "spell pairs out" |
| **C** | First-person strings in the *user's* voice (journal stems, affirmations, journal prompts, reaction buttons) | **~110 strings** (102 diary stems, 7 affirmations, 5 prompts, 6 buttons/labels) | not Oracle, not neutral — needs a ruling on who speaks |
| **D** | Oracle-side “we” (inclusive first person plural) in quips and reference text | **~10 strings** | the Oracle speaks as one voice; “we” is undecided |
| **E** | Mock-up (PLACEHOLDER_COPY) lines | 4 lines | see §2.E |
| — | **Oracle stage lines in the mock-ups** («Чета небето над теб…», «Свързвам местата, които се светват…», «Подреждам думите…») | 3 lines | **Compliant** — present tense, first person singular, no gender. Listed so you can see the rule passes them. |

Nothing found in the shipped composed Днес copy (`welcome/compose.ts`, `sign-quips.ts` except D, `sun-sign.ts`, `transit-analysis.ts`, `charts/interpretations.ts`): they speak to the user in second person and in present tense, with no past participle about the speaker.

# 2. The lists

## 2.A Company “we” in plain UI (neutral rule: no first person)

Same shape everywhere: **«Не успяхме да <verb> <object>.»** (the speaker is “we”, plural, in the past). 36 strings follow this shape; the others are variants. Files by surface:

- **Circle / Кръг** (mobile `circle.tsx`, `new-connection.tsx`, `SavedProfileForm.tsx`; web `CircleHub.tsx`, `ConnectInviteAcceptance.tsx`, `SavedProfileForm.tsx`, 9 API routes): анализираме профила · архивираме пространството · генерираме доклада · изтрием профила · отменим поканата · създадем поканата · запазим профила · добавим човека в групата · приемем поканата · свържем членовете · създадем пространството · заредим поканите / доклада / профилите / пространствата / «weather слоя».
- **Diary / Дневник** (`useManifestEntries.ts` ×2 platforms, 4 API routes): запазим страницата в дневника (ERR-DI-003) · заредим дневника (ERR-DI-002, -004) · изтрием страницата (ERR-DI-007) · заредим страницата (ERR-DI-005) · обновим страницата (ERR-DI-006).
- **Birth data** (`api/birth-data/*`): заредим / изтрием / обновим / запазим рождените данни; заредим списъка (ERR-BD-001…005).
- **Settings / account / push / subscription** (`settings.tsx`, `PushNotificationToggle.tsx`, `useAccountDeletion.ts`, `useSubscription.ts`): подготвим данните ти · включим / изключим известията · отменим изтриването · възстановим абонамента · отворим управлението на плащанията.
- **Auth** (`clerk/errorMessages.ts`): «Не получихме име от избрания начин за вход…».
- **Rate limit / quota** (`rate-limit.ts`, `quota.ts`): «Временно не успяваме да обработим заявката…», «Временно не успяваме да генерираме…».
- **Crystal** (`CrystalOfTheDayCard.tsx`): «В момента не можем да призовем камъка.» — this one is *Oracle-adjacent* (a ritual verb); you may want it on the Oracle side of the line.
- **Loading** (`chart.tsx`): «…изчисляваме картата» — a stage line in plural “we”. Pending first line «Изчисляваме картата ти.» (skill register) is the same shape.
- **Reference text** (`AstrologyGuideContent.tsx`, `GuideMethodSection.tsx`): «Изчисляваме позициите на 10-те планети…» — document voice, “we” = the app.
- **Support / landing** (`support/page.tsx`: «Свържи се с нас», «пиши ни…»; `LandingNav.tsx`: «За нас»): company-as-sender; arguably a legitimate “we” for contact. Flagged for a ruling, not assumed wrong.
- **Legal pages** (privacy, terms, cookies): company “we” throughout. Excluded from the counts; a legal text speaks as the company by nature. Needs your ruling that legal is exempt.

## 2.B Compact gender pairs and first-person past participles

| Where | String | Problem |
|---|---|---|
| `core/src/lib/moon-phase.ts` (journal prompts) | «Какъв прогрес съм направил/а и какво още трябва да се настрои?» | pair + 1sg participle. *This is the string you asked me to propose a rewording for — §4.* |
| same | «Какви нови начала съм готов/а да приема?» | pair |
| same | «Какво научих от този цикъл и какво съм готов/а да пусна?» | pair |
| same | «Какво постигнах в този цикъл и за какво съм най-благодарен/на?» | pair |
| same | «Какво съм готов/а да пусна и какви уроци съм научил/а?» | pair + participle |
| `core/src/diary/prompts.ts` | «Благодарен/на съм за...» | pair (fleeting-vowel form, skill rule 5) |
| same | «Канен/а съм да...» | pair |
| same | «Половината път е зад теб. Запиши три опори — какво те държи изправен/а, когато светлина и сянка се делят поравно.» | pair addressed to the user |
| same | «Пълнолунието осветява всичко. Запиши три неща, за които си благодарен/на в този цикъл — постижения, срещи, уроци.» | pair addressed to the user |
| `core/src/lib/moon-phase.ts` | «Отворен/а съм за нови начала.» | pair (user-voice affirmation) |
| `web/components/stories/RecommendationCard.tsx` | «Вече съм го гледал/а», «Вече съм я чел/а» | pair + participle (button label) |
| `web/app/support/page.tsx` | «…откъде си се абонирал/а. Ако си сменил/а устройството…», «Ако си забравил/а паролата…» | pairs addressed to the user (plain UI) |

Also in the mock-up `moon-detail-v1.html` (same prompt as row 1).

## 2.C First-person in the *user's* voice (a third speaker the rule does not cover)

These are not the Oracle talking and not neutral UI: they are sentence stems and statements written *as the user*. Present tense, so most are not gendered — but they are first person, and you ruled the Oracle is the speaker of "guidance". **Needs a ruling: is a journal prompt Oracle guidance (→ second person: «Какво научи…?») or the user's own voice?**

- **Diary stems** (`core/src/diary/prompts.ts`): 102 strings, 97 distinct — «Виждам…», «Връщам се към…», «Вярвам, че ще…», «Забелязвам…», «Започвам с…», «Засявам семе от…», «Избирам да…», «Искам да…», «Надявам се…», «Не отричам…», «Обещавам…», «Облягам се на…», «Освобождавам…», «Отварям врата за…», «Питам се защо…», «Подхранвам…», «Посрещам…» and so on. The approved `journal-v1` mock-up states these are first-person on purpose ("matching the affirmation/journalPrompt voice already established").
- **Affirmations** (`moon-phase.ts`, 7): «Вярвам в пътя си…», «Доверявам се на себе си…», «Освобождавам онова, което вече не ми служи…», «Постоянно се подобрявам…», «Празнувам прогреса си…», «Предавам се на потока на живота…», «Пускам с любов…». Affirmations are first person by nature.
- **Journal prompts** (5): the five listed in 2.B plus any first-person present ones.
- **Reaction / consent buttons**: «Хареса ми», «Не ми хареса» (`RecommendationCard`), «Да, разказвай ми» (`maybePromptPushPermission.ts`), «Не използвам достатъчно» (`premium.tsx`, `SettingsContent.tsx`), «Не получавам известия» (`support/page.tsx`), «Данните ми в Stellaeum» (`gdpr/export.ts`), «Присъедини се към моето пространство в Stellaeum: …» (`CircleHub.tsx` share text — written as the user).

## 2.D Oracle-side “we” (inclusive first person plural)

- `sign-quips.ts`: «Слънцето не е само за показ - но трябва да признаем, малко драма никога не е навредила.» · «Плутон вижда всичко. Ти виждаш всичко. Фактически няма смисъл да крием нищо от никого.»
- `AstrologyReference.tsx` (mobile + web, ~6 strings): «Нашият Аз и нови начала. Свобода да изразим себе си. Опознаваме и развиваме себе си…», «Сила да отстоим желаното…», «Външни предизвикателства ни карат да пре…»
- `GuideAspectsSection.tsx` / `AstrologyGuideContent.tsx`: «…именно те ни тласкат напред и ни изграждат.»

Decision needed: does the Oracle ever say “we” (inclusive, "we humans")? If not, these need rewording.

## 2.E Mock-ups (PLACEHOLDER_COPY, not shipped)

- `birth-data-edit-v1`: **«Запазвам…»** (the Save button's busy state — plain UI, first person) and **«Не успяхме да запазим. Опитай отново.»** (we-voice error).
- `chart-reveal-flow-v1`: **«Не успяхме да подготвим картата.»** (we-voice) and the pending new-user line «Данните са запазени. Картата ти е създадена.» (impersonal — compliant).
- `moon-detail-v1`: the 2.B prompt.

## 2.F Not voice, but found while auditing

- Straight closing quote after „…: **fixed for „млада луна“** (2026-10-07: 4 code sites + the mock-up). The same defect remains at 18 other sites (e.g. „близнаци", „Чайникът", „моментна снимка", „R", „камъкът на търговеца", „морска вода", the affirmation wrappers in both `LunarPhaseCard` files, `ManifestHistory`, `stars` descriptions) — listed, not fixed, because the ruling named only „млада луна“.
- Diary-term casing outside the ruling: `ManifestDiaryContent.tsx:109` shows «лунен дневник» as a standalone label (mobile) and the web heading is «Лунен дневник»; the ruling covers sentence start and mid-sentence only, so standalone labels are unruled.
- `you.tsx` / `YouHub.tsx` hint «лунен дневник — по три реда» starts lower-case; by your casing rule a sentence-start is capitalised. It sits as a hint under the label «Дневник», so I left it and list it.

# 3. What I did NOT find

No Oracle line in shipped code uses a first-person past participle. The past-participle problem is confined to user-voice prompts (2.B/2.C). The shipped Oracle voice (composed Днес text, interpretations) is already second person, present tense.

# 4. Proposal — gender-neutral wording for the moon-detail journal prompt (for your approval; not shipped)

Current: «Какъв прогрес съм направил/а и какво още трябва да се настрои?» (waxing gibbous).

Two defects: it has a gender pair, and it is the user speaking about themselves. Three options, all with no gender, all present tense or noun phrases, addressed to the user (so they also fit the "Oracle speaks guidance" ruling):

| | Wording | Notes |
|---|---|---|
| **1 (my pick)** | **«Какъв е напредъкът ти дотук и какво още трябва да се настрои?»** | Closest to the original meaning; a noun (напредък) replaces the participle; ти-register; "настрои" keeps the original's second clause. |
| 2 | «Докъде са стигнали нещата и какво още трябва да се настрои?» | The participle agrees with "нещата" (things), not with a person; loses the personal "ти". |
| 3 | «Какво вече е подредено и какво още трябва да се настрои?» | Impersonal passive participle on a thing (подредено), not on the speaker. |
| 4 (first-person, genderless) | a present-tense stem in the style of the diary stems, e.g. «Напредвам към…» / «Настройвам още…» | Only if you rule that journal prompts speak as the user (§2.C); then the moon-detail prompt becomes such a stem. Included so you can choose a wording without first answering who speaks. |

The other four journal prompts (2.B) have the same problem; if you pick a pattern for option 1, I can propose the matching four. I have not proposed them.

# 5. Proposal — validating Oracle gender and tense in Gemini output (REPORT ONLY; no prompt or validator changed)

**What exists:** `apps/web/lib/ai/validate-reading.ts` checks sentinel balance, no model-written digits, token resolution, script purity, and word count. `apps/web/lib/horoscope/prompts.ts` and `lib/oracle/prompts.ts` set the register ("ти" form) but say nothing about the speaker's own gender or tense.

**Naming:** the prompts currently name the speaker "Stellaeum" (`You are Stellaeum, a mystical guide…`), not the Oracle; the voice rule would rename it in the prompt.

**Proposed prompt rule (one line in each prompt's VOICE block):**
> "You speak as the Oracle, which has no gender. Use present and future tense only. Never refer to yourself with a past participle (never forms like подредил / подредила / видял / видяла). If something already happened, say it impersonally or about the sky («небето се промени»). Do not use a form that would reveal the reader's gender either."

**Proposed validator check:** a new failure code `GENDERED_SELF_REFERENCE`, run after script purity, using the existing "regenerate once, then user-visible error" path.

Detection (regex on the substituted plain text):

1. First/second person perfect with a participle: `(?<![а-яА-Я])(съм|бях|си)\s+[а-яА-Я]+(ъл|ил|ял|ал|ел)(а)?(?![а-яА-Я])`.
2. Compact pairs: `[а-яА-Я]+(ъл|ил|ял|ен|ан)/(а|на|ла)(?![а-яА-Я])`.

(**JS note:** `\b` is ASCII-only even with the `u` flag, so it never matches next to Cyrillic; the patterns above use Unicode-aware lookarounds instead. They are untested against real output.)
3. A short stop-list of gender-marked adjectives after «си» / «бъди» (готов, уморен, благодарен, сам…), maintained like the existing allow-lists.

**Known weaknesses (honest):** (1) «си» is also the reflexive dative («взе си») and a verb-ending collision (профила си) — pattern 1 requires a participle directly after «си», so the common reflexive cases do not match, but I have not run it against real model output; it needs a corpus run before it is made blocking. (2) It cannot catch an adjective that carries gender without a «си/съм» (e.g. «Бъди внимателен»). (3) Regenerating costs a Gemini call (see GEMINI-SLOW-NO-FAILOVER); a rejection rate above a few percent would need the prompt fixed instead of retrying. **Suggested rollout:** log-only first (no reject), measure the hit rate on a day of cron horoscopes, then decide.

**Static twin (for content files, no AI):** the same patterns 1–2 as a `check:bg-voice` gate over content-home files, with a ratchet baseline like `check:bg-lint-baseline` (the baseline today would be the 15 strings in §2.B). Proposal only.
