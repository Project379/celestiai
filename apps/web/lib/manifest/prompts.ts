import type { LunarPhaseId } from '@/lib/moon-phase'

/**
 * Phase-specific diary prompts. Three fields per phase — the user writes
 * three intentions (or reflections, or gratitudes — depending on phase).
 *
 * Rhythm: waxing phases ask for forward-looking intentions;
 * пълнолуние and waning phases ask for reflection and release.
 */
export interface ManifestPrompt {
  heading: string
  lead: string
  fieldLabels: [string, string, string]
  placeholders: [string, string, string]
}

export const MANIFEST_PROMPTS: Record<LunarPhaseId, ManifestPrompt> = {
  new: {
    heading: 'Три намерения',
    lead: 'Новолунието е чист лист. Запиши три намерения — ясни, лични, истински. Цикълът напред ще ги понесе.',
    fieldLabels: ['Първо намерение', 'Второ намерение', 'Трето намерение'],
    placeholders: [
      'Искам да...',
      'Канен/а съм да...',
      'Отварям място за...',
    ],
  },
  waxing_crescent: {
    heading: 'Три първи стъпки',
    lead: 'Светлината расте. Запиши три малки стъпки — нещо, което можеш да направиш в следващите дни, за да подхраниш намеренията от новолунието.',
    fieldLabels: ['Първа стъпка', 'Втора стъпка', 'Трета стъпка'],
    placeholders: [
      'Днес мога да...',
      'Тази седмица ще...',
      'Започвам с...',
    ],
  },
  first_quarter: {
    heading: 'Три решения',
    lead: 'Половин светлина, половин сянка. Напиши три решения, които те приближават до целта — включително онези, които отлагаш.',
    fieldLabels: ['Решавам да', 'Отказвам се от', 'Избирам'],
    placeholders: [
      'Решавам да...',
      'Отказвам се от...',
      'Избирам да...',
    ],
  },
  waxing_gibbous: {
    heading: 'Три настройки',
    lead: 'Пълнолунието е близо. Какво трябва да се коригира, преди светлината да стане пълна? Запиши три неща за усъвършенстване.',
    fieldLabels: ['Настройвам', 'Подобрявам', 'Подготвям'],
    placeholders: [
      'Настройвам...',
      'Подобрявам...',
      'Подготвям се за...',
    ],
  },
  full: {
    heading: 'Три благодарности',
    lead: 'Пълнолунието осветява всичко. Запиши три неща, за които си благодарен/на в този цикъл — постижения, срещи, уроци.',
    fieldLabels: ['Благодаря за', 'Честувам', 'Признавам'],
    placeholders: [
      'Благодарен/на съм за...',
      'Празнувам...',
      'Признавам в себе си...',
    ],
  },
  waning_gibbous: {
    heading: 'Три урока',
    lead: 'Светлината започва да намалява. Какво научи в този цикъл? Запиши три урока, които искаш да запомниш.',
    fieldLabels: ['Научих', 'Разбрах', 'Приемам'],
    placeholders: [
      'Научих, че...',
      'Разбрах защо...',
      'Приемам, че...',
    ],
  },
  last_quarter: {
    heading: 'Три освобождавания',
    lead: 'Време е да пуснеш. Запиши три неща, с които се сбогуваш преди новия цикъл — навик, страх, очакване.',
    fieldLabels: ['Пускам', 'Сбогувам се с', 'Освобождавам'],
    placeholders: [
      'Пускам...',
      'Сбогувам се с...',
      'Освобождавам се от...',
    ],
  },
  waning_crescent: {
    heading: 'Три акта на грижа',
    lead: 'Почивка преди новото начало. Запиши три неща, които ще направиш за себе си в идните дни — меки, бавни, реставриращи.',
    fieldLabels: ['Подхранвам', 'Почивам в', 'Връщам си'],
    placeholders: [
      'Подхранвам се с...',
      'Ще почина в...',
      'Връщам си...',
    ],
  },
}

export function getManifestPrompt(phaseId: LunarPhaseId): ManifestPrompt {
  return MANIFEST_PROMPTS[phaseId]
}
