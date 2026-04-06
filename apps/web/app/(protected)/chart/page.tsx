import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { UserMenu } from '@/components/auth/UserMenu'
import { SessionExpiryModal } from '@/components/auth/SessionExpiryModal'
import { ChartView } from '@/components/chart/ChartView'

interface ChartData {
  id: string
  name: string
}

/**
 * Chart page - displays user's natal chart visualization with AI Oracle panel
 *
 * Server component that:
 * - Fetches user's primary chart
 * - Fetches subscription tier from users table
 * - Passes chartId and subscriptionTier to ChartView client component
 */
export default async function ChartPage() {
  const { userId } = await auth()

  // Fetch user's primary chart (most recent)
  let chart: ChartData | null = null
  try {
    const supabase = createServiceSupabaseClient()
    const { data, error } = await supabase
      .from('charts')
      .select('id, name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!error && data) {
      chart = data as ChartData
    }
  } catch (error) {
    console.error('Error fetching chart:', error)
  }

  // Fetch user's subscription tier from users table
  // Default to 'free' if user row doesn't exist yet (created on first Oracle generation)
  let subscriptionTier: 'free' | 'premium' = 'free'
  if (userId) {
    try {
      const supabase = createServiceSupabaseClient()
      const { data } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('clerk_id', userId)
        .single()

      if (data?.subscription_tier === 'premium') {
        subscriptionTier = 'premium'
      }
    } catch {
      // User row doesn't exist yet — defaults to 'free'
    }
  }

  return (
    <>
      {/* Session expiry modal */}
      <SessionExpiryModal />

      {/* User menu in header */}
      <div className="fixed right-4 top-4 z-50 sm:right-8">
        <UserMenu />
      </div>

      {/* Page content — widened to max-w-7xl to accommodate Oracle panel */}
      <div className="mx-auto max-w-7xl">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">
            Вашата натална карта
          </h1>
          <p className="mt-2 text-slate-400">
            Интерактивна визуализация на вашия астрологичен профил
          </p>
        </div>

        {/* Chart view or CTA */}
        {chart ? (
          <ChartView chartId={chart.id} subscriptionTier={subscriptionTier} />
        ) : (
          /* CTA to add birth data */
          <div className="rounded-xl border border-dashed border-purple-500/50 bg-purple-500/5 p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10">
              <svg
                className="h-7 w-7 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-200">
              Добавете рождени данни
            </h3>
            <p className="mb-6 text-sm text-slate-400">
              За да видите вашата натална карта, моля първо въведете данните си за раждане.
            </p>
            <Link
              href="/birth-data"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-3 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Въведете данни за раждане
            </Link>
          </div>
        )}

        {/* Back to dashboard link */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            &larr; Назад към таблото
          </Link>
        </div>
      </div>
    </>
  )
}
