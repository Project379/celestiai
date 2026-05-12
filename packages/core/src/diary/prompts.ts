import type { LunarPhaseId } from '../lib/moon-phase'

// Structured 3-field diary exercise for the /rhythm/journal writing surface.
// Distinct from `phase.journalPrompt` in packages/core/src/lib/moon-phase.ts
// (single reflective question on the /rhythm lunar-phase card) — separation
// is intentional: different surfaces, different modalities (active writing
// vs passive reflection). Do not consolidate without reviewing both surfaces.

/**
 * Phase-specific diary prompts. Three fields per phase — the user writes
 * three intentions (or reflections, or gratitudes — depending on phase).
 *
 * Rhythm: waxing phases ask for forward-looking intentions;
 * пълнолуние and waning phases ask for reflection and release.
 *
 * Each phase has 1+ prompt variants. Rotation happens in getManifestPrompt
 * via modulo over the user's entry count for that phase: entry 0 sees
 * variant 0, entry 1 sees variant 1, …, wrapping back to variant 0 when
 * entries exceed variant count. The tuple type `[ManifestPrompt, ...]`
 * guarantees non-empty arrays at compile time; the runtime assertion in
 * getManifestPrompt is belt-and-suspenders for a load-bearing function.
 *
 * Voice-baseline doc: apps/web/lib/manifest/PROMPT_VOICE.md.
 * Generation basis: bulgarian-skill SHA e700c13 (pinned during §8.8).
 */
export interface ManifestPrompt {
  heading: string
  lead: string
  fieldLabels: [string, string, string]
  placeholders: [string, string, string]
}

type ManifestPromptVariants = readonly [ManifestPrompt, ...ManifestPrompt[]]

export const MANIFEST_PROMPTS: Record<LunarPhaseId, ManifestPromptVariants> = {
  new: [
    {
      heading: 'Три намерения',
      lead: 'Новолунието е чист лист. Запиши три намерения — ясни, лични, истински. Цикълът напред ще ги понесе.',
      fieldLabels: ['Първо намерение', 'Второ намерение', 'Трето намерение'],
      placeholders: [
        'Искам да...',
        'Канен/а съм да...',
        'Отварям място за...',
      ],
    },
    {
      heading: 'Три семена',
      lead: 'Новолунието е тъмно поле. Посей три семена — малки, тихи, истински. Земята знае какво да прави с тях.',
      fieldLabels: ['Засявам', 'Подхранвам', 'Вярвам'],
      placeholders: [
        'Засявам семе от...',
        'Подхранвам...',
        'Вярвам, че ще...',
      ],
    },
    {
      heading: 'Три въпроса',
      lead: 'Новолунието още не говори. Запиши три въпроса — неща, които оставяш отворени за цикъла напред.',
      fieldLabels: ['Питам се', 'Чудя се', 'Търся'],
      placeholders: [
        'Питам се защо...',
        'Чудя се дали...',
        'Търся отговор на...',
      ],
    },
  ],
  waxing_crescent: [
    {
      heading: 'Три първи стъпки',
      lead: 'Светлината расте. Запиши три малки стъпки — нещо, което можеш да направиш в следващите дни, за да подхраниш намеренията от новолунието.',
      fieldLabels: ['Първа стъпка', 'Втора стъпка', 'Трета стъпка'],
      placeholders: [
        'Днес мога да...',
        'Тази седмица ще...',
        'Започвам с...',
      ],
    },
    {
      heading: 'Три обещания',
      lead: 'Светлината расте бавно. Запиши три обещания към себе си — малки, искрени, твои — за дните, които идват.',
      fieldLabels: ['Обещавам', 'Започвам', 'Държа'],
      placeholders: [
        'Обещавам да...',
        'Започвам с...',
        'Държа на...',
      ],
    },
    {
      heading: 'Три радости',
      lead: 'Светлината се завръща. Запиши три радости — малки, нови, едва видими.',
      fieldLabels: ['Радвам се на', 'Забелязвам', 'Усещам'],
      placeholders: [
        'Радвам се на...',
        'Забелязвам...',
        'Усещам...',
      ],
    },
  ],
  first_quarter: [
    {
      heading: 'Три решения',
      lead: 'Половин светлина, половин сянка. Напиши три решения, които те приближават до целта — включително онези, които отлагаш.',
      fieldLabels: ['Решавам да', 'Отказвам се от', 'Избирам'],
      placeholders: [
        'Решавам да...',
        'Отказвам се от...',
        'Избирам да...',
      ],
    },
    {
      heading: 'Три граници',
      lead: 'Половин светлина, половин сянка. Запиши три граници — какво допускаш в живота си, и какво — не.',
      fieldLabels: ['Приемам', 'Отказвам', 'Защитавам'],
      placeholders: [
        'Приемам...',
        'Отказвам да...',
        'Защитавам...',
      ],
    },
    {
      heading: 'Три опори',
      lead: 'Половината път е зад теб. Запиши три опори — какво те държи изправен/а, когато светлина и сянка се делят поравно.',
      fieldLabels: ['Стъпвам на', 'Облягам се на', 'Държа се за'],
      placeholders: [
        'Стъпвам на...',
        'Облягам се на...',
        'Държа се за...',
      ],
    },
  ],
  waxing_gibbous: [
    {
      heading: 'Три настройки',
      lead: 'Пълнолунието е близо. Какво трябва да се коригира, преди светлината да стане пълна? Запиши три неща за усъвършенстване.',
      fieldLabels: ['Настройвам', 'Подобрявам', 'Подготвям'],
      placeholders: [
        'Настройвам...',
        'Подобрявам...',
        'Подготвям се за...',
      ],
    },
    {
      heading: 'Три надежди',
      lead: 'Пълнолунието наближава. Запиши три надежди — какво искаш да намериш в пълната светлина.',
      fieldLabels: ['Надявам се', 'Очаквам', 'Каня'],
      placeholders: [
        'Надявам се да...',
        'Очаквам...',
        'Каня...',
      ],
    },
    {
      heading: 'Три врати',
      lead: 'Пълнолунието идва с пълни ръце. Запиши три врати — какво искаш да отвориш, за да премине светлината.',
      fieldLabels: ['Отварям', 'Пускам да влезе', 'Посрещам'],
      placeholders: [
        'Отварям врата за...',
        'Пускам да влезе...',
        'Посрещам...',
      ],
    },
  ],
  full: [
    {
      heading: 'Три благодарности',
      lead: 'Пълнолунието осветява всичко. Запиши три неща, за които си благодарен/на в този цикъл — постижения, срещи, уроци.',
      fieldLabels: ['Благодаря за', 'Празнувам', 'Признавам'],
      placeholders: [
        'Благодарен/на съм за...',
        'Празнувам...',
        'Признавам в себе си...',
      ],
    },
    {
      heading: 'Три открития',
      lead: 'Пълнолунието осветява и най-скритото. Запиши три открития — неща, които виждаш ясно едва сега.',
      fieldLabels: ['Виждам', 'Осъзнавам', 'Приемам'],
      placeholders: [
        'Виждам, че...',
        'Осъзнавам...',
        'Приемам...',
      ],
    },
    {
      heading: 'Три истини',
      lead: 'Пълнолунието не оставя сянка. Запиши три истини — каквото вече не можеш да отречеш.',
      fieldLabels: ['Знам', 'Потвърждавам', 'Не отричам'],
      placeholders: [
        'Знам, че...',
        'Потвърждавам...',
        'Не отричам...',
      ],
    },
  ],
  waning_gibbous: [
    {
      heading: 'Три урока',
      lead: 'Светлината започва да намалява. Какво научи в този цикъл? Запиши три урока, които искаш да запомниш.',
      fieldLabels: ['Научих', 'Разбрах', 'Приемам'],
      placeholders: [
        'Научих, че...',
        'Разбрах защо...',
        'Приемам, че...',
      ],
    },
    {
      heading: 'Три спомена',
      lead: 'Пълнолунието вече отминава. Запиши три спомена от този цикъл — моменти, които искаш да задържиш.',
      fieldLabels: ['Помня', 'Нося', 'Връщам се към'],
      placeholders: [
        'Помня как...',
        'Нося в себе си...',
        'Връщам се към...',
      ],
    },
    {
      heading: 'Три реколти',
      lead: 'Светлината бавно се прибира. Запиши три реколти — какво отнасяш със себе си от този цикъл.',
      fieldLabels: ['Жъна', 'Прибирам', 'Запазвам'],
      placeholders: [
        'Жъна от...',
        'Прибирам...',
        'Запазвам...',
      ],
    },
  ],
  // last_quarter has 2 variants (not 3): during §8.8 generation, the design space
  // for a third angle between variant-0 (освобождавания / farewells) and variant-1
  // (прошки / forgivenesses) collapsed to a weak-variant candidate. Per §8.0's
  // "register consistency over mechanical variety" principle, we ship 2 strong
  // variants rather than 3 with one forced. The rotation formula handles this
  // automatically via variants.length modulo. Adding a third variant in the future
  // is a forward-only change (doesn't break existing entries' rotation state).
  last_quarter: [
    {
      heading: 'Три освобождавания',
      lead: 'Време е да отпуснеш хвата. Запиши три неща, с които се сбогуваш преди новия цикъл — навик, страх, очакване.',
      fieldLabels: ['Пускам', 'Сбогувам се с', 'Освобождавам'],
      placeholders: [
        'Пускам...',
        'Сбогувам се с...',
        'Освобождавам се от...',
      ],
    },
    {
      heading: 'Три прошки',
      lead: 'Светлината продължава да намалява. Запиши три прошки — на себе си, на други, на неща, които не станаха.',
      fieldLabels: ['Прощавам на', 'Прощавам за', 'Оставям'],
      placeholders: [
        'Прощавам на...',
        'Прощавам за...',
        'Оставям...',
      ],
    },
  ],
  waning_crescent: [
    {
      heading: 'Три акта на грижа',
      lead: 'Почивка преди новото начало. Запиши три неща, които ще направиш за себе си в идните дни — меки, бавни, реставриращи.',
      fieldLabels: ['Подхранвам', 'Почивам в', 'Връщам си'],
      placeholders: [
        'Подхранвам се с...',
        'Ще почина в...',
        'Връщам си...',
      ],
    },
    {
      heading: 'Три тишини',
      lead: 'Последните лъчи. Запиши три тишини — места, моменти или въпроси, които приемаш да държиш в мълчание.',
      fieldLabels: ['Мълча', 'Слушам', 'Чакам'],
      placeholders: [
        'Мълча за...',
        'Слушам...',
        'Чакам...',
      ],
    },
    {
      heading: 'Три завръщания',
      lead: 'Нощта преди новото начало. Запиши три завръщания — къде или при кого се прибираш, преди да започне нов цикъл.',
      fieldLabels: ['Прибирам се в', 'Помня пътя към', 'Срещам отново'],
      placeholders: [
        'Прибирам се в...',
        'Помня пътя към...',
        'Срещам отново...',
      ],
    },
  ],
}

/**
 * Returns the prompt variant for a given phase based on how many entries
 * the user has already written for that phase. Rotation: entry count N
 * receives variant N mod variants.length, so users cycle through all
 * variants before repeating.
 *
 * The runtime assertion is defensive — the tuple type already guarantees
 * non-empty arrays at compile time — but this is a load-bearing function
 * and the cost of the check is negligible.
 */
export function getManifestPrompt(
  phaseId: LunarPhaseId,
  entryCountForPhase: number,
): ManifestPrompt {
  const variants = MANIFEST_PROMPTS[phaseId]
  if (variants.length === 0) {
    throw new Error(`No prompt variants registered for phase ${phaseId}`)
  }
  return variants[entryCountForPhase % variants.length]
}
