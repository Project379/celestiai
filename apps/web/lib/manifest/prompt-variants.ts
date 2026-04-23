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
}

export const VARIANT_2_PROMPTS: Partial<Record<LunarPhaseId, ManifestPrompt>> = {
  // populated in §8.8 Batch 2
}
