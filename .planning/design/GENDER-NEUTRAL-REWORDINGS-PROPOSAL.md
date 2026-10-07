---
title: Gender-neutral rewordings — proposal v2 for founder approval
created: 2026-10-07 (v1 rejected the same day for grammar and word problems; this is a redo under your four rules)
status: PROPOSAL ONLY. Nothing below is in the code. Every wording needs your explicit approval (skill rule 1); you add your own corrections on top. The four language rules are NOT yet in the Bulgarian skill — they go in once you approve.
scope-change: section 2 of v1 (`core/src/diary/prompts.ts`, Petko's diary) is EXCLUDED. See §0 for the check on the moon-phase prompts.
---

# 0. Scope check — are the moon-phase `journalPrompt` strings used by diary code?

**No, not by any diary code, here or in Petko's branch. They stay in scope.** What I checked:
- `journalPrompt` is read in exactly three places: `apps/mobile/app/(authed)/moon-detail.tsx` (shown under the phase), and the two `LunarPhaseCard.tsx` files (web and mobile; shown as «Въпрос за дневника»). It is display text, not diary input.
- The diary code (`packages/core/src/diary/*`, `components/manifest/*`, `hooks/useManifestEntries.ts`, `lib/validators/diary.ts`) imports only the `LunarPhaseId` *type* and `getLunarPhase` from `moon-phase.ts`; none reads `journalPrompt`. `diary/prompts.ts` even says in a comment it is "distinct from `phase.journalPrompt`".
- Petko's branch (`origin/implementation-of-tests-and-finalization`, last Petko commit 2026-09-10 "added tests") has the identical three read sites and nothing more. I cannot see a future branch, so "expected in Petko's branch" is the one thing I cannot rule out; if his diary starts reading `journalPrompt`, these rows would need his sign-off too.

# 1. The language rules, as I applied them

| Tag | Your rule |
|---|---|
| **R1** | The aorist (1st and 2nd person singular) has no gender — prefer it to passives («откъде се абонира», «с който се регистрира», «Вече я прочетох»). |
| **R2** | Completed actions take the perfective aspect — «прочетох», «изгледах», not «четох», «гледах». |
| **R3** | No bureaucratic passives in UI («паролата е забравена», «е направена регистрацията»). Address the user directly: «Ако не помниш паролата», «Ако си на ново устройство». |
| **R4** | No awkward bare present for intentions («какво пускам»). Use natural constructions: «какво е време да пусна», «за какво изпитвам най-голяма благодарност». |

Voice: the user's own first person is allowed (your ruling); the Oracle never says "we". All options below are genderless — no participle or adjective that depends on the speaker's or reader's gender.

# 2. moon-phase.ts journal prompts (`journalPrompt` of each `PHASE_META` entry)

| Phase | Current | Option A | Option B |
|---|---|---|---|
| waxing gibbous (the moon-detail string) | «Какъв прогрес съм направил/а и какво още трябва да се настрои?» | «Докъде стигнах и какво още трябва да се настрои?» — **R1** (aorist «стигнах»), **R2** | «Какво вече постигнах и какво още трябва да се настрои?» — **R1**, **R2** |
| new moon | «Какви нови начала съм готов/а да приема?» | «Какви нови начала е време да приема?» — **R4** | «Какви нови начала искам да приема?» — **R4** («искам да» is the natural way to state an intention) |
| last quarter | «Какво научих от този цикъл и какво съм готов/а да пусна?» | «Какво научих от този цикъл и какво е време да пусна?» — **R1** («научих» was already an aorist), **R4** | «Какво научих от този цикъл и от какво искам да се освободя?» — **R1**, **R4** |
| full moon | «Какво постигнах в този цикъл и за какво съм най-благодарен/на?» | «Какво постигнах в този цикъл и за какво изпитвам най-голяма благодарност?» — **R1**, **R4** (your phrase) | «Какво постигнах в този цикъл и какво най-много ме изпълва с благодарност?» — **R1**; the subject is «какво», so no gender is possible |
| waning gibbous | «Какво съм готов/а да пусна и какви уроци съм научил/а?» | «Какво е време да пусна и какви уроци научих?» — **R1**, **R2**, **R4** | «От какво искам да се освободя и какви уроци научих?» — **R1**, **R2**, **R4** |

The three phases without a gendered form (waxing crescent, first quarter, waning crescent) are untouched.

**Affirmation, new moon:** «Отворен/а съм за нови начала.»
- **A:** «Отварям се за нови начала.» — a present-tense statement of state, the same register as the other affirmations («Доверявам се на себе си…»). It is the one place I kept a bare present, because an affirmation states what is true now, not an intention (R4 does not apply to a statement of state — tell me if you disagree).
- **B:** «Посрещам новите начала с отворено сърце.» — present, with an image instead of a state.

# 3. Recommendation buttons (web/components/stories/RecommendationCard.tsx)
The feature is disabled pending licensing (CLAUDE.md), so these are low priority.

| Current | Option A | Option B |
|---|---|---|
| «Вече съм го гледал/а» | «Вече го изгледах» — **R1**, **R2** | «Познавам го вече» — present, no participle |
| «Вече съм я чел/а» | «Вече я прочетох» — **R1**, **R2** (your example) | «Познавам я вече» — present, no participle |

# 4. Support page (web/app/support/page.tsx) — plain UI, speaks to the user

**String 1.** Current: «Абонаментът се управлява през App Store, Google Play или уеб приложението — според това откъде си се абонирал/а. Ако си сменил/а устройството и Премиум достъпът не се показва, влез със същия профил, с който е направен абонаментът. Ако пак не се появи, пиши ни.»

| | Wording |
|---|---|
| **A** | «…според това откъде се абонира. Ако си на ново устройство и Премиум достъпът не се показва, влез със същия профил, с който е направен абонаментът. Ако пак не се появи, пиши ни.» — **R1** («се абонира»), **R3** («Ако си на ново устройство») |
| **B** | «…според това откъде направи абонамента. Ако влизаш от ново устройство и Премиум достъпът не се показва, влез със същия профил, с който го направи. Ако пак не се появи, пиши ни.» — **R1** (aorist «направи»), **R3** (direct address, no passive: the original's «е направен абонаментът» also goes) |

**String 2.** Current: «Провери дали имейл адресът и паролата са изписани правилно. Ако си забравил/а паролата, използвай „Забравена парола“ на екрана за вход. Ако пак нямаш достъп, пиши ни от имейл адреса, с който си се регистрирал/а, и ще помогнем.»

| | Wording |
|---|---|
| **A** | «Провери дали имейл адресът и паролата са изписани правилно. Ако не помниш паролата, използвай „Забравена парола“ на екрана за вход. Ако пак нямаш достъп, пиши ни от имейл адреса, с който се регистрира, и ще помогнем.» — **R3** («Ако не помниш паролата» is your example), **R1** («с който се регистрира») |
| **B** | «Провери дали въвеждаш правилно имейл адреса и паролата. Ако не можеш да се сетиш за паролата, използвай „Забравена парола“ на екрана за вход. Ако пак нямаш достъп, пиши ни от имейл адреса, с който създаде профила си, и ще помогнем.» — **R3** throughout (the passive «са изписани правилно» is removed too), **R1** («създаде») |

(Note: in both strings the clause «са изписани правилно» in the original is itself a mild passive; Option B removes it, Option A leaves it because it is not gendered and was not in your rule list — say which you want.)

# 5. Not touched here
- `core/src/diary/prompts.ts` (Petko's) — excluded by your ruling; it still contains the four gendered strings listed in `VOICE-COPY-AUDIT-2026-10-07.md` §2.B for whoever owns the diary.
- If you approve any wording, I change the string, run `i18n:update-copy-lock`, and show you the copy-lock diff. The four rules then go into the Bulgarian skill as project rules.
