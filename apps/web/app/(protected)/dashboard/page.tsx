import { auth, currentUser } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import type { ChartRow } from '@/lib/types/chart'
import { UserMenu } from '../../../components/auth/UserMenu'
import { SessionExpiryModal } from '../../../components/auth/SessionExpiryModal'
import { DashboardContent } from '../../../components/dashboard/DashboardContent'

export default async function DashboardPage() {
  // Middleware already protects this route, but we get user info here
  const { userId } = await auth()
  const user = await currentUser()
  const firstName = user?.firstName || 'Потребител'

  // Fetch user's birth data and subscription tier
  let birthChart: ChartRow | null = null
  let subscriptionTier = 'free'
  try {
    const supabase = createServiceSupabaseClient()
    const [chartsResult, userResult] = await Promise.all([
      supabase
        .from('charts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('users')
        .select('subscription_tier')
        .eq('clerk_id', userId)
        .single(),
    ])

    if (!chartsResult.error && chartsResult.data) {
      birthChart = chartsResult.data as ChartRow
    }
    if (!userResult.error && userResult.data) {
      subscriptionTier = userResult.data.subscription_tier ?? 'free'
    }
  } catch (error) {
    // No birth data or error fetching - birthChart stays null, tier stays free
    console.error('Error fetching dashboard data:', error)
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
        userId={userId}
        initialBirthChart={birthChart}
        subscriptionTier={subscriptionTier}
        priceMonthly={priceMonthly}
      />
    </>
  )
}
