import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export const metadata: Metadata = {
  title: 'Натална карта',
  description: 'Твоята натална карта с интерактивна визуализация и AI Оракул',
}
import type { ChartRow } from '@/lib/types/chart'
import { UserMenu } from '../../../components/auth/UserMenu'
import { SessionExpiryModal } from '../../../components/auth/SessionExpiryModal'
import { ChartView } from '../../../components/chart/ChartView'
import { PlusIcon } from '@/components/icons/PlusIcon'

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

  let chart: Pick<ChartRow, 'id' | 'name'> | null = null
  let subscriptionTier: 'free' | 'premium' = 'free'

  if (userId) {
    try {
      const supabase = createServiceSupabaseClient()
      const [chartResult, userResult] = await Promise.all([
        supabase
          .from('charts')
          .select('id, name')
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

      if (!chartResult.error && chartResult.data) {
        chart = chartResult.data as Pick<ChartRow, 'id' | 'name'>
      }
      if (!userResult.error && userResult.data?.subscription_tier === 'premium') {
        subscriptionTier = 'premium'
      }
    } catch (error) {
      console.error('Error fetching chart page data:', error)
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
            Твоята натална карта
          </h1>
          <p className="mt-2 text-slate-400">
            Натисни на планета или знак, за да видиш какво означава за теб
          </p>
        </div>

        {/* Chart view or CTA */}
        {chart ? (
          <ChartView chartId={chart.id} subscriptionTier={subscriptionTier} />
        ) : (
          /* CTA to add birth data */
          <div className="rounded-xl border border-dashed border-purple-500/50 bg-purple-500/5 p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10">
              <PlusIcon className="h-7 w-7 text-purple-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-200">
              Добави рождени данни
            </h3>
            <p className="mb-6 text-sm text-slate-400">
              За да видиш картата си, първо ми кажи кога и къде си роден/а.
            </p>
            <Link
              href="/birth-data"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-3 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <PlusIcon />
              Въведи данни за раждане
            </Link>
          </div>
        )}

        {/* Back to dashboard link */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            &larr; Обратно към таблото
          </Link>
        </div>
      </div>
    </>
  )
}
