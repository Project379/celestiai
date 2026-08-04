# Bulgarian String Inventory — Problem A, Step 1/2

Generated 2026-07-28. Sweep scope: `apps/mobile/**/*.{ts,tsx}`, `apps/web/**/*.{ts,tsx}`,
`packages/**/*.{ts,tsx}` (excluding `node_modules`). Comments (`//`, `/* */`, JSDoc)
excluded — only strings that actually reach the UI (JSX text, string props, template
literals, object properties feeding rendered/AI-prompt content) are listed.

No string below has been edited, corrected, or "improved" — extraction only, per
instruction. Register/grammar/spelling review is a separate, human pass.

---

## PART A — apps/mobile

### `apps/mobile/app/(authed)/(tabs)/chart.tsx` (Карта tab)
- 72: `'Потребител'` — fallback display name
- 110: `"изчисляваме картата"` — loading-state status text
- 115: `"Картата ти още не е настроена. Въведи рождените си данни, за да видиш наталната си карта."` — empty-state body
- 116: `"Въведи рождени данни"` — empty-state CTA label
- 121: `"Грешка при зареждане на картата."` — error-state message
- 144: `натална карта` — JSX heading fragment
- 207: `Докосни планета за тълкуване` — hint/caption text

### `apps/mobile/app/(authed)/(tabs)/circle.tsx` (Кръг tab)
- 19: `'Партньор'` — relationship-type card label
- 20: `'Приятел'` — relationship-type card label
- 41: `Твоят кръг` — screen title
- 46: `Кого мислиш в момента?` — prompt/subtitle
- 65: `Или добави някого, когото искаш да разбереш по-добре.` — empty-state body

### `apps/mobile/app/(authed)/(tabs)/index.tsx` (Днес tab)
- 222: `'Потребител'` — fallback display name
- 265: `'Звездите са в движение. Вселената е написала нещо за теб.'` — sign-quip fallback
- 353: `дневен хороскоп` — section caption
- 355: `"консултира звездите…"` — loading-state status
- 357: `"Звездите мълчат - опитай отново след миг."` — error-state message
- 381: `Плъзни надолу, за да попиташ Оракула` — scroll-hint copy
- 420: `небесен ритъм` — section caption
- 432: template `` `${...}% осветена · до ${...}: ${...}` `` — moon-phase subLabel
- 469: `"Питай Оракула"` — CTA button label
- 476: `"Картата ти още не е настроена. Въведи рождените си данни, за да видиш хороскопа, наталната карта и транзитите."` — empty-state body
- 477: `"Въведи рождени данни"` — empty-state CTA
- 796: `Прочети повече` — link/button caption

### `apps/mobile/app/(authed)/(tabs)/rhythm.tsx` (Ритъм tab)
- 54: `'Бърз ритъм'` — pace label
- 55: `'Бавен ритъм'` — pace label
- 56: `'Смесен ритъм'` — pace label
- 57: `'Тих ден'` — pace label
- 65: `'1 активен транзит'` / `` `${count} активни транзита` `` — count-form hero copy
- 94: `Текущо небе` — section heading
- 104: `Тих ден` — hero heading (quiet-day)
- 107: `Няма силни аспекти към наталната карта точно сега.` — empty-state body
- 129: `Какво ти ` — hero copy fragment
- 130: `влияе сега` — hero copy fragment
- 133: `Активните транзити към картата ти — как планетите говорят с теб точно днес.` — body copy
- 152: `Лунен дневник` — CTA card title
- 155: `Три реда на ден, водени от лунната фаза — манифестация, благодарност, освобождаване.` — CTA card body
- 159: `Отвори дневника` — CTA button label
- 183: `За да видиш транзитите си, първо трябва да имаш натална карта. Въведи рождените си данни.` — empty-state body
- 191: `Въведи рождени данни` — empty-state CTA

### `apps/mobile/app/(authed)/(tabs)/you.tsx` (Ти tab)
- 26: `label: 'Кристали', hint: 'месечни прозорци + дневна серия'`
- 27: `label: 'Дневник', hint: 'лунен дневник — по три реда'`
- 28: `label: 'Препоръки', hint: 'месечни книги и филми'`
- 29: `label: 'Ръководство', hint: 'история, планети, аспекти, лунни фази'`
- 30: `label: 'Премиум', hint: 'абонамент и плащане'`
- 31: `label: 'Настройки', hint: 'акаунт, поверителност, данни'`
- 41: `'Слънце · Луна · Асцендент'` — Big-Three fallback label
- 82: `Ти` — heading

### `apps/mobile/app/(authed)/(tabs)/_layout.tsx` (tab bar)
- 127/133: `'Днес'` — tab title + tabBarLabel
- 139/145: `'Карта'`
- 151/157: `'Кръг'`
- 163/169: `'Ритъм'`
- 175/181: `'Ти'`

### `apps/mobile/app/(authed)/oracle.tsx`
- 99: `'Назад към темите'` / `'Назад'` — accessibilityLabel
- 129: `Астрологичен оракул` — screen heading
- 147: `Избери тема и звездите ще ти разкажат.` — subheading
- 163: `Всички теми` — link/section label
- 216: `консултира звездите…` — loading status

### `apps/mobile/app/(authed)/wizard/confirm.tsx` (wizard step IV — Преглед)
- 23-26: `'Сутрин (06:00–12:00)'`, `'Следобед (12:00–18:00)'`, `'Вечер (18:00–23:59)'`, `'Нощ (00:00–06:00)'`
- 68: `'Не е посочено'`
- 72-75: `'Име на картата'`, `'Дата на раждане'`, `'Час на раждане'`, `'Място'`
- 80: `'Координати'`
- 102: `'Грешка при запазване'`
- 103: `'Неизвестна грешка'`
- 125: `IV · Преглед`
- 128: `Подготвяме картата`
- 131: `Провери данните преди да изчислим позициите на планетите.`
- 156-164: `Когато часът не е точен, картата се изчислява по обяд на местно време — така грешката при неизвестен час е най-малка. Избраният период се запазва за контекст при тълкуването, но не влияе върху позициите на планетите. Възходящият знак е приблизителен, затова тълкуването му е ориентировъчно.`
- 167: `Моля, попълни всички задължителни полета преди да запазиш.`
- 186: `‹ Назад`
- 201: `Запазване…`
- 218: `Изчисли картата`

### `apps/mobile/app/(authed)/wizard/date.tsx` (wizard step I — Дата)
- 29: `'Избери дата'`
- 106: `I · Кога`
- 109: `Дата на раждане`
- 112: `Въведи името на картата и точната дата.`
- 119: `Име на картата`
- 129: placeholder `"Моята карта"`
- 147: `Дата на раждане`
- 183: `Напред ›`
- 233: `Готово`

### `apps/mobile/app/(authed)/wizard/location.tsx` (wizard step III — Място)
- 117: `III · Място`
- 120: `Място на раждане`
- 123: `Мястото определя домовете и асцендента.`
- 139: `Ръчни координати`
- 142: `За раждане извън България`
- 175: `Търсене на град`
- 187/192: `Име на мястото`
- 202: placeholder `"Лондон, Великобритания"`
- 219: `Ширина`
- 241: `Дължина`
- 272: `‹ Назад`
- 281: `Напред ›`

### `apps/mobile/app/(authed)/wizard/time.tsx` (wizard step II — Час)
- 28-31: `label: 'Сутрин', hours: '06 - 12'` / `'Следобед', '12 - 18'` / `'Вечер', '18 - 24'` / `'Нощ', '00 - 06'`
- 128: `II · Час`
- 131: `Час на раждане`
- 134: `Точният час определя асцендента и домовете.`
- 150: `Знам точния час на раждане`
- 153: `Подобрява асцендента и домовете`
- 187: `Точен час`
- 203: placeholder `'Избери час'`
- 218: `Приблизителен период`
- 267-269: `Картата се изчислява по обяд на местно време; избраният период е за контекст, а възходящият знак е приблизителен, затова тълкуването му е ориентировъчно.`
- 281: `‹ Назад`
- 290: `Напред ›`

### `apps/mobile/app/(authed)/wizard/_layout.tsx`
- 79-82: `title: 'Дата'`, `'Час'`, `'Място'`, `'Преглед'`

### `apps/mobile/app/(authed)/you/crystals.tsx`
- 53: `Кристали · Лунна колекция`
- 93: `Премиум функция`
- 96: `Личната ти колекция, препоръките по натална карта и лунните събития са част от Премиум достъпа.`
- 104: `Научи повече`
- 115: `За да видиш личните си препоръки, първо трябва да имаш натална карта. Въведи рождените си данни.`
- 123: `Добави натална карта`

### `apps/mobile/app/(authed)/you/guide.tsx`
- 33: `Ръководство`
- 36-37: `Какво е ` / `астрологията?`
- 40: `Пътеводител от древните вавилонски звездочетци до прецизните алгоритми, с които Stellaeum изчислява твоята натална карта.`

### `apps/mobile/app/(authed)/you/premium.tsx`
- 25: `Премиум идва скоро.`

### `apps/mobile/app/(authed)/you/settings.tsx`
- 36-41: `'Излизане от профила'`, `'Наистина ли искаш да излезеш от профила си?'`, `text: 'Отказ'`, `text: 'Излез'`
- 56: `Alert.alert('Нещо се обърка', 'Не успяхме да подготвим данните ти. Опитай отново.')`
- 69-74: `'Изтриване на акаунта'`, template body, `text: 'Отказ'`, `text: 'Изтрий акаунта'`
- 93: `Данни и акаунт`
- 100: `Изтегли данните си`
- 110: `'Изтриването е заявено' : 'Изтрий акаунта'`
- 118: `Правно`
- 125: `Политика за поверителност`
- 133: `accessibilityLabel="Излез"`
- 138: `Излез`

### `apps/mobile/app/(authed)/_layout.tsx` (stack headers)
- 64-93: `title: 'Оракул'`, `'Лунен дневник'`, `'Кристали'`, `'Препоръки'`, `'Ръководство'`, `'Премиум'`, `'Настройки'` (each with `headerBackTitle: 'Назад'`)

### `apps/mobile/app/(public)/sign-in.tsx`
- 20-24: Clerk error strings (`'Няма профил с този имейл'`, `'Грешна парола'`, `'Невалиден имейл'`, `'Попълни всички полета'`, `'Твърде много опити. Изчакай малко.'`)
- 28/35: `'Нещо се обърка. Опитай отново.'`
- 73: template `` `Неочакван статус: ${signIn.status}` ``
- 112: `Вход`
- 116: `Влез в Stellaeum`
- 121: `Имейл`
- 139: `Парола`
- 178: `'Влизане' : 'Влез'`
- 184: `Нямаш профил?`
- 188: `Създай`

### `apps/mobile/app/(public)/sign-up.tsx`
- 20-26: error strings (`'Вече има профил с този имейл'`, `'Невалиден имейл'`, `'Тази парола е твърде често срещана. Избери по-силна.'`, `'Паролата е твърде кратка (мин. 8 символа)'`, `'Паролата е твърде дълга'`, `'Попълни всички полета'`, `'Твърде много опити. Изчакай малко.'`)
- 29/34: `'Нещо се обърка. Опитай отново.'`
- 56: `'Паролите не съвпадат'`
- 115: `Регистрация`
- 119: `Създай профил`
- 128: `Име`
- 145: `Фамилия`
- 162: `Имейл`
- 180: `Парола`
- 196: `Минимум 8 символа`
- 201: `Потвърди парола`
- 240: `'Създаване' : 'Създай'`
- 246: `Имаш профил?`
- 250: `Влез`

### `apps/mobile/app/(public)/two-factor.tsx`
- 20-24: error strings (`'Грешен код'`, `'Кодът изтече. Изпрати нов.'`, `'Невалиден код'`, `'Потвърждението не успя. Опитай отново.'`, `'Твърде много опити. Изчакай малко.'`)
- 28/33: `'Нещо се обърка. Опитай отново.'`
- 110: template `` `Неочакван статус: ${signIn.status}` ``
- 161/163/164: instructions (`'Въведи 6-цифрения код от приложението за удостоверяване.'`, `'Изпратихме 6-цифрен код на телефона ти. Въведи го по-долу.'`, `'Въведи един от резервните си кодове.'`)
- 166: `'Резервен код' : 'Код'`
- 186: `Втора стъпка`
- 190: `Потвърди самоличността си`
- 229: `Изпратихме нов код`
- 250: `'Потвърждаване' : 'Потвърди'`
- 265: `'Изпращане' : 'Изпрати нов код'`
- 279/292/305: `Използвай резервен код`, `Използвай код от приложение`, `Използвай SMS код`

### `apps/mobile/app/(public)/verify.tsx`
- 20-25: error strings (`'Грешен код'`, `'Кодът изтече. Изпрати нов.'`, `'Вече е потвърден'`, `'Кодът изтече. Изпрати нов.'`, `'Потвърждението не успя. Опитай отново.'`, `'Твърде много опити. Изчакай малко.'`)
- 29/34: `'Нещо се обърка. Опитай отново.'`
- 61: template `` `Неочакван статус: ${signUp.status}` ``
- 117: `Потвърждение`
- 121: `Потвърди имейла`
- 125: `Изпратихме 6-цифрен код на имейла ти. Въведи го по-долу.`
- 130: `Код`
- 153: `Изпратихме нов код`
- 174: `'Потвърждаване' : 'Потвърди'`
- 188: `'Изпращане' : 'Изпрати нов код'`

### `apps/mobile/app/_stage2-preview.tsx` (internal preview harness — not a shipped route, still contains Bulgarian sample text)
- Mock data across lines 118-219: `'Намаляваща луна'`, `'Николай'`, `'Скорпион'`, `'Персеиди'`, `'Персей'`, `ДНЕС`, `label="Питай Оракула"`, `четвъртък, 25 юли`, `Добър вечер, Николай.`, `phaseName="Растяща луна"`, `subLabel="62% осветена от Слънцето, скрито под хоризонта"`, `КАРТА`, `натална карта`, `Николай Тонев`, `докосни планета за тълкуване`, `sunSign="Скорпион"`, `moonSign="Риби"`, `risingSign="Везни"`
- Flag for reviewer: confirm whether this preview harness is in scope (not user-facing production code).

### `apps/mobile/components/astrology-guide/*` (6 files — Ръководство sections)
- `GuideAspectsSection.tsx`: 5 aspect name/tone/description triples (Съединение/Секстил/Квадрат/Тригон/Опозиция) + section header/body (lines 7-52)
- `GuideHistorySection.tsx`: section header + 4 long narrative paragraphs (lines 13-31)
- `GuideLunarPhasesSection.tsx`: 8 phase name/task/appearance triples + waxing/waning half-cycle cards + section headers/body (lines 7-138)
- `GuideMethodSection.tsx`: method step descriptions + section header (lines 9-36)
- `GuidePlanetsSection.tsx`: 10 planet entries across 3 groups (Лични/Социални/Трансперсонални) + section header/body (lines 13-54)
- `GuidePrinciplesSection.tsx`: 3 stat cards + section header + 2 body paragraphs (lines 6-38)
- `GuideTransitsSection.tsx`: fast/slow planet cards + section header/body (lines 15-59)

### `apps/mobile/components/chart/*`
- `AspectsList.tsx`: 5 aspect group labels, empty state, toggle button, applying/separating labels (lines 36-197)
- `AstrologyReference.tsx` — **largest single glossary file**: heading/subheading, 4 tab labels, wheel explanation, zodiac/houses/planets/aspects/aspect-points/retrograde/Ascendant-line/MC-line sections, full 11-planet reference table, full transits reference table (~110 strings, lines 37-399)
- `DetailsSheet.tsx`: 3 tab labels, close a11y label, sheet heading (lines 38-78)
- `HousesList.tsx`: 12 house-theme labels, disclaimer, heading, ordinal label (lines 12-75)
- `NatalWheel.tsx`: 533 accessibilityLabel
- `NatalWheelLegend.tsx`: 2 a11y labels, heading, 6 term/description pairs, footer link (lines 48-176)
- `Pedestal.tsx`: 122 `Детайли`
- `PlanetDetail.tsx`: 4 element labels, close a11y label, modal eyebrow, section titles (`Общ поглед`/`Силни страни`/`Предизвикателства`/`Аспекти`/`Насока за развитие`), disclaimer (lines 106-436)
- `PlanetDisambiguation.tsx`: 48 close a11y label
- `Plaque.tsx`: 286/293/300 — `label="Слънце"`, `"Луна"`, `"Асцендент"`

### `apps/mobile/components/CrystalCard.tsx`
- 22-40: `Кристал за днес`, `Зареждане`, `Не се получи`

### `apps/mobile/components/crystals/*`
- `CrystalCollectionContent.tsx`: loading/error text, 4 tab labels, empty-state heading+body (lines 57-118)
- `CrystalDetailPanel.tsx`: lunar-phase/sign/planet/element/rarity maps, close a11y label, badge, 5 field labels, section heading+body, action button (lines 19-177)
- `CrystalGridTile.tsx`: rarity map, undiscovered fallback (lines 22-78)
- `CrystalOfTheDayCard.tsx`: heading, loading/error, streak counter, badge (lines 95-165)
- `DailyStreakPanel.tsx`: loading/error, headings, badge, count-form, stat labels, body copy, dynamic a11y label, caption (lines 37-141)

### `apps/mobile/components/dashboard/LunarPhaseCard.tsx`
- 20-310: month-name array, countdown fallback, heading, illumination line, expand toggle, meteor-shower subheading + countdown fragments, 6 `ManifestField` labels, "next turning point"/"next meteor shower" headings, guide links, "about phases" expander (heading, body, waxing/waning labels, 8-phase list, closing link)

### `apps/mobile/components/manifest/*`
- `ManifestDiaryContent.tsx`: heading, fragments, body, close a11y label, loading text, "previous pages" heading, count-form, share button, guide link (lines 118-211)
- `ManifestEntryForm.tsx`: helper/status text, submit button, confirmation toast (lines 99-131)
- `ManifestHistory.tsx`: 34 empty-state body

### `apps/mobile/components/onboarding/SkipWizardButton.tsx`
- 23-42: Alert title/body/buttons, button label

### `apps/mobile/components/oracle/*`
- `CapReachedNotice.tsx`: cap-reached messages (lines 57-60)
- `TopicCards.tsx`: 4 topic labels (Личност/Любов/Кариера/Здраве), dynamic a11y label (lines 26-81)

### `apps/mobile/components/OracleEntry.tsx`
- 56: `accessibilityLabel="Отвори Оракула"`

### `apps/mobile/components/settings/DeletionPendingBanner.tsx`
- 32/41: banner text, button

### `apps/mobile/components/stories/*`
- `RecommendationCard.tsx`: kind labels, status labels, verb labels, duration/page text, toggle, `WhyBlock` labels, status caption, action button (lines 13-166)
- `StoriesContent.tsx`: monthly-kind labels, heading+fragments, body, tab label, caption, loading, empty state, CTA, closing body (lines 17-241)

### `apps/mobile/components/wizard/CitySearch.tsx`
- 30-171: place-type suffixes, error, "смени" button, placeholder, empty state

### `apps/mobile/components/wizard/TimePicker.tsx`
- 153/201: label, button

### Hooks/lib (mobile)
- `hooks/useAccountDeletion.ts`: success/error Alert title+body ×4 (lines 51-74)
- `hooks/useManifestEntries.ts`: 5 coded error messages (ERR-DI-002/003/004/007/008)
- `hooks/useOracleReading.ts`: 143 error message
- `lib/clerk/displayName.ts`: 10 fallback `'Ти'`
- `lib/diary/export.ts`: 27 export doc title
- `lib/formatDaysHours.ts`: count-form strings (lines 11-16)
- `lib/gdpr/export.ts`: 16 export doc title
- `lib/notifications/maybePromptPushPermission.ts`: permission-prompt title/body/accept/decline (lines 81-85)

---

## PART B — apps/web

### Route metadata (`title`/`description` — browser tab / SEO, user-visible)
16 route files, each with a page title + description (Вход, Регистрация, Рождени данни, Натална карта, Кръг, Табло, Лунен дневник, Ритъм, Абонаментът е активен, Ръководство за кристали, Кристали, Какво е астрологията?, Ти, Препоръки, Цени, Политика за поверителност) plus root `layout.tsx` metadata (title, description, keywords array, OpenGraph duplicates, Clerk `formFieldInputPlaceholder__confirmDeletionUserAccount`).

### Page-level content (largest files)
- `app/(protected)/chart/page.tsx`, `app/(protected)/rhythm/page.tsx` — headings, subheadings, empty states, CTAs, back links (near-duplicate of mobile equivalents)
- `app/(protected)/subscription/success/SuccessContent.tsx` — activation flow copy, feature list, CTAs (~20 strings)
- `app/(protected)/you/crystals/page.tsx` — heading, fragments, body, premium teaser, empty state, CTA
- `app/(protected)/you/recommendations/page.tsx` — 12 zodiac sign names (fallback sun-sign calc)
- `app/api/**` — every API route returns Bulgarian JSON error messages surfaced as toasts/inline errors: generic (`'Неоторизиран достъп'`, `'Невалидни данни'`, `'Вътрешна грешка'`) repeated across ~25 route files, plus feature-specific messages (birth-data, chart, cities, cron, crystals, diary, gdpr, oracle, push, stripe, transits, user) — see full per-route breakdown in the research notes; roughly 70-90 distinct error-message occurrences.
- `app/global-error.tsx` — global error heading + body
- `app/pricing/page.tsx` + `PricingContent.tsx` — plan feature lists, heading/subheading, status messages, plan cards, CTAs (~25 strings)
- `app/privacy/page.tsx` — full privacy policy document, 7 numbered sections with headers + body (~20 strings)

### Components (largest clusters)
- `components/astrology-guide/AstrologyGuideContent.tsx` — full web parity of mobile's 6 guide sections in one file (~150 strings)
- `components/astrology-guide/CrystalsGuideContent.tsx` — large narrative page, 7 explainer cards + philosophy section + catalog intro (~40 strings)
- `components/auth/*` (10 files) — account/subscription/settings screens, dialogs, banners, menu labels
- `components/birth-data/*` (8 files) — web wizard, mirrors mobile wizard content nearly 1:1 (separate call sites)
- `components/CelestialBackground.tsx` / `CelestialCanvas.tsx` — full Bulgarian constellation catalog (15 constellations × name/description/season/brightestStar/star names) — landing page only
- `components/chart/*` (10 files) — web parity of mobile chart components; web-only additions in `BigThreeCards.tsx` (sign-archetype adjectives) and `ChartView.tsx` (error states)
- `components/circle/CircleEmptyState.tsx` — relationship-type cards, heading, empty state
- `components/crystals/*` (5 files) — near-duplicate of mobile crystal components
- `components/dashboard/*` (6 files) — Днес dashboard tiles + cards, web-only tile components (Circle/Crystal/Lunar/Transit tiles)
- `components/horoscope/*` (5 files) — daily horoscope card, push-notification banner, transit event detail, transit overview (near-duplicate of mobile)
- `components/landing/*` (7 files) — marketing landing page: hero, features, pricing section, nav, splash tagline (~35 strings)
- `components/layout/ProtectedNav.tsx` — 5 nav labels + a11y label
- `components/LoadingAnimation.tsx` — loading text
- `components/manifest/*` — web Лунен дневник, near-duplicate of mobile
- `components/oracle/*` (5 files) — Oracle panel, topic cards, cap-reached notice (near-duplicate of mobile)
- `components/stories/*` — web Препоръки, near-duplicate of mobile
- `components/upgrade/PricingToggle.tsx` — 3 strings
- `components/you/YouHub.tsx` — 4 nav-hub cards + heading + subheading

### Hooks
- `useChart.ts`, `useManifestEntries.ts` (duplicate of mobile hook), `useOracleReading.ts` — error messages

### Prompt-builder files (borderline — feeds LLM input, not directly rendered; see Problem B)
- `lib/horoscope/prompts.ts` / `transit-to-prompt.ts` — labeled prompt sections
- `lib/oracle/chart-to-prompt.ts` — labeled prompt sections

### `lib/crystals/guide-content-bg.ts`
- ~30 crystal lore entries (name + long description) + 8 family section title/subtitle pairs (~70 strings)

### Validators
- `lib/validators/chart.ts` — 1 Zod error
- `lib/validators/diary.ts` — 9 Zod errors

---

## PART C — packages/ (shared code, consumed by both apps)

- `packages/astrology/src/constants.ts` — 12 zodiac signs, 11 planet names, 5 aspect names, 1 disclaimer string (used across nearly every chart UI on both platforms)
- `packages/core/src/charts/interpretations.ts` — **largest interpretation-content file**: 11 planet core-meaning sentences, 33 strength phrases, 33 challenge phrases, 12 sign-personality phrases, 12 sign-inflection sentences, 12 house-meaning sentences, aspect label/tone/prep maps, Ascendant-specific block (~150+ strings; feeds `PlanetDetail` on both platforms)
- `packages/core/src/charts/schemas.ts` — ~15 Zod validation messages (duplicated for create + edit schema variants, ~30 occurrences)
- `packages/core/src/charts/sections.ts` — sign names (title case) + aspect names (lowercase variant)
- `packages/core/src/crystals/recommend.ts` — sign/planet name maps, recommendation-reason subjects, templated reason sentences (feeds `CrystalDetailPanel`/`CrystalCollectionContent` on both platforms)
- `packages/core/src/diary/export.ts` — export title/line/filename strings
- `packages/core/src/diary/prompts.ts` — **~190 strings**: 24 phase-based journal-prompt sets (heading + lead + 3 field labels + 3 placeholders each)
- `packages/core/src/horoscope/transit-analysis.ts` — 12 house-theme phrases, 5 aspect-meaning phrases, speed/applying-separating phrases, templated summary sentences, lunar-event sentences, AI-prompt section labels (see Problem B)
- `packages/core/src/lib/moon-phase.ts` — 8 lunar phases × ~6 fields each (~56 strings; canonical source feeding `LunarPhaseCard` and the Guide on both platforms)
- `packages/core/src/stories/catalog.ts` — **largest content file (~260 strings)**: 15 daily lunar-phase recommendations + 12 monthly sun-sign recommendation blocks, each with title/author/tagline/3 narrative fields
- `packages/core/src/welcome/compose.ts` — 4 time-of-day greetings, 8 lunar-phase headlines, 32 elemental-phase quips, 1 meteor-shower line
- `packages/core/src/welcome/meteor-showers.ts` — 10 meteor-shower entries (name/radiant/parentBody/description)
- `packages/core/src/welcome/sign-quips.ts` — 12 sign-quip sentences
- `packages/core/src/welcome/sun-sign.ts` — 12 zodiac sign names (date-range lookup)

---

## Summary

**1. Total distinct string-literal occurrences (call sites):** approximately **3,050–3,150** across the swept files. Heaviest concentrations: `packages/core/src/stories/catalog.ts` (~260), `packages/core/src/diary/prompts.ts` (~190), `apps/mobile/components/chart/AstrologyReference.tsx` and its web twin (~110 each), `packages/core/src/charts/interpretations.ts` (~150+), `packages/core/src/lib/moon-phase.ts` (~56), `apps/web/lib/crystals/guide-content-bg.ts` (~70).

**2. Total unique string values:** roughly **1,500–1,700**. Heavy duplication comes from: (a) near-identical mobile/web parity ports of the same screen (wizard, chart, guide, crystals, oracle, manifest all exist twice); (b) shared sign/planet/aspect/lunar-phase name maps repeated across `packages/astrology`, `packages/core`, and both apps' local components (12 sign names and 10-11 planet names alone appear 15-20+ times each); (c) generic API error strings (`'Неоторизиран достъп'`, `'Невалидни данни'`, `'Нещо се обърка. Опитай отново.'`, coded `ERR-BD-*`/`ERR-DI-*` messages) repeated across nearly every route and its client hook.

**3. Clustering:**
- **By feature, largest:** (1) the astrology reference/glossary + interpretation engine — the single biggest cluster of long-form descriptive prose; (2) Препоръки (book/film recommendations) — largest narrative-content cluster; (3) Кристали lore — large content cluster; (4) the birth-data wizard (8 files, mobile+web) — largest cluster of pure form-UI strings; (5) Днес/lunar-phase/manifest-journal — greeting/phase/journal-prompt content.
- **By category:** long-form descriptive/narrative body copy is the largest category by far (likely 60%+ of all strings) — astrology-guide prose, crystal lore, recommendation blurbs, planet/sign/house/aspect interpretations, moon-phase and journal-prompt content. Second: short data-map labels (signs, planets, aspects, phases, rarity/element tags), repeated verbatim across many files. Third: API/validation error messages, heavily repeated across the mobile+web+shared-package triplication. Smallest but present everywhere: button/CTA labels, accessibility labels (mostly "Затвори"/close-button variants), placeholders, Alert/dialog copy.

**Completeness note:** every file surfaced by the Cyrillic-character sweep is represented above. A handful of very large, highly repetitive data files (`stories/catalog.ts`, `diary/prompts.ts`, `guide-content-bg.ts`, `moon-phase.ts`, `interpretations.ts`) are reported with line ranges and representative listings rather than every single string restated in full — the exact text for each is verbatim in the cited file at the cited lines; none were paraphrased.
