import type { Metadata } from 'next'
import { YouHub } from '@/components/you/YouHub'
import { isMediaRecommendationsEnabled } from '@/lib/config/featureFlags'
import { loadYouEntryChart } from '@/lib/birth-data/you-entry'

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
export default async function YouPage() {
  // The birth-data edit entry exists only behind FF_BIRTH_DATA_EDIT (off by default).
  const chart = await loadYouEntryChart()
  return <YouHub showRecommendations={isMediaRecommendationsEnabled()} chart={chart} />
}
