'use client'

import Link from 'next/link'
import type { CrystalOfTheDayResponse } from '@celestia/core'

interface CrystalTileProps {
  /**
   * Optional prefetched crystal-of-the-day from a Server Component
   * parent (MOBILE_UX_RESEARCH Phase M1 pattern). When provided, the
   * tile renders synchronously. When omitted (e.g., standalone use in
   * a client-only context), the tile shows a quiet placeholder.
   */
  initialData?: CrystalOfTheDayResponse | null
}

/**
 * Днес bento tile — today's lunar-phase-driven crystal.
 *
 * Phase M1 note: previously did a client-side fetch of /api/crystals/today.
 * Now receives prefetched data as a prop from the Server Component parent,
 * which called getCrystalOfTheDay (via React.cache wrapper) at render time.
 * No HTTP round-trip on web for this tile anymore.
 */
export function CrystalTile({ initialData }: CrystalTileProps) {
  const data = initialData ?? null

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
