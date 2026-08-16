import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { AspectData, AspectType, Planet } from '@stellaeum/astrology/client'
import { PLANETS_BG, PLANET_GLYPHS } from '@stellaeum/astrology/client'
import { ASPECT_BG, ASPECT_GLYPH } from '@stellaeum/core/charts/sections'
import { pressFeedback } from '@/components/design-system/tokens'

interface AspectsListProps {
  aspects: readonly AspectData[]
}

// Aspect type → accent color. Hard aspects rose, soft aspects violet,
// conjunction stays amber (the "meeting"). Hex values mirror web's
// Tailwind class palette (text-bronze, text-rose-300/80, etc.) so
// the visual register matches one-to-one across surfaces.
const ASPECT_ACCENT: Record<AspectType, string> = {
  conjunction: '#fcd34d',           // text-bronze
  opposition:  'rgba(253,164,175,0.8)', // text-rose-300/80
  square:      'rgba(253,164,175,0.8)',
  trine:       'rgba(196,181,253,0.9)', // text-violet-300/90
  sextile:     'rgba(196,181,253,0.8)',
}

// Section order — traditional astrological weight (conjunctions + hard
// aspects first, then harmonious). Mirrors web AspectsList.tsx ordering.
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
 * Карта · Аспекти — aspects grouped by type, each section reveals 3 tightest-
 * orb rows by default with a progressive expander.
 *
 * Mirrors apps/web/components/chart/AspectsList.tsx (P.2-c). Per-section
 * expander state lives in a Record<AspectType, boolean> to avoid five separate
 * useState calls.
 */
export function AspectsList({ aspects }: AspectsListProps) {
  const [expanded, setExpanded] = useState<Record<AspectType, boolean>>({
    conjunction: false,
    opposition:  false,
    square:      false,
    trine:       false,
    sextile:     false,
  })

  if (aspects.length === 0) {
    return (
      <Text className="text-[14px] font-light text-slate-500">
        Няма аспекти в рамките на зададения орб.
      </Text>
    )
  }

  const grouped = groupByType(aspects)

  return (
    <View style={{ gap: 32 }}>
      {SECTION_ORDER.map((type) => {
        const section = grouped[type]
        if (!section || section.length === 0) return null
        return (
          <AspectSection
            key={type}
            type={type}
            aspects={section}
            expanded={expanded[type]}
            onToggle={() =>
              setExpanded((prev) => ({ ...prev, [type]: !prev[type] }))
            }
          />
        )
      })}
    </View>
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
  expanded: boolean
  onToggle: () => void
}

function AspectSection({ type, aspects, expanded, onToggle }: AspectSectionProps) {
  const hasMore = aspects.length > DEFAULT_VISIBLE
  const visible = expanded || !hasMore ? aspects : aspects.slice(0, DEFAULT_VISIBLE)

  return (
    <View>
      <View className="mb-2 flex-row items-baseline justify-between" style={{ gap: 12 }}>
        <Text
          className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em]"
          style={{ color: ASPECT_ACCENT[type] }}
        >
          {SECTION_TITLES[type]}
        </Text>
        <Text className="font-cinzel text-[9px] uppercase tracking-[0.24em] text-slate-600">
          {aspects.length}
        </Text>
      </View>

      <View>
        {visible.map((aspect, i) => (
          <AspectRow
            key={`${aspect.planet1}-${aspect.aspect}-${aspect.planet2}-${i}`}
            aspect={aspect}
            isFirst={i === 0}
          />
        ))}
      </View>

      {hasMore && (
        <Pressable
          onPress={onToggle}
          className="mt-3"
          style={({ pressed }) => pressFeedback(pressed)}
        >
          <Text className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            {expanded ? 'Скрий допълнителните' : `Покажи всички (${aspects.length})`}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

interface AspectRowProps {
  aspect: AspectData
  isFirst: boolean
}

function AspectRow({ aspect, isFirst }: AspectRowProps) {
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
    <View
      className={`flex-row items-center justify-between py-4 ${
        isFirst ? '' : 'border-t border-slate-800/60'
      }`}
      style={{ gap: 16 }}
    >
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <Text className="font-cinzel text-[15px] text-slate-300">{p1Glyph}</Text>
        <Text className="font-cinzel text-[15px]" style={{ color: accent }}>
          {typeGlyph}
        </Text>
        <Text className="font-cinzel text-[15px] text-slate-300">{p2Glyph}</Text>
        <Text className="ml-2 text-[12.5px] font-light text-slate-400">
          {p1Bg} {typeBg} {p2Bg}
        </Text>
      </View>

      <View className="flex-row items-baseline" style={{ gap: 12 }}>
        <Text className="text-[12px] font-light text-slate-500">
          {orbDeg}°{orbMm}&apos;
        </Text>
        <Text className="text-slate-600">·</Text>
        <Text className="font-cinzel text-[9px] uppercase tracking-[0.24em] text-slate-500">
          {aspect.applying ? 'прилагащ' : 'раздалечаващ'}
        </Text>
      </View>
    </View>
  )
}
