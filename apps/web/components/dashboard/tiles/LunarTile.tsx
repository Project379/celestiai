'use client'

import { useEffect, useState } from 'react'
import { getLunarPhase, type LunarPhase } from '@/lib/moon-phase'
import { DashboardTile } from './DashboardTile'

/**
 * Днес bento tile — current lunar phase. Live-ticks every 60s like the
 * full LunarPhaseCard. Taps through to /transits (later → /rhythm/месец).
 */
export function LunarTile() {
  const [phase, setPhase] = useState<LunarPhase>(() => getLunarPhase())

  useEffect(() => {
    const interval = setInterval(() => setPhase(getLunarPhase(new Date())), 60_000)
    return () => clearInterval(interval)
  }, [])

  const illumination = Math.round(phase.illumination * 100)

  return (
    <DashboardTile
      href="/transits"
      eyebrow="Лунна фаза"
      title={phase.name}
      hint={`${illumination}% осветеност`}
      accent="violet"
    />
  )
}
