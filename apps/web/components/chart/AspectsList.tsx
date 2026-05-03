'use client'

import { useState } from 'react'
import type { AspectData, AspectType, Planet } from '@stellaeum/astrology/client'
import { PLANETS_BG, PLANET_GLYPHS } from '@stellaeum/astrology/client'
import { ASPECT_BG, ASPECT_GLYPH } from './chart-sections'

interface AspectsListProps {
  aspects: readonly AspectData[]
}

// Aspect type → accent color. Hard aspects rose, soft aspects violet,
// conjunction stays amber (the "meeting").
const ASPECT_ACCENT: Record<AspectType, string> = {
  conjunction: 'text-amber-300/90',
  opposition:  'text-rose-300/80',
  square:      'text-rose-300/80',
  trine:       'text-violet-300/90',
  sextile:     'text-violet-300/80',
}

// Section order — traditional astrological weight: conjunctions and
// hard aspects first (strongest influence), then harmonious. Plural
// headings match the traditional register applied in commit 7c7ffa5.
const SECTION_ORDER: readonly AspectType[] = [
  'conjunction',
  'opposition',
  'square',
  'trine',
  'sextile',
] as const

const SECTION_TITLES: Record<AspectType, string> = {
  conjunction: 'Съединения',
  opposition:  'Опозиции',
  square:      'Квадрати',
  trine:       'Тригони',
  sextile:     'Секстили',
}

const DEFAULT_VISIBLE = 3

/**
 * Карта · Аспекти (§2.2). Aspects grouped by type, each section
 * reveals its 3 tightest-orb rows by default with a progressive
 * expander for the rest. Sections with ≤3 aspects show all rows
 * without an expander; empty sections are omitted.
 *
 * Within each section, aspects are sorted by orb ascending (tightest
 * first) — real numerical orbs are the "correct science" move (§8).
 */
export function AspectsList({ aspects }: AspectsListProps) {
  if (aspects.length === 0) {
    return (
      <p className="font-display text-[14px] font-light text-slate-500">
        Няма аспекти в рамките на зададения орбис.
      </p>
    )
  }

  const grouped = groupByType(aspects)

  return (
    <div className="space-y-8">
      {SECTION_ORDER.map((type) => {
        const section = grouped[type]
        if (!section || section.length === 0) return null
        return (
          <AspectSection
            key={type}
            type={type}
            aspects={section}
          />
        )
      })}
    </div>
  )
}

function groupByType(aspects: readonly AspectData[]): Record<AspectType, AspectData[]> {
  const out: Record<AspectType, AspectData[]> = {
    conjunction: [],
    opposition:  [],
    square:      [],
    trine:       [],
    sextile:     [],
  }
  for (const a of aspects) out[a.aspect].push(a)
  for (const type of SECTION_ORDER) out[type].sort((a, b) => a.orb - b.orb)
  return out
}

interface AspectSectionProps {
  type: AspectType
  aspects: AspectData[]
}

function AspectSection({ type, aspects }: AspectSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const hasMore = aspects.length > DEFAULT_VISIBLE
  const visible = expanded || !hasMore ? aspects : aspects.slice(0, DEFAULT_VISIBLE)

  return (
    <section>
      <header className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className={`font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] ${ASPECT_ACCENT[type]}`}>
          {SECTION_TITLES[type]}
        </h3>
        <span className="font-cinzel text-[9px] uppercase tracking-[0.24em] text-slate-600 tabular-nums">
          {aspects.length}
        </span>
      </header>

      <ul className="divide-y divide-slate-800/60">
        {visible.map((aspect, i) => (
          <AspectRow
            key={`${aspect.planet1}-${aspect.aspect}-${aspect.planet2}-${i}`}
            aspect={aspect}
          />
        ))}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-500 transition-colors duration-200 hover:text-amber-300 focus:outline-none focus-visible:text-amber-300"
          aria-expanded={expanded}
        >
          {expanded ? 'Скрий допълнителните' : `Покажи всички (${aspects.length})`}
        </button>
      )}
    </section>
  )
}

function AspectRow({ aspect }: { aspect: AspectData }) {
  const p1Glyph = PLANET_GLYPHS[aspect.planet1 as Planet] ?? '✦'
  const p2Glyph = PLANET_GLYPHS[aspect.planet2 as Planet] ?? '✦'
  const p1Bg = PLANETS_BG[aspect.planet1 as Planet] ?? aspect.planet1
  const p2Bg = PLANETS_BG[aspect.planet2 as Planet] ?? aspect.planet2
  const typeGlyph = ASPECT_GLYPH[aspect.aspect]
  const typeBg = ASPECT_BG[aspect.aspect]
  const accent = ASPECT_ACCENT[aspect.aspect]
  const orbDeg = Math.floor(aspect.orb)
  const orbMin = Math.floor((aspect.orb - orbDeg) * 60)
  const orbMm = orbMin.toString().padStart(2, '0')

  return (
    <li className="flex items-center justify-between gap-4 py-4">
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
          {aspect.applying ? 'прилагащ' : 'раздалечаващ'}
        </span>
      </div>
    </li>
  )
}
