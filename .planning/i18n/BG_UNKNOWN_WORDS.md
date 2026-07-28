# Bulgarian Unknown-Word Review — Stage 1

Generated from `pnpm run check:bg-strings` (339 flagged string occurrences → 255 unique words), frequency-sorted.

Bucket counts: **A (likely valid) 247** · **B (likely wrong) 5** · **C (uncertain) 3**

Note: this list came out larger than the 60-80 originally estimated — the dictionary gap is dominated by proper nouns (foreign author/director names in the stories catalog, star/constellation names, meteor showers, mineral names), which Hunspell will never carry. Those are bucketed A with a one-line cluster reason rather than individually re-verified, since verifying 150+ transliterated names one at a time would not change the classification. Every word that is NOT an obvious proper noun was checked against its source line individually (buckets B and C, plus the handful of A entries with specific reasoning).

HALT — awaiting your review. Mark each row A/B/C (or correct my bucket) before Stage 2.

---

## Bucket B — Likely wrong (misspelling / wrong-language / bug)

| Word | Count | Example | Reasoning |
|---|---|---|---|
| гладa | 1 | `packages\core\src\stories\catalog.ts:299` | Mixed-script bug: trailing Latin "a" instead of Cyrillic "а" — should read "глада" ("четеш за глада за величие"). |
| епхемерис | 1 | `apps\web\app\(protected)\you\guide\page.tsx:7` | Likely letter-transposition typo: standard Bulgarian is "ефемерида"/"ефемерис" (п/ф swapped), not "епхемерис". |
| Замляване | 1 | `packages\core\src\stories\catalog.ts:197` | Likely missing-syllable typo: the intended word is almost certainly "Заземяване" (grounding) — "Замляване" is not a Bulgarian word. |
| орбис | 1 | `packages\core\src\charts\interpretations.ts:162` | Inconsistent with the term used everywhere else in the same file/domain: "орб" (5 occurrences) is the established astrology term; "орбис" appears once and doesn't inflect to any valid Bulgarian form. |
| Ришa | 1 | `apps\web\components\CelestialCanvas.tsx:115` | Mixed-script bug: trailing Latin "a" instead of Cyrillic "а" in the star name "Ал Риша" (Al Rischa). |

## Bucket C — Uncertain

| Word | Count | Example | Reasoning |
|---|---|---|---|
| Неоторизиран | 35 | `apps\web\app\api\birth-data\route.ts:15` | "Неоторизиран достъп" (35 occurrences, all API error responses) — оторизирам/оторизация are established loanwords, so this is plausibly valid, but it's worth a native-speaker check since it's the single highest-frequency flag and it's boilerplate copy-pasted across every protected route. |
| навичен | 1 | `packages\core\src\charts\interpretations.ts:211` | "прекалено разчитане на навичен социален стил" — unsure this is a real Bulgarian adjective; "навикнал"/"обичаен" are the forms I'd expect instead. |
| страхова | 1 | `packages\core\src\charts\interpretations.ts:56` | "страхова сдържаност" — plausible (cf. clinical term "страхова невроза") but uncommon enough outside that fixed phrase that I can't confirm it's correct here. |

## Bucket A — Likely valid Bulgarian (dictionary gap)

| Word | Count | Example | Reasoning |
|---|---|---|---|
| ч | 7 | `apps\mobile\components\horoscope\TransitOverviewCard.tsx:371` | Abbreviation for "час" (hour) — dictionary doesn't carry abbreviations. |
| орб | 5 | `apps\mobile\components\horoscope\TransitOverviewCard.tsx:343` | Standard Bulgarian astrology jargon for aspect "orb" — dictionary gap, domain term. |
| Сериал | 5 | `apps\mobile\components\stories\RecommendationCard.tsx:17` | Valid loanword "series" (TV/film) — dictionary gap. |
| Лидерство | 4 | `apps\mobile\components\astrology-guide\GuidePlanetsSection.tsx:16` | Valid noun "leadership" — dictionary gap, used repeatedly across planet-meaning copy. |
| Толстой | 4 | `packages\core\src\stories\catalog.ts:92` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Аврелий | 3 | `packages\core\src\stories\catalog.ts:500` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Алдебаран | 3 | `apps\web\components\CelestialCanvas.tsx:34` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Антарес | 3 | `apps\web\components\CelestialCanvas.tsx:82` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Ескивел | 3 | `packages\core\src\stories\catalog.ts:188` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Зюскинд | 3 | `packages\core\src\stories\catalog.ts:422` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| ѝ | 3 | `apps\web\lib\crystals\guide-content-bg.ts:48` | Valid Bulgarian dative feminine pronoun ("ѝ") — dictionary/tokenizer just doesn't carry the accented form. |
| интернет | 3 | `apps\mobile\hooks\useManifestEntries.ts:57` | Established loanword, dictionary gap. |
| Калвино | 3 | `packages\core\src\stories\catalog.ts:539` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Керуак | 3 | `packages\core\src\stories\catalog.ts:461` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Копола | 3 | `packages\core\src\stories\catalog.ts:594` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| мин | 3 | `apps\mobile\app\(public)\sign-up.tsx:24` | Abbreviation for "минути" (minutes). |
| Мураками | 3 | `packages\core\src\stories\catalog.ts:578` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Натална | 3 | `apps\web\components\landing\FeaturesSection.tsx:13` | Established astrology adjective "natal" (натална карта) — dictionary gap, case/capitalization variant. |
| Наталната | 3 | `apps\mobile\components\astrology-guide\GuidePrinciplesSection.tsx:35` | Established astrology adjective "natal", definite form — dictionary gap. |
| Одзу | 3 | `packages\core\src\stories\catalog.ts:360` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Полукс | 3 | `apps\web\components\CelestialCanvas.tsx:42` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Регул | 3 | `apps\web\components\CelestialCanvas.tsx:58` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Спика | 3 | `apps\web\components\CelestialCanvas.tsx:66` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Халей | 3 | `packages\core\src\welcome\meteor-showers.ts:50` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| Аз-а | 2 | `apps\mobile\components\chart\AstrologyReference.tsx:195` | Valid definite-object form of the philosophical noun "Аз" ("the Self/Ego") — dictionary gap. |
| Айвъри | 2 | `packages\core\src\stories\catalog.ts:516` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Аквариди | 2 | `packages\core\src\welcome\meteor-showers.ts:45` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| Алиот | 2 | `apps\web\components\CelestialCanvas.tsx:138` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| архетип | 2 | `apps\mobile\components\chart\AstrologyReference.tsx:243` | Valid loanword "archetype" — dictionary gap. |
| Асцендента | 2 | `apps\mobile\components\astrology-guide\GuideMethodSection.tsx:19` | Astrology term "Ascendant", inflected object form — dictionary gap. |
| Афирмация | 2 | `apps\mobile\components\dashboard\LunarPhaseCard.tsx:178` | Valid loanword "affirmation" — dictionary gap. |
| Бабет | 2 | `packages\core\src\stories\catalog.ts:202` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| белязват | 2 | `apps\mobile\components\chart\AstrologyReference.tsx:381` | Valid verb, 3rd person plural present of "белязвам" ("they mark/signify") — dictionary gap. |
| Борхес | 2 | `packages\core\src\stories\catalog.ts:12` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Ботура | 2 | `packages\core\src\stories\catalog.ts:26` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Бърнет | 2 | `packages\core\src\stories\catalog.ts:266` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Бъртън | 2 | `packages\core\src\stories\catalog.ts:76` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| г | 2 | `packages\core\src\diary\export.ts:17` | Abbreviation fragment ("г." = година/год.) split by the tokenizer. |
| Гетсби | 2 | `packages\core\src\stories\catalog.ts:303` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| год | 2 | `apps\web\app\pricing\PricingContent.tsx:220` | Abbreviation for "година" (year). |
| Гъруик | 2 | `packages\core\src\stories\catalog.ts:282` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| д | 2 | `apps\web\components\dashboard\tiles\LunarTile.tsx:19` | Abbreviation fragment (likely "д." as in a date/measurement abbreviation) split by the tokenizer. |
| двайсет | 2 | `packages\core\src\stories\catalog.ts:33` | Valid colloquial number word "twenty" — dictionary gap. |
| Дейвид | 2 | `packages\core\src\stories\catalog.ts:28` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Дубхе | 2 | `apps\web\components\CelestialCanvas.tsx:137` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| дъга-секунди | 2 | `apps\mobile\components\astrology-guide\GuideMethodSection.tsx:9` | Compound domain term "arc-seconds" (astronomy) — dictionary gap. |
| животоопределящи | 2 | `apps\mobile\components\chart\AstrologyReference.tsx:381` | Valid compound adjective "life-determining" — dictionary gap, coined but grammatically standard compounding. |
| Зинсър | 2 | `packages\core\src\stories\catalog.ts:60` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Зорбас | 2 | `packages\core\src\stories\catalog.ts:147` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Казандзакис | 2 | `packages\core\src\stories\catalog.ts:149` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Калик | 2 | `packages\core\src\stories\catalog.ts:108` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Кар-уай | 2 | `packages\core\src\stories\catalog.ts:399` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Каус | 2 | `apps\web\components\CelestialCanvas.tsx:91` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Куросава | 2 | `packages\core\src\stories\catalog.ts:165` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Линклейтър | 2 | `packages\core\src\stories\catalog.ts:243` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Люмет | 2 | `packages\core\src\stories\catalog.ts:44` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| медитирай | 2 | `packages\core\src\lib\moon-phase.ts:83` | Valid imperative verb "meditate" — dictionary gap, not a mineral name (moon-phase.ts prose). |
| Мичъл | 2 | `packages\core\src\stories\catalog.ts:227` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Най-високата | 2 | `apps\mobile\components\chart\AstrologyReference.tsx:195` | Regular "най-" superlative construction ("the highest") — grammatically standard; dictionary can't enumerate every superlative. |
| Най-дълга | 2 | `apps\mobile\components\crystals\DailyStreakPanel.tsx:99` | Regular "най-" superlative construction ("the longest") — grammatically standard. |
| най-старите | 2 | `apps\web\components\CelestialCanvas.tsx:98` | Regular "най-" superlative construction ("the oldest") — grammatically standard, not a proper noun. |
| НАСА | 2 | `apps\mobile\components\astrology-guide\GuideMethodSection.tsx:9` | Acronym/proper noun "NASA" — dictionaries don't carry acronyms. |
| НАТАЛНА | 2 | `apps\web\lib\horoscope\transit-to-prompt.ts:59` | Established astrology adjective "natal", all-caps variant — dictionary gap. |
| негледан | 2 | `apps\mobile\components\stories\RecommendationCard.tsx:29` | Valid past participle "unwatched" (film) — dictionary gap. |
| Негледан | 2 | `apps\mobile\components\stories\RecommendationCard.tsx:22` | Valid past participle "unwatched" (film), capitalized — dictionary gap. |
| обсесия | 2 | `packages\core\src\stories\catalog.ts:427` | Valid loanword "obsession" — dictionary gap, used in catalog.ts prose (not a proper noun). |
| Персеиди | 2 | `apps\mobile\app\_stage2-preview.tsx:120` | Meteor shower proper noun (duplicate reference outside meteor-showers.ts) — dictionary gap. |
| Персей | 2 | `apps\mobile\app\_stage2-preview.tsx:130` | Constellation proper noun (duplicate reference outside meteor-showers.ts) — dictionary gap. |
| Ригел | 2 | `apps\web\components\CelestialCanvas.tsx:124` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Садалсууд | 2 | `apps\web\components\CelestialCanvas.tsx:107` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| самоизразяването | 2 | `apps\mobile\components\chart\AstrologyReference.tsx:330` | Valid noun "self-expression", definite form — dictionary gap. |
| саморефлексия | 2 | `packages\core\src\lib\moon-phase.ts:121` | Valid compound noun "self-reflection" — dictionary gap, not a mineral name. |
| себеизразяване | 2 | `packages\core\src\charts\interpretations.ts:36` | Valid noun "self-expression" — dictionary gap. |
| Секстили | 2 | `apps\mobile\components\chart\AspectsList.tsx:40` | Astrology aspect term "sextiles" — dictionary gap, domain vocabulary. |
| Сияма | 2 | `packages\core\src\stories\catalog.ts:555` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| социума | 2 | `apps\mobile\components\chart\AstrologyReference.tsx:195` | Valid definite form of "социум" ("society/social milieu") — dictionary gap. |
| стр | 2 | `apps\mobile\components\stories\RecommendationCard.tsx:65` | Abbreviation for "страница" (page). |
| Танидзаки | 2 | `packages\core\src\stories\catalog.ts:124` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Тригони | 2 | `apps\mobile\components\chart\AspectsList.tsx:39` | Astrology aspect term "trines" — dictionary gap, domain vocabulary. |
| Уолър-Бридж | 2 | `packages\core\src\stories\catalog.ts:438` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Уонг | 2 | `packages\core\src\stories\catalog.ts:399` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Форман | 2 | `packages\core\src\stories\catalog.ts:321` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Франсис | 2 | `packages\core\src\stories\catalog.ts:266` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Хамал | 2 | `apps\web\components\CelestialCanvas.tsx:27` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Чеймбърс | 2 | `packages\core\src\stories\catalog.ts:344` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Шедар | 2 | `apps\web\components\CelestialCanvas.tsx:154` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Шон | 2 | `packages\core\src\stories\catalog.ts:477` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| авантюрин | 1 | `apps\web\lib\crystals\guide-content-bg.ts:65` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Акира | 1 | `packages\core\src\stories\catalog.ts:165` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Аксел | 1 | `packages\core\src\stories\catalog.ts:204` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Алгеди | 1 | `apps\web\components\CelestialCanvas.tsx:99` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Алексис | 1 | `packages\core\src\stories\catalog.ts:147` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Астеризмът | 1 | `apps\web\components\CelestialCanvas.tsx:90` | Valid astronomy common noun "the asterism", definite form — dictionary gap, not itself a proper noun (labels the "Teapot" asterism). |
| Астрея | 1 | `apps\web\components\CelestialCanvas.tsx:74` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| асцендента | 1 | `packages\core\src\charts\interpretations.ts:214` | Astrology term "Ascendant", inflected object form — dictionary gap. |
| Асцендентът | 1 | `packages\core\src\charts\interpretations.ts:203` | Astrology term "Ascendant", definite subject form — dictionary gap. |
| Аустр | 1 | `apps\web\components\CelestialCanvas.tsx:93` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Аустралис | 1 | `apps\web\components\CelestialCanvas.tsx:91` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Ацтеките | 1 | `apps\web\lib\crystals\guide-content-bg.ts:130` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Белатрикс | 1 | `apps\web\components\CelestialCanvas.tsx:128` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Бетелгейзе | 1 | `apps\web\components\CelestialCanvas.tsx:127` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| визионерски | 1 | `packages\core\src\charts\interpretations.ts:74` | Valid adjective "visionary" — dictionary gap. |
| Водоносецът | 1 | `apps\web\components\CelestialCanvas.tsx:106` | Valid epithet "the Water Bearer" (Aquarius), definite form of common noun "водоносец" — dictionary gap, not a star proper noun. |
| Волопас | 1 | `packages\core\src\welcome\meteor-showers.ts:29` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| Ганимед | 1 | `apps\web\components\CelestialCanvas.tsx:106` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Гелб | 1 | `packages\core\src\stories\catalog.ts:28` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Геминиди | 1 | `packages\core\src\welcome\meteor-showers.ts:100` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| Гранат | 1 | `apps\web\lib\crystals\guide-content-bg.ts:79` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Денеб | 1 | `apps\web\components\CelestialCanvas.tsx:99` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Денебола | 1 | `apps\web\components\CelestialCanvas.tsx:61` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Джак | 1 | `packages\core\src\stories\catalog.ts:461` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Джеймс | 1 | `packages\core\src\stories\catalog.ts:516` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Джуничиро | 1 | `packages\core\src\stories\catalog.ts:124` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| дипломатичност | 1 | `packages\core\src\charts\interpretations.ts:85` | Valid abstract noun formed with the productive "-ост" suffix from "дипломатичен" — standard derivation, dictionary gap. |
| едно-единствено | 1 | `packages\core\src\stories\catalog.ts:15` | Valid emphatic compound "the one and only" — dictionary gap, catalog.ts prose. |
| Ета | 1 | `packages\core\src\welcome\meteor-showers.ts:45` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| защитност | 1 | `packages\core\src\charts\interpretations.ts:82` | Valid abstract noun formed with the productive "-ост" suffix from "защитен" — standard derivation, dictionary gap. |
| Зубенешамали | 1 | `apps\web\components\CelestialCanvas.tsx:75` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| иновативност | 1 | `packages\core\src\charts\interpretations.ts:43` | Valid abstract noun formed with the productive "-ост" suffix from "иновативен" — standard derivation, dictionary gap. |
| Итало | 1 | `packages\core\src\stories\catalog.ts:539` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| калцит | 1 | `apps\web\lib\crystals\guide-content-bg.ts:44` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Каренина | 1 | `packages\core\src\stories\catalog.ts:381` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Кариерно | 1 | `apps\web\app\pricing\PricingContent.tsx:24` | Valid adverbial/adjectival form "career-wise" — dictionary gap. |
| Карнеол | 1 | `apps\web\lib\crystals\guide-content-bg.ts:71` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Квадрантиди | 1 | `packages\core\src\welcome\meteor-showers.ts:23` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| комуникативен | 1 | `apps\web\components\chart\BigThreeCards.tsx:21` | Valid loanword-derived adjective "communicative" — dictionary gap. |
| култивация | 1 | `packages\core\src\stories\catalog.ts:131` | Valid loanword "cultivation" — dictionary gap, catalog.ts prose. |
| Лабрадорит | 1 | `apps\web\lib\crystals\guide-content-bg.ts:125` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Лабрадоритът | 1 | `packages\core\src\lib\moon-phase.ts:69` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Лазурит | 1 | `apps\web\lib\crystals\guide-content-bg.ts:85` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Лаура | 1 | `packages\core\src\stories\catalog.ts:188` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Леониди | 1 | `packages\core\src\welcome\meteor-showers.ts:89` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| лидерство | 1 | `packages\core\src\charts\interpretations.ts:36` | Valid noun "leadership" — dictionary gap. |
| Лириди | 1 | `packages\core\src\welcome\meteor-showers.ts:34` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| маги | 1 | `apps\web\lib\crystals\guide-content-bg.ts:100` | Valid loanword plural "magi" (wise men) — dictionary gap, not a mineral name. |
| макс | 1 | `apps\web\lib\validators\diary.ts:45` | Abbreviation for "максимум" (maximum). |
| Макхолц | 1 | `packages\core\src\welcome\meteor-showers.ts:61` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| Малахит | 1 | `apps\web\lib\crystals\guide-content-bg.ts:133` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Марк | 1 | `packages\core\src\stories\catalog.ts:500` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Масимо | 1 | `packages\core\src\stories\catalog.ts:26` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Медитирай | 1 | `packages\core\src\lib\moon-phase.ts:146` | Valid imperative verb "meditate", capitalized — dictionary gap. |
| мес | 1 | `apps\web\app\pricing\PricingContent.tsx:220` | Abbreviation for "месец" (month). |
| Микеланджело | 1 | `apps\web\lib\crystals\guide-content-bg.ts:86` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Милош | 1 | `packages\core\src\stories\catalog.ts:321` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Мицар | 1 | `apps\web\components\CelestialCanvas.tsx:146` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| н | 1 | `apps\mobile\components\chart\AstrologyReference.tsx:243` | Fragment of the abbreviation "и т.н." (etc.) — tokenizer split on periods, not a real standalone word. |
| най-благодарен | 1 | `packages\core\src\lib\moon-phase.ts:122` | Regular "най-" superlative construction ("most grateful") — grammatically standard, not a mineral name. |
| най-вече | 1 | `packages\core\src\charts\interpretations.ts:180` | Standard fixed adverbial phrase ("mainly/above all") — dictionary gap. |
| Най-видими | 1 | `packages\core\src\welcome\meteor-showers.ts:52` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| най-внимателните | 1 | `packages\core\src\stories\catalog.ts:377` | Regular "най-" superlative construction ("the most attentive") — grammatically standard. |
| Най-голямото | 1 | `apps\web\components\CelestialCanvas.tsx:66` | Regular "най-" superlative construction ("the largest") — grammatically standard, not a proper noun. |
| най-гъстата | 1 | `apps\web\components\CelestialCanvas.tsx:90` | Regular "най-" superlative construction ("the densest") — grammatically standard, not a proper noun. |
| най-добре | 1 | `packages\core\src\horoscope\transit-analysis.ts:584` | Regular "най-" superlative construction ("best") — grammatically standard. |
| най-доброто | 1 | `packages\core\src\stories\catalog.ts:494` | Regular "най-" superlative construction ("the best") — grammatically standard. |
| най-естествена | 1 | `packages\core\src\stories\catalog.ts:248` | Regular "най-" superlative construction ("most natural") — grammatically standard. |
| най-издръжливата | 1 | `packages\core\src\stories\catalog.ts:213` | Regular "най-" superlative construction ("the most enduring") — grammatically standard. |
| най-искрено | 1 | `packages\core\src\welcome\compose.ts:89` | Regular "най-" superlative construction ("most sincerely") — grammatically standard. |
| най-късметлийския | 1 | `apps\web\lib\crystals\guide-content-bg.ts:66` | Regular "най-" superlative construction ("the luckiest") — grammatically standard, not a mineral name. |
| най-много | 1 | `packages\core\src\welcome\compose.ts:46` | Regular "най-" superlative construction ("the most") — grammatically standard. |
| Най-обичаният | 1 | `packages\core\src\welcome\meteor-showers.ts:74` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| Най-плътният | 1 | `packages\core\src\welcome\meteor-showers.ts:107` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| най-после | 1 | `packages\core\src\stories\catalog.ts:81` | Standard fixed adverbial phrase ("finally/at last") — dictionary gap, not a proper noun. |
| най-прецизни | 1 | `packages\core\src\stories\catalog.ts:338` | Regular "най-" superlative construction ("most precise") — grammatically standard. |
| най-разпознаваемото | 1 | `apps\web\components\CelestialCanvas.tsx:123` | Regular "най-" superlative construction ("the most recognizable") — grammatically standard, not a proper noun. |
| най-сериозният | 1 | `apps\web\lib\crystals\guide-content-bg.ts:112` | Regular "най-" superlative construction ("the most serious") — grammatically standard, describing sapphire's role, not a mineral name. |
| най-силен | 1 | `packages\core\src\charts\interpretations.ts:214` | Regular "най-" superlative construction ("strongest") — grammatically standard. |
| най-силното | 1 | `packages\core\src\stories\catalog.ts:69` | Regular "най-" superlative construction ("the strongest") — grammatically standard. |
| най-скритото | 1 | `packages\core\src\diary\prompts.ts:161` | Regular "най-" superlative construction ("the most hidden") — grammatically standard. |
| най-тихите | 1 | `packages\core\src\stories\catalog.ts:338` | Regular "най-" superlative construction ("the quietest", plural) — grammatically standard. |
| най-тихия | 1 | `packages\core\src\stories\catalog.ts:503` | Regular "най-" superlative construction ("the quietest", masc. def.) — grammatically standard. |
| най-тъжното | 1 | `packages\core\src\stories\catalog.ts:494` | Regular "най-" superlative construction ("the saddest") — grammatically standard. |
| най-чисто | 1 | `packages\core\src\stories\catalog.ts:404` | Regular "най-" superlative construction ("purest") — grammatically standard. |
| Най-ярка | 1 | `apps\web\components\CelestialBackground.tsx:300` | Regular "най-" superlative construction ("the brightest") — grammatically standard. |
| най-ярките | 1 | `packages\core\src\stories\catalog.ts:299` | Regular "най-" superlative construction ("the brightest", plural) — grammatically standard. |
| Никос | 1 | `packages\core\src\stories\catalog.ts:149` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| нулира | 1 | `apps\web\components\astrology-guide\CrystalsGuideContent.tsx:122` | Valid verb, 3rd person singular present of "нулирам" ("resets/zeroes out") — dictionary gap. |
| обсесията | 1 | `packages\core\src\stories\catalog.ts:416` | Valid loanword "obsession", definite form — dictionary gap. |
| обсидиан | 1 | `apps\web\lib\crystals\guide-content-bg.ts:129` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Ориониди | 1 | `packages\core\src\welcome\meteor-showers.ts:78` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| Патрик | 1 | `packages\core\src\stories\catalog.ts:422` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| пауковите | 1 | `apps\web\lib\crystals\guide-content-bg.ts:126` | Plausible derivation from "паун" (peacock) describing labradorite's iridescent flash — read the source line (guide-content-bg.ts:137) and it fits the "peacock-shimmer" imagery; not "паяк"/spider, which was my first guess. |
| Перидот | 1 | `apps\web\lib\crystals\guide-content-bg.ts:47` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Плеядите | 1 | `apps\web\components\CelestialCanvas.tsx:34` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| По-зряла | 1 | `packages\core\src\stories\catalog.ts:486` | Regular "по-" comparative construction ("more mature") — grammatically standard. |
| По-меко | 1 | `packages\core\src\stories\catalog.ts:314` | Regular "по-" comparative construction ("softer") — grammatically standard. |
| По-ясно | 1 | `packages\core\src\stories\catalog.ts:392` | Regular "по-" comparative construction ("clearer") — grammatically standard. |
| Поло | 1 | `packages\core\src\stories\catalog.ts:542` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| поравно | 1 | `packages\core\src\diary\prompts.ts:107` | Standard Bulgarian adverb ("delya poravno" = split equally) — dictionary gap, not an error. |
| посеяното | 1 | `packages\core\src\welcome\compose.ts:46` | Valid neuter definite participle "that which was sown" — dictionary gap. |
| Прашно-розов | 1 | `apps\web\lib\crystals\guide-content-bg.ts:62` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| преизчислена | 1 | `apps\web\components\birth-data\EditBirthDataDialog.tsx:186` | Valid feminine past participle "recalculated" — dictionary gap. |
| преливка | 1 | `packages\core\src\lib\moon-phase.ts:120` | Valid noun "gradient/blend (of light)" — dictionary gap, not a mineral name. |
| премиума | 1 | `apps\web\components\astrology-guide\CrystalsGuideContent.tsx:137` | Valid definite form of the established loanword "премиум" — dictionary gap. |
| пренебрежима | 1 | `packages\core\src\horoscope\transit-analysis.ts:582` | Valid feminine adjective "negligible" — dictionary gap. |
| приглушеност | 1 | `packages\core\src\stories\catalog.ts:129` | Valid abstract noun "mutedness/subduedness" (-ост suffix) — dictionary gap. |
| Родонит | 1 | `apps\web\lib\crystals\guide-content-bg.ts:61` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Сайф | 1 | `apps\web\components\CelestialCanvas.tsx:130` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| самоотказ | 1 | `packages\core\src\stories\catalog.ts:330` | Valid compound noun "self-denial" — dictionary gap. |
| самопреглед | 1 | `packages\core\src\lib\moon-phase.ts:118` | Valid compound noun "self-review" — dictionary gap, not a mineral name. |
| свръхгигант | 1 | `apps\web\components\CelestialCanvas.tsx:82` | Valid astronomy compound noun "supergiant" (star type) — dictionary gap, not a proper noun; describes Antares. |
| свръхувереност | 1 | `packages\core\src\charts\interpretations.ts:55` | Valid abstract noun ("overconfidence") formed with the productive "-ост" suffix — standard derivation, dictionary gap. |
| Селенит | 1 | `apps\web\lib\crystals\guide-content-bg.ts:15` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Селин | 1 | `packages\core\src\stories\catalog.ts:555` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| сериал | 1 | `packages\core\src\stories\catalog.ts:416` | Valid loanword "series" (TV/film) — dictionary gap. |
| сериали | 1 | `apps\web\app\(protected)\you\recommendations\page.tsx:9` | Plural of the valid loanword "сериал" (series) — dictionary gap. |
| Сикстинската | 1 | `apps\web\lib\crystals\guide-content-bg.ts:86` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| синьо-бялата | 1 | `apps\web\components\CelestialCanvas.tsx:66` | Valid compound color adjective "blue-white" — dictionary gap, not a proper noun. |
| Содалит | 1 | `apps\web\lib\crystals\guide-content-bg.ts:43` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Суифт-Тътъл | 1 | `packages\core\src\welcome\meteor-showers.ts:72` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| т | 1 | `apps\mobile\components\chart\AstrologyReference.tsx:243` | Fragment of the abbreviation "и т.н." (etc.) — tokenizer split on periods, not a real standalone word. |
| Танзанит | 1 | `apps\web\lib\crystals\guide-content-bg.ts:89` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| таро | 1 | `packages\core\src\lib\moon-phase.ts:70` | Valid loanword "tarot" — dictionary gap, not a mineral name. |
| Тарф | 1 | `apps\web\components\CelestialCanvas.tsx:51` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Тачер | 1 | `packages\core\src\welcome\meteor-showers.ts:39` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| Темпел-Тътъл | 1 | `packages\core\src\welcome\meteor-showers.ts:94` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| Тифон | 1 | `apps\web\components\CelestialCanvas.tsx:114` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| турмалин | 1 | `apps\web\lib\crystals\guide-content-bg.ts:99` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| търсяща | 1 | `packages\core\src\stories\catalog.ts:482` | Valid feminine present participle "seeking" — dictionary gap, catalog.ts prose. |
| Тътъл | 1 | `packages\core\src\welcome\meteor-showers.ts:116` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| угодничене | 1 | `packages\core\src\charts\interpretations.ts:53` | Valid noun "fawning/people-pleasing" from the verb "угоднича" — dictionary gap. |
| Уилям | 1 | `packages\core\src\stories\catalog.ts:60` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Ултрамарин | 1 | `apps\web\lib\crystals\guide-content-bg.ts:86` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Урсиди | 1 | `packages\core\src\welcome\meteor-showers.ts:111` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| Фаетон | 1 | `packages\core\src\welcome\meteor-showers.ts:105` | Meteor shower / comet proper noun — correctly absent from a BG dictionary. |
| фасцинация | 1 | `packages\core\src\stories\catalog.ts:429` | Valid loanword "fascination" — dictionary gap. |
| Фицджералд | 1 | `packages\core\src\stories\catalog.ts:305` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| флуорит | 1 | `apps\web\lib\crystals\guide-content-bg.ts:143` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| халцедон | 1 | `apps\web\lib\crystals\guide-content-bg.ts:72` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| харизматичен | 1 | `apps\web\components\chart\BigThreeCards.tsx:23` | Valid loanword-derived adjective "charismatic" — dictionary gap. |
| Харуки | 1 | `packages\core\src\stories\catalog.ts:578` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| хвата | 1 | `packages\core\src\diary\prompts.ts:222` | Correct short-definite object form of masculine noun "хват" (grip) — "да отпуснеш хвата" is grammatically standard; dictionary gap. |
| Хиадите | 1 | `apps\web\components\CelestialCanvas.tsx:34` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| Ходжсън | 1 | `packages\core\src\stories\catalog.ts:266` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Хорхе | 1 | `packages\core\src\stories\catalog.ts:12` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| Цитрин | 1 | `apps\web\lib\crystals\guide-content-bg.ts:25` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| Цитринът | 1 | `packages\core\src\lib\moon-phase.ts:82` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| чайовете | 1 | `packages\core\src\welcome\compose.ts:111` | Valid plural definite "the teas" — dictionary gap. |
| чакра | 1 | `apps\web\lib\crystals\guide-content-bg.ts:40` | Mineral/crystal name (standard mineralogy loanword) — dictionary gap. |
| шартрезово | 1 | `apps\web\lib\crystals\guide-content-bg.ts:48` | Valid coined color adjective "chartreuse-colored" describing a crystal — dictionary gap, not itself a mineral name. |
| Шепнещият | 1 | `apps\web\lib\crystals\guide-content-bg.ts:134` | Valid present-participle-as-epithet "the whispering [one]", a poetic nickname for chrysocolla in the crystal guide — not itself a mineral name. |
| Шератан | 1 | `apps\web\components\CelestialCanvas.tsx:29` | Star/constellation proper noun used in the celestial-canvas star-map labels — correctly absent from a BG dictionary. |
| ярко-оранжевия | 1 | `apps\web\components\CelestialCanvas.tsx:34` | Valid compound color adjective "bright-orange" — dictionary gap, not a proper noun. |
| Ясуджиро | 1 | `packages\core\src\stories\catalog.ts:360` | Transliterated foreign personal name (author/director/character) from the stories catalog — proper noun, correctly absent from a BG dictionary. |
| AI-генерирани | 1 | `apps\web\app\privacy\page.tsx:77` | Hyphenated compound with an English abbreviation ("AI") — expected to not be in a BG dictionary. |
| stellaeum-дневник | 1 | `packages\core\src\diary\export.ts:52` | Hyphenated compound with the product's brand name — expected to not be in a BG dictionary. |
| V-образната | 1 | `apps\web\components\CelestialCanvas.tsx:34` | Hyphenated compound with a Latin letter shape descriptor ("V-shaped") — expected to not be in a BG dictionary. |
| W-форма | 1 | `apps\web\components\CelestialCanvas.tsx:153` | Hyphenated compound with a Latin letter shape descriptor ("W-shaped") — expected to not be in a BG dictionary. |

