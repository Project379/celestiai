import type { Metadata } from 'next'
import { YouHub } from '@/components/you/YouHub'
import { auth } from '@clerk/nextjs/server'
import { isMediaRecommendationsEnabled } from '@/lib/config/featureFlags'
import { getCachedLatestChart } from '@/lib/supabase/queries'
import type { ChartRow } from '@/lib/types/chart'

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
  // The active (latest) chart, for the birth-data edit entry. A DB hiccup or no
  // chart just hides that row; the rest of the hub still renders.
  let chart: ChartRow | null = null
  try {
    const { userId } = await auth()
    if (userId) chart = (await getCachedLatestChart(userId)) as ChartRow | null
  } catch {
    chart = null
  }
  return <YouHub showRecommendations={isMediaRecommendationsEnabled()} chart={chart} />
}
