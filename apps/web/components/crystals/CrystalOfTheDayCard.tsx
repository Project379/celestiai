'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CrystalGem, type GemVariant } from './CrystalGem'

interface TodayResponse {
  crystal: {
    slug: string
    name_en: string
    name_bg: string | null
    tagline_en: string
    tagline_bg: string | null
    description_en: string
    description_bg: string | null
    color_primary: string
    color_secondary: string
    color_accent: string | null
    svg_variant: string
    rarity: string
  }
  lunarPhase: {
    id: string
    name: string
    latin: string
    illumination: number
  }
  streak: {
    current: number
    longest: number
    totalDays: number
  } | null
  isPremium: boolean
  collectedToday: boolean
}

/**
 * Free-tier dashboard card: today's crystal, tied to the current lunar
 * phase. Fetches /api/crystals/today which is un-authed. Links into
 * /crystals (premium gate on that page for deeper features).
 */
export function CrystalOfTheDayCard() {
  const [data, setData] = useState<TodayResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/crystals/today', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = (await res.json()) as TodayResponse
        if (!cancelled) setData(body)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error || !data) {
    return (
      <section
        aria-label="Камък на деня"
        className="relative min-h-[160px] rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6"
      >
        <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
          Камък на деня
        </p>
        <p className="mt-3 font-display text-[14px] font-light italic text-slate-500">
          {error ? 'В момента не можем да призовем камъка.' : 'Призоваване...'}
        </p>
      </section>
    )
  }

  const { crystal, streak } = data
  const description =
    crystal.description_bg ??
    crystal.description_en.split('. ').slice(0, 2).join('. ') + '.'

  return (
    <section aria-label="Камък на деня" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-14 top-4 -z-10 h-[220px] w-[220px] rounded-full opacity-[0.18] blur-[80px]"
        style={{ background: crystal.color_primary }}
      />

      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-300/90">
          Камък на деня
        </p>
        {streak && streak.current > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/[0.06] px-3 py-1 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.28em] text-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            {streak.current === 1 ? '1 ден' : `${streak.current} поредни дни`}
          </span>
        )}
      </div>

      <div className="flex items-start gap-6 sm:gap-8">
        <motion.div
          animate={{ rotate: [0, 3, -3, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="flex-shrink-0"
        >
          <CrystalGem
            variant={crystal.svg_variant as GemVariant}
            primary={crystal.color_primary}
            secondary={crystal.color_secondary}
            accent={crystal.color_accent}
            size={108}
            seed={crystal.slug}
          />
        </motion.div>

        <div className="min-w-0 flex-1 pt-1">
          <h2 className="font-display text-[1.55rem] font-semibold leading-tight sm:text-[1.8rem]">
            <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(251,191,36,0.2)]">
              {crystal.name_bg ?? crystal.name_en}
            </span>
          </h2>
          <p className="mt-1.5 font-cinzel text-[10px] font-medium uppercase tracking-[0.32em] text-slate-300/90">
            {crystal.tagline_bg ?? crystal.tagline_en}
          </p>
          <p className="mt-4 font-display text-[15px] font-light leading-[1.75] text-slate-300/95">
            {description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            {data.isPremium && data.collectedToday && (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/[0.06] px-4 py-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                Събран днес
              </span>
            )}
            <Link
              href="/crystals"
              className="group inline-flex items-center gap-2 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-slate-200 transition-colors duration-200 hover:text-amber-300"
            >
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-slate-300/80 transition-all duration-300 group-hover:to-amber-300/90" />
              Разгледай колекцията
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
