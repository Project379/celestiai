'use client'

import type { AspectData } from '@celestia/astrology/client'
import {
  ASPECT_BG,
  ASPECT_GLYPH,
  PLANET_BG,
  PLANET_GLYPH,
} from './chart-sections'

interface AspectsListProps {
  aspects: readonly AspectData[]
}

// Aspect type → accent color. Hard aspects rose, soft aspects violet,
// conjunction stays amber (the "meeting").
const ASPECT_ACCENT: Record<AspectData['aspect'], string> = {
  conjunction: 'text-amber-300/90',
  opposition:  'text-rose-300/80',
  square:      'text-rose-300/80',
  trine:       'text-violet-300/90',
  sextile:     'text-violet-300/80',
}

/**
 * Карта · Аспекти (§2.2). One row per aspect with glyphs, named type,
 * orb in minutes, and applying/separating indicator. Real numerical
 * orbs are the "correct science" move (§8).
 */
export function AspectsList({ aspects }: AspectsListProps) {
  if (aspects.length === 0) {
    return (
      <p className="font-display text-[14px] font-light text-slate-500">
        Няма аспекти в рамките на зададения орбис.
      </p>
    )
  }

  const sorted = [...aspects].sort((a, b) => a.orb - b.orb)

  return (
    <ul className="divide-y divide-slate-800/60">
      {sorted.map((aspect, i) => {
        const p1Glyph = PLANET_GLYPH[aspect.planet1] ?? '✦'
        const p2Glyph = PLANET_GLYPH[aspect.planet2] ?? '✦'
        const p1Bg = PLANET_BG[aspect.planet1] ?? aspect.planet1
        const p2Bg = PLANET_BG[aspect.planet2] ?? aspect.planet2
        const typeGlyph = ASPECT_GLYPH[aspect.aspect]
        const typeBg = ASPECT_BG[aspect.aspect]
        const accent = ASPECT_ACCENT[aspect.aspect]
        const orbDeg = Math.floor(aspect.orb)
        const orbMin = Math.floor((aspect.orb - orbDeg) * 60)
        const orbMm = orbMin.toString().padStart(2, '0')

        return (
          <li
            key={`${aspect.planet1}-${aspect.aspect}-${aspect.planet2}-${i}`}
            className="flex items-center justify-between gap-4 py-4"
          >
            <div className="flex items-center gap-3">
              <span aria-hidden className="font-cinzel text-[15px] text-slate-300">
                {p1Glyph}
              </span>
              <span aria-hidden className={`font-cinzel text-[15px] ${accent}`}>
                {typeGlyph}
              </span>
              <span aria-hidden className="font-cinzel text-[15px] text-slate-300">
                {p2Glyph}
              </span>
              <span className="ml-2 font-display text-[12.5px] font-light text-slate-400">
                {p1Bg} {typeBg} {p2Bg}
              </span>
            </div>

            <div className="flex items-baseline gap-3 font-display text-[12px] font-light text-slate-500">
              <span>
                {orbDeg}°{orbMm}&apos;
              </span>
              <span className="text-slate-600">·</span>
              <span className="font-cinzel text-[9px] uppercase tracking-[0.24em]">
                {aspect.applying ? 'апликиращ' : 'сепариращ'}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
