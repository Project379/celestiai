import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { UserMenu } from '@/components/auth/UserMenu'
import { SessionExpiryModal } from '@/components/auth/SessionExpiryModal'
import { TransitOverviewCard } from '@/components/horoscope/TransitOverviewCard'

interface ChartData {
  id: string
  name: string
}

export default async function TransitsPage() {
  const { userId } = await auth()

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
    console.error('Error fetching chart for transit page:', error)
  }

  return (
    <>
      <SessionExpiryModal />

      <div className="fixed right-4 top-4 z-50 sm:right-8">
        <UserMenu />
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Транзити</h1>
          <p className="mt-2 text-slate-400">
            Какво те влияе точно сега — виж активните транзити към картата ти.
          </p>
        </div>

        {chart ? (
          <TransitOverviewCard chartId={chart.id} />
        ) : (
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
              Добави рождени данни
            </h3>
            <p className="mb-6 text-sm text-slate-400">
              За да видиш транзитите си, първо ми кажи кога и къде си роден/а.
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
              Въведи данни за раждане
            </Link>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 transition-colors hover:text-slate-300"
          >
            &larr; Обратно към таблото
          </Link>
        </div>
      </div>
    </>
  )
}
