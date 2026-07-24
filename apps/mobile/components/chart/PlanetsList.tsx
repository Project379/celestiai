import { Pressable, Text, View } from 'react-native'

import { PLANETS_BG, PLANET_GLYPHS } from '@stellaeum/astrology/client'
import type { Planet, PlanetPosition } from '@stellaeum/astrology/client'
import { formatDegreeInSign } from '@stellaeum/core/charts/sections'
import { pressFeedback } from '@/components/design-system/tokens'

// Bulgarian ordinal, not a bare "H7" abbreviation — the rest of this
// screen is fully Bulgarian editorial prose, and a Latin-letter shorthand
// reads as a leftover placeholder in that context. Arabic ordinal, not a
// Roman numeral: R5 in the redesign doc explicitly scopes Roman numerals
// to the Astrology Guide only, to keep Карта free of the per-section
// numeral overuse v1 shipped — this fix stays inside that boundary.
function houseOrdinal(house: number): string {
  return `${house}-и дом`
}

interface PlanetsListProps {
  planets: readonly PlanetPosition[]
  onSelect?: (planet: PlanetPosition) => void
  selectedPlanet?: string | null
}

/**
 * Карта · Детайли — editorial row per planet (glyph + name + degree-in-sign +
 * house + retrograde marker). Tap → open PlanetDetail sheet via onSelect.
 *
 * Mirrors apps/web/components/chart/PlanetsList.tsx (P.2-c). RN equivalent of
 * web's `<ul><li><button>`: View with map of Pressables; dividers between rows
 * via a border-top conditional on idx > 0.
 */
export function PlanetsList({ planets, onSelect, selectedPlanet }: PlanetsListProps) {
  return (
    <View>
      {planets.map((planet, idx) => {
        const nameBg = PLANETS_BG[planet.planet as Planet] ?? planet.planet
        const glyph = PLANET_GLYPHS[planet.planet as Planet] ?? '✦'
        const position = formatDegreeInSign(planet.signDegree, planet.sign)
        const retrograde = planet.speed < 0
        const isSelected = selectedPlanet === planet.planet

        return (
          <Pressable
            key={planet.planet}
            onPress={() => onSelect?.(planet)}
            className={`flex-row items-center justify-between py-4 ${
              idx === 0 ? '' : 'border-t border-slate-800/60'
            }`}
            style={({ pressed }) => ({ ...pressFeedback(pressed), gap: 16 })}
          >
            <View className="flex-row items-center" style={{ gap: 16 }}>
              <Text
                className={`font-cinzel text-[16px] ${
                  isSelected ? 'text-amber-300' : 'text-slate-500'
                }`}
              >
                {glyph}
              </Text>
              <Text
                className={`font-cinzel text-[11px] font-semibold uppercase tracking-[0.3em] ${
                  isSelected ? 'text-amber-200' : 'text-slate-200'
                }`}
              >
                {nameBg}
              </Text>
            </View>

            <View className="flex-row items-baseline" style={{ gap: 12 }}>
              <Text className="text-[12.5px] font-light text-slate-400">{position}</Text>
              <Text className="text-slate-600">·</Text>
              <Text className="text-[12.5px] font-light text-slate-400">{houseOrdinal(planet.house)}</Text>
              {retrograde && (
                <Text
                  accessibilityLabel="Ретроград"
                  className="font-cinzel text-[9px] font-semibold tracking-[0.18em] text-amber-300/80"
                >
                  R
                </Text>
              )}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}
