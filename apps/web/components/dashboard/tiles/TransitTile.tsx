'use client'

import Link from 'next/link'

/**
 * Днес bento tile — transit entry. A top-transit-of-the-day headline
 * pulled from user chart × current sky is planned for Phase B; for
 * now this is a simple entry to /rhythm where TransitOverviewCard
 * renders the full live transit feed.
 */
export function TransitTile() {
  return (
    <Link
      href="/rhythm"
      className="group relative flex h-full flex-col rounded-2xl border border-slate-700/60 bg-transparent p-5 transition-all duration-300 hover:border-slate-500/70"
    >
      <p className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-slate-400">
        Транзити
      </p>

      <div className="mt-3">
        <p className="font-display text-[15px] font-light leading-[1.3] text-slate-100 group-hover:text-white">
          Небесно време
        </p>
        <p className="mt-1 font-display text-[12px] font-light leading-[1.5] text-slate-500 group-hover:text-slate-400">
          активните аспекти към картата ти
        </p>
      </div>

      <p className="mt-auto pt-4 font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-600">
        виж всички
      </p>
    </Link>
  )
}
