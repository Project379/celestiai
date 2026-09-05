import { auth } from '@clerk/nextjs/server'
import type { Metadata } from 'next'
import { getCachedLatestChart, getCachedUserTier } from '@/lib/supabase/queries'
import type { ChartRow } from '@/lib/types/chart'
import { StoriesContent } from '@/components/stories/StoriesContent'

export const metadata: Metadata = {
  title: 'Препоръки',
  description: 'Дневни филмови и месечни книжни препоръки, водени от лунната фаза, наталната карта и обратната ти връзка.',
}

export default async function RecommendationsPage() {
  const { userId } = await auth()
  let chartId: string | null = null
  let isPremium = false
  if (userId) {
    try {
      const [chart, tier] = await Promise.all([
        getCachedLatestChart(userId) as Promise<ChartRow | null>,
        getCachedUserTier(userId),
      ])
      chartId = chart?.id ?? null
      isPremium = tier === 'premium'
    } catch {
      // The client can still request a lunar-only recommendation.
    }
  }

  return (
    <div className="px-4 pb-16 pt-8 sm:px-6">
      <StoriesContent chartId={chartId} isPremium={isPremium} />
    </div>
  )
}
