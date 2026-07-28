# Bulgarian Composed-String Audit (procedurally-assembled sentences)

Scope: every template/function found in `apps/web`, `apps/mobile`, `packages/core`,
`packages/astrology` that assembles Bulgarian prose by slotting a computed value
(sign, planet, aspect, house, day-count, percentage, streak, shower name, etc.)
into a sentence fragment. Static strings are out of scope (handled elsewhere).

No fixes proposed. Grammar-rule reference used throughout:

- **Numeric agreement**: Bulgarian only distinguishes singular (count == 1) vs.
  plural (everything else, including 0). There is **no** Russian-style "ends in
  1/2-4/5-0" declension quirk — "21 дни", "31 дни" etc. are plural exactly like
  "5 дни". Any code that special-cases anything beyond `n === 1` is over-engineering
  for BG (though harmless if it happens to still resolve to the plural bucket).
- **Grammatical gender of the lookup values** (needed for any agreeing
  adjective/participle in a template):
  - Zodiac signs: masculine — Овен, Телец, Рак, Лъв, Скорпион, Стрелец, Козирог,
    Водолей; feminine — Дева; **grammatically plural nouns** (no single gender) —
    Близнаци, Везни, Риби.
  - Planets: neuter — Слънце; feminine — Луна, Венера; masculine — Меркурий, Марс,
    Юпитер, Сатурн, Уран, Нептун, Плутон, Северен възел (носеща дума "възел" е м.р.).
  - Aspects: neuter — Съединение; feminine — Опозиция; masculine — Секстил, Квадрат,
    Тригон.

---

## packages/core/src/welcome/compose.ts

### `meteorNote(shower)` — line 150-153
```
`Сега през небето минава потокът на ${shower.name}. Погледни нагоре след полунощ.`
```
Slot values (from `packages/core/src/welcome/meteor-showers.ts` `METEOR_SHOWERS[].name`):
Квадрантиди, Лириди, Ета Аквариди, Делта Аквариди, Персеиди, Ориониди, Леониди, Геминиди, Урсиди.

Assembled examples:
- "Сега през небето минава потокът на Персеиди. Погледни нагоре след полунощ."
- "Сега през небето минава потокът на Ета Аквариди. Погледни нагоре след полунощ."
- "Сега през небето минава потокът на Урсиди. Погледни нагоре след полунощ."

**Risk — definite article**: all shower names are plural proper nouns used
generically ("Persseids" as a class). In a possessive/genitive construction
("потокът **на** Х") a definite specific referent normally takes the
definite article in Bulgarian: "потокът на Персеидите" reads more natural/correct
than "потокът на Персеиди" (compare "столицата на Франция" — no article, since
Франция is a proper name without a plural form; but "Персеиди" is a common-noun-like
plural label, closer to "потокът на завистниците" which does take the article).
Native-speaker judgment call, but flag for review — it reads slightly foreign
without the article on 7 of 9 shower names (all except none, since all 9 are
plural forms).

### `signTail` / `PHASE_OPENERS` / `ELEMENT_PHASE_TAIL` — lines 59-141
Not string-composed sentences in the audited sense — `sunSign` and `phaseId` are
used only as **lookup keys** (`SIGN_ELEMENT[sunSign]`, `ELEMENT_PHASE_TAIL[el][phaseId]`);
the returned sentence is a fixed string, no interpolation of the sign/phase name
itself into prose. No agreement risk. `waxing_gibbous`/`waning_gibbous` interpolate
`illum` (0-100) into `` `Растяща луна, ${illum}% осветена...` `` /
`` `Намаляваща луна, ${illum}% осветена...` `` — correctly agrees (`осветена` is
feminine, matching the fixed noun "луна", not the variable), and percentages don't
need Bulgarian count-agreement. **No bug** — included for contrast.

### `composeWelcome` — line 155-171
```
const greeting = `${timeGreeting(tod)}, ${ctx.firstName}.`
```
`timeGreeting` returns one of: Добро утро / Добър ден / Добър вечер / Благословена нощ
(all fixed, verified against native usage — "Добър вечер" is the standard frozen
greeting idiom in Bulgarian despite "вечер" being feminine elsewhere; not a bug,
no note needed). `firstName` is a free-form user name inserted in nominative
(not vocative) case — informal but broadly accepted register for app UI copy,
not a grammar defect.

---

## packages/core/src/horoscope/transit-analysis.ts

### `bgPrep(prep, nextWord)` — line 543-546
Preposition-elision helper (в→във, с→със before в/ф and с/з). Applied correctly
throughout this file (`bgPrep('с', theme)`, `bgPrep('в', sign)`).

### `enrichActiveTransit` — lines 600-617 — **HIGHEST SEVERITY FINDING**
```
detail: `${transit} прави ${aspect.toLowerCase()} с вашия натален ${natal.toLowerCase()}, което ${aspectMeaning(
  item.aspect
)}. Това насочва вниманието към ${theme}. ${applyingText} ${speedMeaning(item.speedBand)}`,
```
`transit`/`natal` = `formatPlanet(...)` → any of the 11 `PLANETS_BG` values;
`aspect` = `formatAspect(...)` → any of the 5 `ASPECTS_BG` values, lower-cased.

The adjective **"натален"** (masculine singular) is hard-coded and does **not**
agree with the natal planet's gender. Examples (transit=Марс fixed for brevity,
aspect=опозиция):
- natal=Слънце (neuter) → "Марс прави опозиция с вашия натален слънце..." — should be
  "вашето натално Слънце".
- natal=Луна (feminine) → "Марс прави опозиция с вашия натален луна..." — should be
  "вашата натална луна".
- natal=Венера (feminine) → "...с вашия натален венера..." — should be "вашата
  натална венера".
- natal=Меркурий/Сатурн/Уран/etc. (masculine) → "...с вашия натален меркурий..." —
  this is the only gender for which the fixed phrasing is correct.

This bug is present for **2 of 11 planets by simple count but is hit on every
transit involving Луна or Венера as the natal point** — a very common case (Moon
and Venus are both fast, frequently-aspected natal points), and 1 of 11
(Слънце) triggers a neuter mismatch too. Net: wrong for natal ∈ {Слънце, Луна,
Венера} = 3 of 11 planets, i.e. roughly 27% of natal-planet slots produce a
gender-mismatched noun phrase, every time, in both `enrichActiveTransit` and
`enrichUpcomingTransit`.

### `enrichUpcomingTransit` — lines 619-635 — same bug, plus a second one
```
detail: `${transit} се движи към точен ${aspect.toLowerCase()} с вашия натален ${natal.toLowerCase()}. Това подсказва, че през следващите ${
  item.hoursUntil
} часа ще се изостри тема, свързана ${bgPrep('с', theme)} ${theme}. ${aspectMeaning(item.aspect)} ${speedMeaning(
  item.speedBand
)}`,
```
Second adjective bug: **"точен"** (masculine) modifying the lower-cased aspect
name, not agreeing with aspect gender:
- aspect=съединение (neuter) → "...се движи към точен съединение..." — should be
  "точно съединение".
- aspect=опозиция (feminine) → "...се движи към точен опозиция..." — should be
  "точна опозиция".
- aspect=секстил/квадрат/тригон (masculine) → "точен секстил" — correct.

Plus the same "натален" bug as above, so a worst case like transit=Юпитер,
natal=Венера, aspect=опозиция produces:
"Юпитер се движи към точен опозиция с вашия натален венера. Това подсказва, че
през следващите 11 часа ще се изостри тема, свързана с ценностите, парите и
чувството ви за стабилност. [aspectMeaning] [speedMeaning]" — **two separate
gender-agreement violations in a single sentence.**

`item.hoursUntil` (interpolated hour count, e.g. 0, 1, 2, 5, 11, 21, 100+) is
followed by the fixed word "часа" — correct for count ≠ 1, but count === 1 or
0 breaks **two** words, not just one: "през следващите 1 часа" is wrong on
both "следващите" (plural definite adjective — should be singular "следващия"
for count 1) and "часа" (should be singular "час"). Correct singular
rendering would be "през следващия 1 час". Need to check whether
`hoursUntil` can legitimately be 0 or 1 — yes, it's `Math.round(...)` of a
real-valued hour delta and the upstream sampler runs on a 6-hour grid, so
both 0 and 1 are reachable values (rounding artifacts near the sample
boundary). **No singular branch exists for either word.**

### `enrichLunarEvent` — lines 637-661
```
title: `${phase} ${bgPrep('в', sign)} ${sign}`,
summary: `${phase} осветява ${theme}.`,
detail: `${phase} ${bgPrep('в', sign)} ${sign} активира ${theme}. ${
  item.type === 'new_moon' ? '...' : '...'
}${aspectsText}`,
```
`phase` ∈ {Новолуние, Пълнолуние} (both neuter nouns — matches the neuter verb
forms used, "осветява"/"активира" are present tense so no participle agreement
needed — no risk here). `sign` = any of 12 `ZODIAC_SIGNS_BG` values, correctly
preceded by `bgPrep('в', sign)` which already special-cases в→във before
в-/ф-initial words — verified against the 12 real sign strings: **two** signs
are в-initial and correctly resolve to "във" — Водолей → "във Водолей", Везни →
"във Везни"; the remaining 10 (Овен, Телец, Близнаци, Рак, Лъв, Дева, Скорпион,
Стрелец, Козирог, Риби) → plain "в". No bug found here.

`aspectsText` (lines 641-650, duplicated at 703-713 in `transitOverviewToPromptText`):
```
` Събитието докосва и ${item.aspects.slice(0, 2).map((aspect) =>
  `${formatPlanet(aspect.natalPlanet)} чрез ${formatAspect(aspect.aspect).toLowerCase()}`
).join(' и ')}.`
```
No agreement issue (no adjective), but note the `.join(' и ')` with only
`slice(0, 2)` means exactly 2 items are always joined with "и" when present —
if a 3rd aspect existed it would be silently dropped rather than "X, Y и Z" —
not a grammar bug, a silent-truncation note.

### `transitOverviewToPromptText` — lines 664-740 (AI-prompt text, not directly
user-facing, but feeds the LLM that produces user-facing Bulgarian, so template
quality still matters)
```
`Транзитен ${formatPlanet(...)} ${formatAspect(...)} натален ${formatPlanet(...)} в дом ${aspect.house} (орб ${aspect.orb.toFixed(1)}°, ${aspect.applying ? 'прилагащ' : 'раздалечаващ'}, ${aspect.speedBand === 'fast' ? 'бърз ритъм' : 'бавен ритъм'})`
```
Same **"Транзитен"/"натален" masculine-only** pattern as above, uncapitalized
this time as a label prefix rather than mid-sentence — e.g. "Транзитен Луна
[аспект] натален Венера в дом 7..." is doubly wrong (both the transiting and
natal planet nouns mismatch gender against their fixed masculine modifiers,
whenever transit/natal is Слънце/Луна/Венера). Same root cause as
`enrichActiveTransit`, different call site. House number `${aspect.house}`
(1-12) has no agreement issue (dом + number, no adjective).

```
`${formatPlanet(item.transitPlanet)} ${formatAspect(item.aspect)} ${formatPlanet(item.natalPlanet)} - пик около ${item.exactAt} в дом ${item.house} (след ~${item.hoursUntil} ч.)`
```
No adjective agreement issue (uses abbreviation "ч." not the full "часа" word,
sidesteps the singular/plural problem entirely — inconsistent with the
mobile-facing hoursUntil rendering elsewhere, which spells it out; not a
grammar bug but a register/consistency note).

```
`ТЕМПО НА ПЕРИОДА: ${overview.pacing.emphasis === 'fast' ? 'доминират бързите транзити' : ... }`
```
Fixed-string ternary chain, no interpolated noun, no risk.

---

## packages/core/src/charts/interpretations.ts

### `formatPosition` — lines 132-148
```
position = `${degrees}°${minutes...}' ${signName}`
if (house !== undefined) position += `, Дом ${house}`
```
No agreement issue (degree/minutes numeric formatting, "Дом N" needs no
adjective).

### `getAspectInsights` — lines 150-165
```
return `${ASPECT_LABEL[aspect.aspect]} ${bgPrep('с', otherPlanet)} ${otherPlanet}. Тук това положение ${ASPECT_TONE[aspect.aspect]}${toneSuffix} ${otherPlanet.toLowerCase()}, с орбис ${aspect.orb.toFixed(1)}°. ${applyingText}`
```
`ASPECT_LABEL` (title-case) × `otherPlanet` (any of 11 `PLANETS_BG`) × `ASPECT_TONE`
(verb phrases with no gender-agreeing adjective attached to the planet — "се
слива директно", "получава подкрепа и възможност чрез", "среща напрежение и
натиск за развитие чрез", "тече естествено заедно", "влиза в полярност и
осъзнаване чрез" — verified none of these five carry a gender-marked
word referring to `otherPlanet`). **No gender bug** — this function is a
counter-example to the transit-analysis.ts bug: it avoids the problem entirely
by not attaching an adjective to the planet noun.

Example assembled outputs (aspect=Тригон, otherPlanet=Луна, applying=true, orb=2.3):
"Тригон с Луна. Тук това положение тече естествено заедно с луна, с орбис 2.3°.
Този аспект е по-активен и се усилва." — grammatically clean.

Example (aspect=Опозиция, otherPlanet=Слънце, applying=false, orb=5.8):
"Опозиция със Слънце. Тук това положение влиза в полярност и осъзнаване чрез
слънце, с орбис 5.8°. Този аспект е по-устойчив и вече добре познат във
вътрешния ви модел." — `bgPrep('с', 'Слънце')` correctly resolves to "със"
(с-initial word) — verified correct.

### `getPlanetInterpretation` — lines 167-193
```
const title = `${planetName} ${bgPrep('в', signName)} ${signName}`
const overview = `${PLANET_OVERVIEW[planetKey]} ${SIGN_INFLECTION[signKey]} ${houseLine}`
growth: `Зрелият израз на ${planetName.toLowerCase()} ${bgPrep('в', signName)} ${signName} идва, когато...`
```
`bgPrep('в', signName)` against the 12 real sign strings: Водолей and Везни
are both в-initial → "във Водолей", "във Везни"; the other 10 → plain "в
[sign]". Example titles across all 12 signs with planet=Меркурий:
"Меркурий в Овен", "Меркурий в Телец", "Меркурий в Близнаци", "Меркурий в Рак",
"Меркурий в Лъв", "Меркурий в Дева", "Меркурий във Везни", "Меркурий в Скорпион",
"Меркурий в Стрелец", "Меркурий в Козирог", "Меркурий във Водолей", "Меркурий в
Риби" — all correct. No adjective agreement risk since "Зрелият израз на X"
puts X in the genitive-like "на"-phrase (no inflection needed on X itself in
Bulgarian, unlike Russian genitive case) and the fixed adjective "Зрелият"
agrees with "изразът" (masculine), not the planet. **No bug.**

### `getRisingInterpretation` — lines 195-217
```
overview: `Асцендентът описва... ${SIGN_INFLECTION[signKey]} Често това е първият слой... ${isApproximate ? ' Понеже часът на раждане не е точен, приемайте тази насока като ориентир, а не като абсолютна сигурност.' : ''}`
```
No interpolated noun with agreement risk — `SIGN_INFLECTION[signKey]` is a
complete fixed sentence per sign, not a slot inside a larger agreeing frame.

---

## packages/core/src/lib/moon-phase.ts

All fields (`name`, `physicalAppearance`, `bestFor`, `affirmation`, `crystal`,
`ritual`, `journalPrompt`) in `PHASE_META` are fixed strings selected by lookup
key (`phaseId`), not assembled via interpolation of a variable name into prose.
The one numeric composition is:
```
nextMajor: { id: next.id, name: nextMeta.name, daysAway: Math.round(daysAway * 10) / 10 }
```
`daysAway` is a rounded-to-0.1 float (e.g. 0.0, 1.0, 2.2, 5.7, 11.3, 21.0) that
is **not itself formatted into a sentence** in this file — it's raw data
returned to callers, who (per `apps/mobile/lib/formatDaysHours.ts`, see below)
are expected to run it through a proper pluralizer. **No bug in this file**,
but it's the data source that feeds `formatDaysHours` — flag as the coupling
point: if any caller prints `daysAway` directly (e.g. `${daysAway} дни`) instead
of routing through `formatDaysHours`, it would produce "1.0 дни" for the
tomorrow case instead of "1 ден". Worth an inventory-wide grep for direct
`daysAway` interpolation outside `formatDaysHours` call sites (not performed in
this pass — flagging as a follow-up check).

---

## packages/core/src/diary/prompts.ts

`MANIFEST_PROMPTS` — every `heading`, `lead`, `fieldLabels`, `placeholders`
entry is a fully static string selected by `(phaseId, variantIndex)` lookup via
`getManifestPrompt`. No interpolation of a computed value into prose anywhere
in this file — the "three-variant rotation" is a **selection** among static
strings, not a composition. **No composed strings to audit here** despite the
task brief listing it as a suspect file.

---

## packages/core/src/diary/export.ts

### `formatBgLongDate` — lines 42-45
```
const raw = BG_DATE_LONG.format(date) // Intl 'bg-BG', day/month:long/year
return raw.endsWith('г.') ? raw : `${raw} г.`
```
Relies on ICU `Intl.DateTimeFormat('bg-BG', ...)` for the actual date-to-prose
composition (month names, case) rather than a hand-rolled template — output is
whatever the runtime's bg-BG locale data produces (typically "22 април 2026
г."). Not independently auditable as a hand-written template; flag only that
correctness depends entirely on the runtime's ICU data, which is outside this
codebase's control. No hand-written slot-filling bug possible here since there's
no manual sign/planet/day-count substitution.

### `buildDiaryMarkdown` — lines 47-72
```
const title = '# Лунен дневник'
const exportLine = `Изтеглен на ${formatBgLongDate(exportedAt)}`
...
`## ${dateStr} ${MIDDLE_DOT} ${entry.phaseName}`
```
`entry.phaseName` — presumably one of the 8 `PHASE_META[...].name` values
(Новолуние, Изгряващ полумесец, Първа четвърт, Растяща луна, Пълнолуние,
Намаляваща луна, Последна четвърт, Залязващ полумесец) — inserted as a heading
suffix, no agreement needed (no adjective attached). No bug.

### `buildDiaryFilename` — lines 79-84
```
return `stellaeum-дневник-${y}-${m}-${d}.md`
```
Filename, not prose — no grammar risk (mixed Latin/Cyrillic filename is a
platform-compatibility question, not a grammar one — out of scope).

---

## apps/web/lib/horoscope/transit-to-prompt.ts (mirrors packages/core's transit-analysis text builder, AI-prompt-facing)

### `formatTransitPlanetLine` / `formatNatalPlanetLine` — lines 17-33
```
return `${planetName}: ${degrees}°${minutes...}' ${signName}${retrograde} (транзит)`
return `${planetName}: ${degrees}°${minutes...}' ${signName}, дом ${planet.house}${retrograde}`
```
`retrograde` = `planet.speed < 0 ? ' (ретроградна)' : ''` — **gender bug**:
"ретроградна" is the feminine form of the adjective (agreeing with an implicit
"планета/planet" noun which is feminine in Bulgarian), always emitted
regardless of which planet it modifies. Since the surrounding sentence never
prints the word "планета" itself, this only reads oddly if a reader parses it
as agreeing with the just-printed planet name — for planets whose BG name is
masculine (Меркурий, Марс, Юпитер, Сатурн, Уран, Нептун, Плутон — 7 of 11) or
neuter (Слънце) the adjective form is mismatched if attached to the planet noun
grammatically, though it can be defended as an elliptical "(ретроградна
[планета])" aside. Lower severity than the transit-analysis.ts "натален" bug
since it's parenthetical rather than inline in a clause, but same root pattern
(hard-coded feminine/masculine adjective ignoring the referent's actual
gender). Example: "Меркурий: 15°30' Дева (ретроградна) (транзит)" reads as
"Mercury ... (retrograde-fem)" — jarring to a native ear if parsed as modifying
Меркурий directly.

### `formatTransitAspectLine` — lines 35-43
```
return `Транзитен ${transitPlanetName} ${aspectName} натален ${natalPlanetName} (орб ${orb}°, ${status})`
```
Identical "Транзитен .../натален ..." masculine-only bug as
`transitOverviewToPromptText` in packages/core — same root cause, duplicated
across the web mirror. `status` = 'прилагащ'/'раздалечаващ' (masculine
participle, standalone label — lower risk, matches "аспект" which is masculine
in isolation).

### `transitAndNatalToPromptText` — lines 45-86
Structural lines only ("ТРАНЗИТНИ ПЛАНЕТИ (днес):", "(Часът на раждане е
неизвестен - домовете са приблизителни)", "(Няма точни транзитни аспекти за
днес)") — all fixed strings, no interpolation.

---

## apps/web/lib/oracle/chart-to-prompt.ts

### `formatPlanetLine` — lines 31-38 / `formatAspectLine` — lines 44-51
Same shape as transit-to-prompt.ts: `${retrograde}` = ' (ретроградна)' fixed
feminine adjective regardless of planet gender (same bug, third occurrence of
this exact pattern in the codebase). `formatAspectLine`'s
`applying = aspect.applying ? ', прилагащ' : ', раздалечаващ'` — masculine
participle standalone, low risk (as above).

### `chartToPromptText` — lines 59-96
```
lines.push(`Асцендент: ${ascDeg}°${ascMin...}' ${ascSign}`)
lines.push(`Медиум Цели (MC): ${mcDeg}°${mcMin...}' ${mcSign}`)
```
No adjective agreement risk (degree + sign name only). Note: "Медиум Цели" is
an unusual/incorrect Bulgarian rendering of "Medium Coeli" — normally rendered
"Средата на небето" or left as "MC" — this reads as a mistranslation/calque
rather than a composition-grammar bug per se (static-string-adjacent issue,
flagged because it sits inside an otherwise-composed line).

---

## apps/mobile/lib/formatDaysHours.ts — well-handled reference case

```
export function formatDaysHours(daysFrac: number): string {
  const totalHours = Math.max(0, Math.round(daysFrac * 24))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const dayStr = days === 0 ? '' : days === 1 ? '1 ден' : `${days} дни`
  const hourStr = hours === 0 ? '' : hours === 1 ? '1 час' : `${hours} часа`
  if (dayStr && hourStr) return `${dayStr} и ${hourStr}`
  if (dayStr) return dayStr
  if (hourStr) return hourStr
  return 'по-малко от час'
}
```
Correctly implements Bulgarian singular/plural (count===1 vs. not, no
Russian-style tens quirk needed and none applied). Verified outputs for
representative inputs (`daysFrac` in days):
- 0 → totalHours=0 → "по-малко от час"
- 0.04 (~1h) → totalHours=1 → days=0, hours=1 → "1 час"
- 1/24*2 → hours=2 → "2 часа"
- 1.0 → totalHours=24 → days=1, hours=0 → "1 ден"
- 2.0 → days=2 → "2 дни"
- 5.0 → days=5 → "5 дни"
- 11.0 → days=11 → "11 дни" — confirms no false "11 ден" tens-quirk
- 21.0 → days=21 → "21 дни" — confirms no false 21→singular Russian-style quirk
- 100.0 → days=100 → "100 дни"
- 1.5 → totalHours=36 → days=1, hours=12 → "1 ден и 12 часа"
- 2.5 → totalHours=60 → days=2, hours=12 → "2 дни и 12 часа"

No bug found. Included as the model other call sites should match.

---

## apps/mobile/components/crystals/DailyStreakPanel.tsx

### streak-count line — lines 94-101
```
<Text>{streak.current}</Text>
<Text>{streak.current === 1 ? 'ден' : 'поредни дни'}</Text>
```
Correct singular/plural split (count===1 → "1 ден"; count=0,2,3,...→"N поредни
дни", e.g. "0 поредни дни", "2 поредни дни", "5 поредни дни", "21 поредни дни",
"100 поредни дни" — all correctly plural, no tens-quirk applied). Minor
asymmetry (not a grammar bug): singular drops the "поредни" (consecutive)
qualifier that plural carries — reasonably justified since "consecutive" is
vacuous for a 1-day streak, but worth the founder's eyes since it changes
sentence shape between the two branches rather than only the noun's number.

### `StatPill` values ("Най-дълга", "Общо дни") — lines 105-106, 174-183
`value={streak.longest}` / `value={streak.totalDays}` rendered as bare numbers
under fixed labels ("Най-дълга" [longest], "Общо дни" [total days]) — no
inline pluralization attempted at all (the label doesn't change with the
number), so there's no agreement bug, but also no "1 ден" vs "N дни" handling
if a designer later wanted the label itself to flex — currently safe because
label is static and number is separate.

### `accessibilityLabel` — line 120
```
`${formatShort(cell.date)}${cell.hit ? ` — ${cell.hit.name_bg ?? cell.hit.name_en ?? ''}` : ' — пропуснат'}`
```
`cell.hit.name_bg` is a crystal name (external data, e.g. "Аметист", "Розов
кварц", "Лабрадорит" — not enumerated here since crystal names come from a DB
table, not a static map) appended after an em-dash — no grammatical agreement
attempted or needed (appositive, not a clause). "пропуснат" (masculine past
participle, "missed") stands alone with no noun to agree with in context — low
risk, reads as an elliptical "[ден] пропуснат" (masculine "ден" — correct
if so parsed).

### `Последни 30 дни · отляво надясно` — line 134
Fixed string with hard-coded "30" — not a composed/interpolated value
(`DOTS_TO_SHOW` constant is not printed via a slot here, the "30" is
literally typed into the JSX string) — technically static, not a composed
string; flagging only because it will silently go stale if `DOTS_TO_SHOW`
is ever changed without updating this string by hand — a maintenance risk,
not a grammar risk.

---

## apps/mobile/components/horoscope/TransitOverviewCard.tsx

### `formatActiveTransit` / `formatUpcoming` — lines 53-59
```
return `${PLANETS_BG[item.transitPlanet as Planet]} ${ASPECTS_BG[item.aspect]} ${PLANETS_BG[item.natalPlanet as Planet]}`
```
No adjective — just three nouns in sequence ("Марс Опозиция Слънце") — no
gender-agreement risk (this is the exact pattern that avoids the
transit-analysis.ts bug, by never attaching a modifying adjective).

### `formatLunarEvent` — lines 61-68
```
const base = `${item.type === 'new_moon' ? 'Новолуние' : 'Пълнолуние'} ${bgPrep('в', signName)} ${signName}`
if (item.aspects.length === 0) return base
return `${base} · ${item.aspects.slice(0, 2).map((aspect) => `${ASPECTS_BG[aspect.aspect]} ${PLANETS_BG[aspect.natalPlanet]}`).join(', ')}`
```
`bgPrep` verified correct against all 12 signs (as above). No agreement risk
(noun-noun sequences only).

### meta line — line 383
```
meta={`${formatDateTime(item.exactAt)} · дом ${item.house} · след около ${item.hoursUntil} ч.`}
```
Uses abbreviated "ч." — sidesteps singular/plural entirely (consistent within
this file, inconsistent with `formatDaysHours`'s spelled-out register
elsewhere in the app — a register-consistency note, not a grammar bug).

### meta line — line 409
```
meta={`${formatDateTime(item.exactAt)} · дом ${item.house}${!overview.birthTimeKnown ? ' · домът е приблизителен' : ''}`}
```
No agreement risk ("домът" fixed masculine noun + fixed masculine adjective
"приблизителен" — genuinely agree, since "дом" (house) is masculine — correct
as written).

---

## apps/mobile/components/chart/AspectsList.tsx & apps/web/components/chart/AspectsList.tsx (identical composition logic, ported 1:1)

### `AspectRow` — mobile lines 161-202 / web lines 137-177
```
{p1Bg} {typeBg} {p2Bg}
```
e.g. "Нептун тригон Плутон", "Луна опозиция Венера", "Слънце съединение Марс" —
noun-noun-noun sequence via `ASPECT_BG` (lowercase register: съединение,
секстил, квадрат, тригон, опозиция) — no adjective, no agreement risk.

```
{aspect.applying ? 'прилагащ' : 'раздалечаващ'}
```
Standalone masculine participle label (implicitly agreeing with "аспект,"
masculine) — correct as a status chip, not attached to the variable-gender
planet/aspect nouns printed above it.

```
{orbDeg}°{orbMm}&apos;
```
No agreement risk (numeric).

`SECTION_TITLES` (Съединения / Опозиции / Квадрати / Тригони / Секстили) are
fixed, plural, selected by lookup — no interpolation.

```
{expanded ? 'Скрий допълнителните' : `Покажи всички (${aspects.length})`}
```
`aspects.length` inside parens as a bare count — no noun follows it needing
agreement (it's "(N)", not "(N аспекта)"), so no bug, but also no
opportunity for one.

---

## packages/astrology/src/constants.ts — source-of-truth lookups (not itself composed prose, referenced throughout this document)

Full enumerations used above:
- `ZODIAC_SIGNS_BG` (12): aries→Овен, taurus→Телец, gemini→Близнаци,
  cancer→Рак, leo→Лъв, virgo→Дева, libra→Везни, scorpio→Скорпион,
  sagittarius→Стрелец, capricorn→Козирог, aquarius→Водолей, pisces→Риби.
- `PLANETS_BG` (11): sun→Слънце, moon→Луна, mercury→Меркурий, venus→Венера,
  mars→Марс, jupiter→Юпитер, saturn→Сатурн, uranus→Уран, neptune→Нептун,
  pluto→Плутон, northNode→Северен възел.
- `ASPECTS_BG` (5): conjunction→Съединение, sextile→Секстил, square→Квадрат,
  trine→Тригон, opposition→Опозиция.
- `UNKNOWN_TIME_DISCLAIMER_BG` — static, no interpolation.

`packages/core/src/charts/sections.ts` duplicates a lowercase variant
(`SIGN_BG`, `ASPECT_BG` — note: same export name `ASPECT_BG` as a *different*
lowercase-register table than `ASPECTS_BG` in constants.ts; naming collision
risk for future maintainers, not a grammar bug) plus `formatDegreeInSign`
(`` `${degrees}°${mm}' ${signBg}` `` — no agreement risk, verified against all
12 signs).

---

## packages/core/src/crystals/recommend.ts — three composed triggers, confirmed pronoun-gender bug

(`overview.ts`, `today.ts`, `daily-collect.ts`, `collect.ts` in the same
directory were checked and contain no Bulgarian sentence templates — pure
data/orchestration.)

### Birthstone trigger — `recommendCrystals()`, line 213, `reasonTextBg`
```
`Слънцето ти е в ${signBg}, а ${birthstone.nameBg ?? birthstone.nameEn} е неговият пазител от най-старите текстове. Това е рожденият ти камък — остава с теб независимо от фазата и от това какво прави небето.`
```
`signBg` from local `ZODIAC_BG` map (lines 140-153, duplicate of
`ZODIAC_SIGNS_BG`/`SIGN_BG` — same 12 values). `birthstone.nameBg` is
DB-driven, unbounded.

Examples: "Слънцето ти е в Овен, а [камък] е неговият пазител..."; "...в
Дева, а..."; "...в Везни, а..."; "...в Риби, а...".

**Risk 1 — preposition**: template hardcodes "в" for every sign, never
routes through a `bgPrep`-style helper (unlike transit-analysis.ts /
interpretations.ts, which do). "Везни" is в-initial → "Слънцето ти е в
Везни" should be "...във Везни" per the same rule correctly applied
elsewhere in the codebase. This file re-implements the sign slot without the
preposition-elision helper other files already have.

**Risk 2 — gender/number agreement**: "неговият пазител" (masc/neut
possessive "негов-") reads naturally only if referring to "Слънцето"
(neuter — correct antecedent by the sentence's actual meaning: the sign is
the sun's guardian). No bug if parsed correctly against "Слънцето," but the
possessive sits directly after the sign name, inviting a misparse where a
reader could take it as agreeing with the sign — for Дева (fem.), Близнаци/
Везни/Риби (grammatically plural) this juxtaposition reads awkwardly even
though technically it's not agreeing with them. Flag as an awkward-adjacency
risk, not a hard grammar violation.

### Lunar-phase trigger — line 238, `reasonTextBg`
```
`${capitalize(labelBg)} отвори своя прозорец. ${phaseCrystal.nameBg ?? phaseCrystal.nameEn} усилва тази фаза и ти помага да я изживееш докрай.`
```
`labelBg` is a closed 2-value enum: 'новолунието' / 'пълнолунието' →
capitalized "Новолунието"/"Пълнолунието". Both neuter definite nouns; verb
agreement ("отвори", 3rd sg past) correct for both. **No bug** — clean
2-value case.

### Transit trigger — line 279, `reasonTextBg` — **CONFIRMED PRONOUN-GENDER BUG**
```
`${planetBg} в момента натиска ${natalBg} — усещаш го, дори когато не можеш да го назовеш. ${transitCrystal.nameBg ?? transitCrystal.nameEn} събира тази сила в нещо, което можеш да носиш.`
```
`planetBg` from local `TRANSIT_PLANET_BG` (5 values, all masculine): Юпитер,
Сатурн, Уран, Нептун, Плутон. `natalBg` from local `NATAL_PLANET_BG` (5
values): sun→"Слънцето ти" (neuter), moon→"Луната ти" (feminine),
mercury→"Меркурий в картата ти" (masc), venus→"Венера в картата ти"
(feminine), mars→"Марс в картата ти" (masc).

The clitic pronoun **"го"** (masculine/neuter accusative) is hard-coded
twice ("усещаш го", "да го назовеш") regardless of `natalBg`'s gender.
Bulgarian requires "я" (feminine accusative) when the antecedent is
feminine. Confirmed wrong for natal ∈ {moon, venus} = 2 of 5 natal values
(40% of the 25 planet×natal combinations):
- "Юпитер в момента натиска Луната ти — усещаш го, дори когато не можеш да
  го назовеш." → should be "усещаш **я**... да **я** назовеш."
- "Уран в момента натиска Венера в картата ти — усещаш го..." → should be
  "усещаш **я**..."
- Correct as-is for sun/mercury/mars: "Сатурн в момента натиска Меркурий в
  картата ти — усещаш го, дори когато не можеш да го назовеш." (masc, "го"
  correct); "Нептун в момента натиска Марс в картата ти — усещаш го..."
  (masc, correct); "Плутон в момента натиска Слънцето ти — усещаш го..."
  (neuter, correct).

This is a same-shape sibling of the "натален"/"точен" gender-agreement bug
in `transit-analysis.ts`, but here it's a **pronoun** rather than an
adjective, and it is unambiguously wrong (not a judgment call) for 2 of 5
natal slots. Cross-file note: `ZODIAC_BG` in this file duplicates
`ZODIAC_SIGNS_BG`/`SIGN_BG` verbatim — three copies of the same 12-entry
map now confirmed across the codebase (`packages/astrology/src/constants.ts`,
`packages/core/src/charts/sections.ts`, `packages/core/src/crystals/recommend.ts`).

---

## apps/web/app/api/oracle/generate/route.ts — quota-limit message, singular/plural bug

### Lines 144 and 161 (both inside 429 quota-exceeded responses)
```
`Достигна месечния лимит от ${quota.limit} четения. Премиум абонаментът премахва ограничението.`
```
`quota.limit` is read live from the DB (`subscription_quotas.ai_readings_limit`
via `apps/web/lib/subscriptions/quota.ts`), not a fixed constant — value is
whatever the free-tier cap is currently configured to (plausibly a small
integer such as 1, 3, 5, or 10).

Examples: "Достигна месечния лимит от 1 четения. ..." (WRONG — should be "1
четене"); "...от 3 четения. ..." (correct, plural); "...от 10 четения. ..."
(correct, plural).

**Risk — numeric agreement**: "четения" (plural of "четене") is hardcoded
regardless of `quota.limit`'s value. If the operator ever configures the
free-tier limit to exactly 1, this becomes grammatically wrong output shown
directly to a paying-adjacent user at the moment they're being upsold to
premium — a visible, latent bug that doesn't depend on code changes to
trigger, only a config/DB value change.

### apps/web/lib/oracle/prompts.ts, apps/web/lib/horoscope/prompts.ts, apps/web/lib/ai/, apps/web/app/api/horoscope/generate/route.ts, packages/core/src/oracle/planet-parser.ts, packages/core/src/stories/catalog.ts, packages/core/src/charts/birth-data.ts, packages/core/src/subscription/tier.ts, packages/core/src/planets/current.ts

Checked in full — no composed/interpolated Bulgarian sentence templates
found. `prompts.ts` (both web files) contain only static illustrative
Bulgarian fragments inside otherwise-English LLM instruction blocks (no
runtime `${}` interpolation of astrology values into Bulgarian prose);
`catalog.ts` is fully static hand-written prose selected by lookup, not
assembled; the rest have no Bulgarian text or are pure data/CRUD.

---

## apps/mobile/components/chart/HousesList.tsx — CONFIRMED BUG (ordinal suffix), line ~74-76

```
{house.number}-и
```
`house.number` = 1-12 (Placidus houses). The `-и` ordinal suffix is hardcoded
for all 12 house numbers. Correct Bulgarian ordinal suffixes are **not**
uniform: 1-ви, 2-ри, 3-ти, 4-ти, then 5-и through 12-и are genuinely `-и`.

Assembled examples across all 12 houses as currently rendered vs. correct:
- 1 → "1-и" (WRONG, should be "1-ви")
- 2 → "2-и" (WRONG, should be "2-ри")
- 3 → "3-и" (WRONG, should be "3-ти")
- 4 → "4-и" (WRONG, should be "4-ти")
- 5 → "5-и" (correct)
- 6 → "6-и" (correct)
- 7 → "7-и" (correct)
- 8 → "8-и" (correct)
- 9 → "9-и" (correct)
- 10 → "10-и" (correct)
- 11 → "11-и" (correct)
- 12 → "12-и" (correct)

4 of 12 houses (1st, 2nd, 3rd, 4th — coincidentally the most emotionally
weighted houses: self, money, communication, home) render a malformed
ordinal on every chart view (Карта → Детайли → Къщи). This is a **numeral-form
agreement bug distinct from the singular/plural count issue** this audit was
originally scoped around — Bulgarian ordinal suffixes vary by the numeral's
own final digit/value, not by any external noun's gender or count. Flag as
in-scope since it's the same family of "assembled the number wrong" defect.

## apps/mobile/components/chart/PlanetDetail.tsx — CONFIRMED BUG (missing в→във mutation), line ~293-297

```jsx
<Text>{planetGlyph} {displayTitle}</Text>
<Text> в </Text>
<Text>{signLabel} {signGlyph}</Text>
```
`displayTitle` = `PLANETS_BG[planet]` (any of the 11 planet names, or
"Асцендент"/"Приблизителен асцендент"). `signLabel` = `ZODIAC_SIGNS_BG[signKey]`
(any of 12 signs). The literal `" в "` is hardcoded with **no bgPrep-style
в→във mutation**, unlike the correctly-guarded helper already present in
`packages/core/src/charts/interpretations.ts` (`bgPrep`) and duplicated
correctly in both `TransitOverviewCard.tsx` files. Breaks specifically for the
2 в-initial signs:
- signLabel=Водолей → renders "Слънце в Водолей" — should be "Слънце **във**
  Водолей" — wrong for all 11 planets/points paired with this sign.
- signLabel=Везни → renders "Слънце в Везни" — should be "Слънце **във**
  Везни" — wrong for all 11 planets/points paired with this sign.
- All other 10 signs → correct plain "в".

Net: 2 of 12 signs (Водолей, Везни) are wrong across all 11 planet/point
values each — same root defect (a `bgPrep`-shaped preposition rule
re-implemented ad hoc, or in this case simply omitted) recurring a fourth
time in the codebase (packages/core/interpretations.ts has the correct
version; transit-analysis.ts, TransitOverviewCard.tsx ×2 have their own
correct copies; recommend.ts and PlanetDetail.tsx both omit it).

**Secondary defect, same component, lines ~299-301**: `interpretation.position`
(from `formatPosition()` in interpretations.ts) already appends `, Дом
${house}` internally, but the caption row appends a *second*, separate
`` `Дом ${house}` `` segment via `.join(' · ')` — the house number is
rendered twice on the same line, e.g. "15°23' Телец, Дом 5 · Земя · Дом 5".
Not a grammar-agreement bug, but a duplicate-content defect directly
adjacent to composed text, flagged for visibility.

## Additional mobile findings (from a parallel pass over apps/mobile/components/chart, dashboard, crystals)

- **`apps/mobile/components/chart/NatalWheelLegend.tsx` (~line 141)** — a
  `.join(', ')` over capitalized `ASPECTS_BG` values mid-sentence after a
  colon ("...различен тип: Съединение, Секстил, Квадрат, Тригон, Опозиция.")
  — conventionally continuous Bulgarian prose lower-cases such a list;
  cosmetic register issue, not an agreement bug.
- **Elliptical noun-noun aspect labels** — `TransitOverviewCard.tsx`
  (`formatActiveTransit`/`formatUpcoming`), `AspectsList.tsx` (both
  platforms) all render bare "Планета Аспект Планета" sequences ("Марс
  Опозиция Венера", "Слънце тригон Луна") with no linking preposition —
  terse data-label register rather than natural Bulgarian prose. This
  sidesteps every gender/preposition risk that a fuller sentence would
  carry (as noted throughout this document, avoiding an attached adjective
  is exactly what keeps these call sites bug-free) but is a **register**
  choice the founder should explicitly sign off on, not obviously a defect.
- **`apps/mobile/components/dashboard/LunarPhaseCard.tsx` (~line 186)** —
  `` `до {shower.zhr} метеора на час` `` has no singular branch for
  `zhr === 1`. Currently unreachable (all 9 real `METEOR_SHOWERS[].zhr`
  values are ≥10 — Урсиди is the lowest at 10), so this is a **latent** bug
  only, not currently visible — flagged because it would silently break if
  a future shower entry used a low ZHR.
- Confirmed **correct** reference implementations (no bug, verified against
  all reachable slot values): `apps/mobile/lib/formatDaysHours.ts`;
  the day-count ternaries in `apps/mobile/components/crystals/DailyStreakPanel.tsx`
  and its web mirror `apps/web/components/crystals/DailyStreakPanel.tsx`;
  `apps/web/components/crystals/CrystalOfTheDayCard.tsx` (`streak.current === 1 ? '1 ден' : ...`);
  `apps/web/components/dashboard/LunarPhaseCard.tsx` and
  `apps/web/components/dashboard/tiles/LunarTile.tsx` (both re-implement
  `formatDaysHours`-equivalent logic and the shower day-count ternary
  correctly, independently, in three more places — a duplication-risk note
  rather than a grammar one: the singular/plural rule is right every time
  it's hand-rolled, but it's hand-rolled in at least 5 separate files with
  no shared `pluralizeBg()` utility).

## Web-file coverage check (closing the gap from the initial file-list-driven pass)

A repo-wide grep for Cyrillic text adjacent to `${...}` interpolation was run
across `apps/web`, `apps/mobile`, `packages/core`, `packages/astrology`
(`packages/db` does not exist in this repo — only `packages/{astrology,
config, core, ui}` — the CLAUDE.md reference to it is stale) to confirm no
composed-string site was missed by the initial suspect-file list. Files
matched and checked beyond the original list: `apps/web/components/auth/DataAccountPage.tsx`
(date interpolated via `Intl`-backed `formatBgDate`, no agreement risk),
`apps/web/components/stories/RecommendationCard.tsx` (durations/pages use
abbreviated units "ч"/"м"/"стр." which sidestep singular/plural entirely —
consistent with the "ч." abbreviation pattern noted elsewhere in this doc),
`apps/web/components/oracle/TopicCard.tsx` and `apps/web/components/chart/NatalWheel.tsx`
(`aria-label`s only, appositive, no agreement risk),
`apps/web/components/horoscope/TransitOverviewCard.tsx` (verified as an
exact functional port of the mobile file already audited above — own
correct `bgPrep` copy, same elliptical-label register choice, no additional
bugs). `apps/web/lib/manifest/` contains only a `PROMPT_VOICE.md` reference
doc, no code — the actual prompt data lives in
`packages/core/src/diary/prompts.ts`, already audited (no composed strings
found there, only static per-variant lookups).

## Existing repo guidance on Bulgarian pluralization

No dedicated rules doc (e.g. a `BULGARIAN_PLURALIZATION.md` or similar) was
found in `.planning/i18n/` (only `BG_UNKNOWN_WORDS.md` and
`BULGARIAN_STRING_INVENTORY.md` exist there, both about static-string
vocabulary, not composition rules) or elsewhere in the repo. The only
pluralization logic that exists lives inline in `formatDaysHours.ts` (correct)
and the ad hoc `streak.current === 1 ? ... : ...` ternaries scattered across
components (correct where checked, but each is hand-rolled independently —
there's no shared `pluralizeBg(n, singular, plural)` helper, so correctness
depends on every call site remembering the count===1 rule rather than a single
tested utility enforcing it).

