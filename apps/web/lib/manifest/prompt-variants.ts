import type { LunarPhaseId } from '@/lib/moon-phase'
import type { ManifestPrompt } from './prompts'

/**
 * §8.8 prompt variants — staging location prior to the Stage 4
 * library refactor.
 *
 * Until Stage 4 lands, this file holds variant-1 and variant-2 prompts
 * as separate records, partial by design so phases can be populated
 * one at a time as generation batches are approved. When Stage 4
 * refactors MANIFEST_PROMPTS to Record<LunarPhaseId, ManifestPrompt[]>,
 * the existing prompts.ts entries become variant-0 and these records
 * merge in at positions 1 and 2.
 *
 * Skill SHA for generation basis: e700c13 (bulgarian-skill pinned).
 * Voice-baseline doc: apps/web/lib/manifest/PROMPT_VOICE.md.
 *
 * Nothing imports this file until Stage 4 — it is pure staged data.
 */

export const VARIANT_1_PROMPTS: Partial<Record<LunarPhaseId, ManifestPrompt>> = {
  new: {
    heading: 'Три семена',
    lead: 'Новолунието е тъмно поле. Посей три семена — малки, тихи, истински. Земята знае какво да прави с тях.',
    fieldLabels: ['Засявам', 'Подхранвам', 'Вярвам'],
    placeholders: [
      'Засявам семе от...',
      'Подхранвам...',
      'Вярвам, че ще...',
    ],
  },
  waxing_crescent: {
    heading: 'Три обещания',
    lead: 'Светлината расте бавно. Запиши три обещания към себе си — малки, искрени, твои — за дните, които идват.',
    fieldLabels: ['Обещавам', 'Започвам', 'Държа'],
    placeholders: [
      'Обещавам да...',
      'Започвам с...',
      'Държа на...',
    ],
  },
  first_quarter: {
    heading: 'Три граници',
    lead: 'Половин светлина, половин сянка. Запиши три граници — какво допускаш в живота си, и какво — не.',
    fieldLabels: ['Приемам', 'Отказвам', 'Защитавам'],
    placeholders: [
      'Приемам...',
      'Отказвам се да...',
      'Защитавам...',
    ],
  },
  waxing_gibbous: {
    heading: 'Три надежди',
    lead: 'Пълнолунието е на крачка. Запиши три надежди — какво искаш да намериш в пълната светлина.',
    fieldLabels: ['Надявам се', 'Очаквам', 'Каня'],
    placeholders: [
      'Надявам се да...',
      'Очаквам...',
      'Каня...',
    ],
  },
  full: {
    heading: 'Три открития',
    lead: 'Пълнолунието осветява и най-скритото. Запиши три открития — неща, които виждаш ясно едва сега.',
    fieldLabels: ['Виждам', 'Осъзнавам', 'Приемам'],
    placeholders: [
      'Виждам, че...',
      'Осъзнавам...',
      'Приемам...',
    ],
  },
  waning_gibbous: {
    heading: 'Три спомени',
    lead: 'Светлината се връща в себе си. Запиши три спомени от този цикъл — моменти, които искаш да задържиш.',
    fieldLabels: ['Помня', 'Нося', 'Връщам се към'],
    placeholders: [
      'Помня как...',
      'Нося в себе си...',
      'Връщам се към...',
    ],
  },
  last_quarter: {
    heading: 'Три прошки',
    lead: 'Светлината продължава да намалява. Запиши три прошки — на себе си, на други, на неща, които не станаха.',
    fieldLabels: ['Прощавам на', 'Прощавам за', 'Оставям'],
    placeholders: [
      'Прощавам на...',
      'Прощавам за...',
      'Оставям...',
    ],
  },
  waning_crescent: {
    heading: 'Три тишини',
    lead: 'Последните лъчи. Запиши три тишини — места, моменти или въпроси, които приемаш да държиш в мълчание.',
    fieldLabels: ['Мълча', 'Слушам', 'Чакам'],
    placeholders: [
      'Мълча за...',
      'Слушам...',
      'Чакам...',
    ],
  },
}

export const VARIANT_2_PROMPTS: Partial<Record<LunarPhaseId, ManifestPrompt>> = {
  // populated in §8.8 Batch 2
}
