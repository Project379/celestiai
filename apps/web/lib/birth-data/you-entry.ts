import { auth } from '@clerk/nextjs/server'
import { isBirthDataEditEnabled } from '@/lib/config/featureFlags'
import { getCachedLatestChart } from '@/lib/supabase/queries'
import type { ChartRow } from '@/lib/types/chart'

/**
 * The chart the web «Ти» hub passes to its birth-data edit entry, or null for
 * "render no entry". With FF_BIRTH_DATA_EDIT off (the default) this returns null
 * WITHOUT querying anything. A DB hiccup or no chart also yields null: the rest
 * of the hub still renders.
 */
export async function loadYouEntryChart(): Promise<ChartRow | null> {
  if (!isBirthDataEditEnabled()) return null
  try {
    const { userId } = await auth()
    if (!userId) return null
    return (await getCachedLatestChart(userId)) as ChartRow | null
  } catch {
    return null
  }
}
