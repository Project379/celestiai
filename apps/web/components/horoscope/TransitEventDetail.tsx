'use client'

import Link from 'next/link'
import { useTransitOverview } from '@/hooks/useTransitOverview'

interface TransitEventDetailProps {
  chartId: string
  eventId: string
}

export function TransitEventDetail({ chartId, eventId }: TransitEventDetailProps) {
  const { overview, isLoading, error } = useTransitOverview(chartId)

  const event = overview
    ? [
        ...overview.activeTransits,
        ...overview.upcomingExacts,
        ...overview.lunarEvents,
      ].find((item) => item.id === eventId)
    : null

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm">
        <div className="space-y-3 animate-pulse">
          <div className="h-5 w-1/2 rounded-full bg-white/5" />
          <div className="h-4 w-full rounded-full bg-white/5" />
          <div className="h-4 w-5/6 rounded-full bg-white/5" />
          <div className="h-24 w-full rounded-2xl bg-white/5" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    )
  }

  if (!event) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-slate-200">Събитието не е намерено</h2>
        <p className="mt-2 text-sm text-slate-400">
          Възможно е транзитният преглед вече да е обновен и това събитие да е отпаднало.
        </p>
        <Link
          href="/transits"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200"
        >
          &larr; Назад към всички транзити
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
            Значение на събитието
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-100">{event.title}</h2>
          <p className="mt-2 text-sm text-slate-400">{event.summary}</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <p className="text-sm leading-7 text-slate-300">{event.detail}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-5">
        <p className="text-sm text-slate-400">
          Това е интерпретация на конкретното транзитно събитие. Прегледът на страницата с транзити
          показва само краткото резюме, а пълното значение се отваря тук.
        </p>
      </div>
    </div>
  )
}
