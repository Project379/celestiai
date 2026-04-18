'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getLunarPhase, type LunarPhase } from '@/lib/moon-phase'
import {
  getActiveMeteorShower,
  daysUntilPeak,
  type MeteorShower,
} from '@/lib/meteor-showers'

/**
 * Днес bento tile — live lunar phase with next-major countdown and
 * active meteor shower callout. Compact surface; full manifesting
 * guidance + extended meteor timeline live on /rhythm via the full
 * LunarPhaseCard at the destination.
 */

function formatCountdown(daysAway: number): string {
  if (daysAway < 1 / 24) return 'съвсем скоро'
  const days = Math.floor(daysAway)
  const hours = Math.floor((daysAway - days) * 24)
  if (days === 0) return `${hours} ч`
  if (hours === 0) return `${days} д`
  return `${days} д ${hours} ч`
}

export function LunarTile() {
  const [phase, setPhase] = useState<LunarPhase>(() => getLunarPhase())
  const [shower, setShower] = useState<MeteorShower | null>(
    () => getActiveMeteorShower(),
  )

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setPhase(getLunarPhase(now))
      setShower(getActiveMeteorShower(now))
    }
    const interval = setInterval(tick, 60_000)
    return () => clearInterval(interval)
  }, [])

  const illumination = Math.round(phase.illumination * 100)
  const countdown = formatCountdown(phase.nextMajor.daysAway)
  const showerPeakDays = shower ? daysUntilPeak(shower) : null

  return (
    <Link
      href="/rhythm"
      className="group relative flex h-full flex-col rounded-2xl border border-violet-400/25 bg-transparent p-5 transition-all duration-300 hover:border-violet-300/50"
    >
      <p className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-violet-300/90">
        Лунна фаза
      </p>

      <div className="mt-3">
        <p className="font-display text-[15px] font-light leading-[1.3] text-slate-100 group-hover:text-white">
          {phase.name}
        </p>
        <p className="mt-1 font-cinzel text-[9.5px] uppercase tracking-[0.26em] text-slate-500">
          {illumination}% осветление
        </p>
      </div>

      <div className="mt-4 flex items-baseline gap-2 font-display text-[12px] font-light text-slate-400">
        <span aria-hidden className="text-amber-300/80">☾</span>
        <span>
          до {phase.nextMajor.name.toLowerCase()} · <span className="text-slate-200">{countdown}</span>
        </span>
      </div>

      {shower && (
        <div className="mt-2 flex items-baseline gap-2 font-display text-[12px] font-light text-amber-300/80">
          <span aria-hidden>☄</span>
          <span>
            {shower.name}
            {showerPeakDays !== null && showerPeakDays > 0 && (
              <> · пик след {showerPeakDays} д</>
            )}
            {showerPeakDays === 0 && <> · пик тази нощ</>}
          </span>
        </div>
      )}
    </Link>
  )
}
