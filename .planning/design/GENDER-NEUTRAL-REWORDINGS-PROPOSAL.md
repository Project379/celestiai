---
title: Gender-neutral rewordings — proposal for founder approval
created: 2026-10-07
status: PROPOSAL ONLY. Nothing below is in the code. Every wording needs your explicit approval before it lands (skill rule 1). Rule being applied (approved 2026-10-07): no copy reveals the user's gender — reword first; a spelled-out pair («готов или готова») is the fallback only.
scope: every string found with a gendered form written as a pair or as a gender-marked participle/adjective, in the copy-lock (2,898 literals). Limit of the method: a bare gendered adjective that is not written as a pair (e.g. «уморен» used alone) would not have been caught by my search; I looked at all diary and moon-phase strings by eye for those and found none beyond the list below. The user's own first-person voice is allowed (your ruling), so rewordings stay in first person where the original was.
how-I-chose: present tense, aorist or a noun phrase (genderless) in place of the -л/-ла participle or the adjective; same meaning, same register (ти), same length where possible.
---

# 1. moon-detail journal prompts (moon-phase.ts) — the five prompts together

| # | Phase | Current | Proposed (genderless) | What changed |
|---|---|---|---|---|
| 1 | waxing gibbous (the moon-detail string; the founder's "approve A / B" item) | «Какъв прогрес съм направил/а и какво още трябва да се настрои?» | **A:** «Какъв е напредъкът ти дотук и какво още трябва да се настрои?» (second person; the wording you named)  **B:** «Какъв е напредъкът ми дотук и какво още трябва да се настрои?» (first person, your own voice) | participle → noun «напредък» |
| 2 | new moon | «Какви нови начала съм готов/а да приема?» | «Към какви нови начала се отварям?» | adjective «готов/а» → present reflexive «се отварям» (echoes the affirmation in #6) |
| 3 | last quarter | «Какво научих от този цикъл и какво съм готов/а да пусна?» | «Какво ми показа този цикъл и какво пускам?» | «научих» (aorist, fine) kept in spirit as «показа»; «готов/а да пусна» → present «пускам» |
| 4 | full moon | «Какво постигнах в този цикъл и за какво съм най-благодарен/на?» | «Какво постигнах в този цикъл и за какво благодаря най-много?» | adjective pair → verb «благодаря» («постигнах» is aorist, already genderless) |
| 5 | waning gibbous | «Какво съм готов/а да пусна и какви уроци съм научил/а?» | «Какво пускам и какви уроци нося със себе си?» | two gendered forms → two present-tense verbs |

Phases traced to `packages/core/src/lib/moon-phase.ts` (`journalPrompt` of each `PHASE_META` entry). The four siblings are new moon, last quarter, full moon and waning gibbous. The other three phases (waxing crescent, first quarter, waning crescent) have no gendered forms.

**Affirmation (new moon, same file):** «Отворен/а съм за нови начала.» → **«Отварям се за нови начала.»** (present reflexive, matches the other affirmations: «Доверявам се…», «Пускам с любов…»).

# 2. Diary prompts (core/src/diary/prompts.ts)

| Where | Current | Proposed | What changed |
|---|---|---|---|
| sentence stem (full moon) | «Благодарен/на съм за...» | **«Благодаря за...»** | adjective pair → present verb |
| sentence stem (waxing crescent) | «Канен/а съм да...» | **«Получавам покана да...»** | participle pair → present verb + noun |
| heading, half moon | «Половината път е зад теб. Запиши три опори — какво те държи изправен/а, когато светлина и сянка се делят поравно.» | «Половината път е зад теб. Запиши три опори — какво те крепи, когато светлина и сянка се делят поравно.» | «държи изправен/а» → «крепи» |
| heading, full moon | «Пълнолунието осветява всичко. Запиши три неща, за които си благодарен/на в този цикъл — постижения, срещи, уроци.» | «Пълнолунието осветява всичко. Запиши три неща, за които благодариш в този цикъл — постижения, срещи, уроци.» | «си благодарен/на» → «благодариш» |

# 3. Recommendation buttons (web/components/stories/RecommendationCard.tsx)

| Current | Proposed | Note |
|---|---|---|
| «Вече съм го гледал/а» | **«Вече го гледах»** | aorist 1sg is genderless; reads as "I already watched it" |
| «Вече съм я чел/а» | **«Вече я четох»** | same; the feature is currently disabled pending licensing (CLAUDE.md), so low priority |

# 4. Support page (web/app/support/page.tsx) — plain UI, speaks to the user

| Current | Proposed |
|---|---|
| «…според това откъде си се абонирал/а. Ако си сменил/а устройството и Премиум достъпът не се показва, влез със същия профил, с който е направен абонаментът. Ако пак не се появи, пиши ни.» | «…според това откъде е направен абонаментът. При ново устройство, ако Премиум достъпът не се показва, влез със същия профил, с който е направен абонаментът. Ако пак не се появи, пиши ни.» |
| «Провери дали имейл адресът и паролата са изписани правилно. Ако си забравил/а паролата, използвай „Забравена парола“ на екрана за вход. Ако пак нямаш достъп, пиши ни от имейл адреса, с който си се регистрирал/а, и ще помогнем.» | «Провери дали имейл адресът и паролата са изписани правилно. Ако паролата е забравена, използвай „Забравена парола“ на екрана за вход. Ако пак нямаш достъп, пиши ни от имейл адреса, с който е направена регистрацията, и ще помогнем.» |

(The first proposal repeats «е направен абонаментът» twice; if you dislike the repetition, «откъде е закупен абонаментът» for the first occurrence is the alternative.)

# 5. Fallback if you prefer to keep a pair anywhere

Spell it out, never compact: «готов или готова», «благодарен или благодарна», «изправен или изправена»; no «/а», «/на» (fleeting-vowel adjectives do not compact evenly).

# 6. What I need from you

Approve, edit or reject per row (or per section). When approved I change the strings, run `i18n:update-copy-lock` and show the copy-lock diff. Nothing has been changed yet.
