import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import type { ChartRow } from '@/lib/types/chart'
import { TransitOverviewCard } from '@/components/horoscope/TransitOverviewCard'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

export const metadata: Metadata = {
  title: 'Транзити',
  description: 'Активните транзити към твоята натална карта',
}

export default async function TransitsPage() {
  const { userId } = await auth()

  let chart: Pick<ChartRow, 'id' | 'name'> | null = null
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
      chart = data as Pick<ChartRow, 'id' | 'name'>
    }
  } catch (error) {
    console.error('Error fetching chart for transit page:', error)
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Editorial hero */}
      <div className="mb-10 sm:mb-12">
        <p className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
          Текущо небе
        </p>
        <h1 className="font-display flex flex-wrap items-baseline gap-x-3 text-[2rem] leading-[1.15] tracking-tight text-slate-100 sm:text-[2.5rem]">
          <span className="font-light italic text-slate-400">Какво ти</span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent">
            влияе сега
          </span>
        </h1>
        <p className="mt-3 max-w-xl font-display text-[15px] font-light italic leading-relaxed text-slate-500">
          Активните транзити към картата ти - как планетите говорят с теб точно днес.
        </p>
      </div>

      {chart ? (
        <TransitOverviewCard chartId={chart.id} />
      ) : (
        <EmptyTransitsState />
      )}

      <div className="mt-12 text-center">
        <Link
          href="/dashboard"
          className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
        >
          &larr; Обратно към таблото
        </Link>
      </div>
    </div>
  )
}

function EmptyTransitsState() {
  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-5 font-display text-[17px] font-light italic leading-[1.85] text-slate-500">
        За да видиш транзитите си, първо трябва да имаш натална карта. Въведи рождените си данни.
      </p>
      <Link
        href="/birth-data"
        className="group inline-flex items-center gap-2 font-display text-[12px] font-medium tracking-wide text-slate-400 transition-colors duration-200 hover:text-amber-300"
      >
        <CelestialIcon name="saturn" size={13} className="transition-colors duration-200 group-hover:text-amber-300" />
        Въведи рождени данни
        <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}
