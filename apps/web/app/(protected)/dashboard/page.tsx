import { Suspense } from 'react'
import { auth, currentUser } from '@clerk/nextjs/server'
import type { Metadata } from 'next'
import { getCachedLatestChart, getCachedUserTier } from '@/lib/supabase/queries'
import { getCrystalOfTheDay } from '@/lib/crystals/today'
import type { ChartRow } from '@/lib/types/chart'
import type { CrystalOfTheDayResponse } from '@stellaeum/core'
import { DashboardContent } from '../../../components/dashboard/DashboardContent'
import { LoadingAnimation } from '@/components/LoadingAnimation'

export const metadata: Metadata = {
  title: 'Табло',
  description: 'Твоето астрологично табло с дневен хороскоп и бързи връзки',
}

export default async function DashboardPage() {
  // Middleware already protects this route, but we get user info here
  const { userId } = await auth()
  const user = await currentUser()
  const firstName = user?.firstName || 'Потребител'

  // Prefetch: user chart + tier + today's crystal in parallel.
  // React.cache wrappers dedupe identical calls within the render pass.
  let birthChart: ChartRow | null = null
  let subscriptionTier: 'free' | 'premium' = 'free'
  let crystalOfTheDay: CrystalOfTheDayResponse | null = null

  if (userId) {
    try {
      const [chart, tier, crystal] = await Promise.all([
        getCachedLatestChart(userId),
        getCachedUserTier(userId),
        getCrystalOfTheDay(userId),
      ])
      birthChart = chart as ChartRow | null
      subscriptionTier = tier
      crystalOfTheDay = crystal
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  } else {
    // Unauthenticated path (edge case — layout protects this route but we
    // stay defensive). Still fetch the anonymous crystal-of-the-day so the
    // bento tile renders.
    try {
      crystalOfTheDay = await getCrystalOfTheDay(null)
    } catch (error) {
      console.error('Error fetching anonymous crystal:', error)
    }
  }

  return (
    <Suspense fallback={<div className="flex justify-center py-20"><LoadingAnimation /></div>}>
      <DashboardContent
        firstName={firstName}
        initialBirthChart={birthChart}
        subscriptionTier={subscriptionTier}
        initialCrystalOfTheDay={crystalOfTheDay}
      />
    </Suspense>
  )
}
