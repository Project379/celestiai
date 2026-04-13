import { auth, currentUser } from '@clerk/nextjs/server'
import type { Metadata } from 'next'
import { getCachedLatestChart, getCachedUserTier } from '@/lib/supabase/queries'
import type { ChartRow } from '@/lib/types/chart'

export const metadata: Metadata = {
  title: 'Табло',
  description: 'Твоето астрологично табло с дневен хороскоп и бързи връзки',
}
import { UserMenu } from '../../../components/auth/UserMenu'
import { SessionExpiryModal } from '../../../components/auth/SessionExpiryModal'
import { DashboardContent } from '../../../components/dashboard/DashboardContent'

export default async function DashboardPage() {
  // Middleware already protects this route, but we get user info here
  const { userId } = await auth()
  const user = await currentUser()
  const firstName = user?.firstName || 'Потребител'

  // Fetch user's birth data and subscription tier
  // Uses React.cache() — deduped with layout-level fetches in the same render pass
  let birthChart: ChartRow | null = null
  let subscriptionTier: 'free' | 'premium' = 'free'
  if (userId) {
    try {
      const [chart, tier] = await Promise.all([
        getCachedLatestChart(userId),
        getCachedUserTier(userId),
      ])
      birthChart = chart as ChartRow | null
      subscriptionTier = tier
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const priceMonthly = process.env.STRIPE_PRICE_MONTHLY ?? ''

  return (
    <>
      {/* Session expiry modal (client component) */}
      <SessionExpiryModal />

      {/* User menu in header slot */}
      <div className="fixed right-4 top-4 z-50 sm:right-8">
        <UserMenu />
      </div>

      {/* Dashboard content */}
      <DashboardContent
        firstName={firstName}
        initialBirthChart={birthChart}
        subscriptionTier={subscriptionTier}
        priceMonthly={priceMonthly}
      />
    </>
  )
}
