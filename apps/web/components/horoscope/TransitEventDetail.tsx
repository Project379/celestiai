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
      <div className="space-y-4 py-4">
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-white/[0.04]" />
        <div className="h-6 w-3/4 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="h-3 w-full animate-pulse rounded-full bg-white/[0.04]" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/[0.04]" />
        <div className="mt-6 h-28 w-full animate-pulse border border-white/[0.05] bg-white/[0.02]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="border-l border-rose-300/50 bg-rose-500/[0.04] px-5 py-3">
        <p className="font-display text-[13px] text-rose-300/90">{error}</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/75">
          <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          Липсва
        </p>
        <h2 className="font-display text-[1.5rem] font-semibold leading-tight tracking-tight text-slate-100">
          Събитието не е намерено
        </h2>
        <p className="font-display text-[14.5px] font-light leading-relaxed text-slate-400">
          Възможно е транзитният преглед вече да е обновен и това събитие да е отпаднало.
        </p>
        <Link
          href="/transits"
          className="group inline-flex items-center gap-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
        >
          <svg className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Към всички транзити
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div>
        <p className="mb-3 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
          <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          Значение на събитието
        </p>
        <h2 className="font-display text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-slate-100 sm:text-[2rem]">
          {event.title}
        </h2>
        <p className="mt-4 max-w-2xl font-display text-[16px] font-light leading-[1.85] text-slate-400">
          {event.summary}
        </p>
      </div>

      {/* Detail - editorial pull-quote */}
      <figure className="max-w-2xl border-l border-amber-300/40 pl-6">
        <p className="mb-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.36em] text-amber-300/80">
          Тълкувание
        </p>
        <blockquote className="font-display text-[15px] leading-[1.85] text-slate-300/95">
          {event.detail}
        </blockquote>
      </figure>

      {/* Footnote */}
      <div className="max-w-2xl border-t border-white/[0.05] pt-6">
        <p className="font-display text-[13px] font-light leading-relaxed text-slate-500">
          Това е интерпретация на конкретното транзитно събитие. Прегледът на страницата с транзити показва само краткото резюме, а пълното значение се отваря тук.
        </p>
      </div>

      {/* Back link */}
      <div>
        <Link
          href="/transits"
          className="group inline-flex items-center gap-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
        >
          <svg className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Към всички транзити
        </Link>
      </div>
    </div>
  )
}
