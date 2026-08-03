import type { Metadata } from 'next'
import { YouHub } from '@/components/you/YouHub'

export const metadata: Metadata = {
  title: 'Ти',
  description: 'Твоите колекции, дневник, препоръки и настройки',
}

/**
 * Ти — profile + collections hub per MOBILE_UX_RESEARCH §2.5.
 *
 * Phase A: simple hub linking to existing sub-routes (crystals, manifest,
 * recommendations, astrology-guide). Route consolidation (/you/crystals etc.)
 * is a later Phase A task.
 */
export default function YouPage() {
  return <YouHub />
}
