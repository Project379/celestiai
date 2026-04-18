'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface TodayCrystalResponse {
  crystal: {
    slug: string
    name_en: string
    name_bg: string | null
    tagline_en: string
    tagline_bg: string | null
    color_primary: string
    color_secondary: string
    color_accent: string | null
  }
  lunarPhase: { name: string }
}

/**
 * Днес bento tile — today's lunar-phase-driven crystal. Shows the
 * name, Bulgarian tagline, and a small gem color indicator. The
 * full crystal description, streak tracking, and premium gate live
 * on /you/crystals via CrystalOfTheDayCard at the destination.
 */
export function CrystalTile() {
  const [data, setData] = useState<TodayCrystalResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/crystals/today')
        if (!res.ok) return
        const json = (await res.json()) as TodayCrystalResponse
        if (!cancelled) setData(json)
      } catch {
        /* silent — tile stays on placeholder */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const name = data?.crystal?.name_bg || data?.crystal?.name_en || '—'
  const tagline = data?.crystal?.tagline_bg || data?.crystal?.tagline_en || 'днешният камък'
  const primaryColor = data?.crystal?.color_primary ?? '#fbbf24'
  const secondaryColor = data?.crystal?.color_secondary ?? '#8b5cf6'
  const phase = data?.lunarPhase?.name

  return (
    <Link
      href="/you/crystals"
      className="group relative flex h-full flex-col rounded-2xl border border-amber-300/25 bg-transparent p-5 transition-all duration-300 hover:border-amber-200/50"
    >
      <div className="flex items-start justify-between">
        <p className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-300/90">
          Кристал за днес
        </p>

        {/* Compact gem color indicator */}
        {data && (
          <span
            aria-hidden
            className="h-4 w-4 rounded-full border border-white/10"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${primaryColor}, ${secondaryColor})`,
              boxShadow: `0 0 10px -2px ${primaryColor}80`,
            }}
          />
        )}
      </div>

      <div className="mt-3">
        <p className="font-display text-[15px] font-light leading-[1.3] text-slate-100 group-hover:text-white">
          {name}
        </p>
        <p className="mt-1 font-display text-[12px] font-light leading-[1.5] text-slate-500 group-hover:text-slate-400">
          {tagline}
        </p>
      </div>

      {phase && (
        <p className="mt-auto pt-4 font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">
          за {phase.toLowerCase()}
        </p>
      )}
    </Link>
  )
}
