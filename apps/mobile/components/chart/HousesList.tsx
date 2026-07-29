import { Text, View } from 'react-native'

import type { HouseData } from '@stellaeum/astrology/client'
import { formatDegreeInSign } from '@stellaeum/core/charts/sections'
import { ordinalBg } from '@stellaeum/core/i18n/bg-grammar'

interface HousesListProps {
  houses: readonly HouseData[]
  birthTimeKnown: boolean
}

const HOUSE_THEMES: Record<number, string> = {
  1:  'самоличност, външен вид',
  2:  'ценности, ресурси',
  3:  'общуване, близко обкръжение',
  4:  'дом, корени',
  5:  'творчество, удоволствие',
  6:  'ежедневие, здраве',
  7:  'партньорство',
  8:  'дълбина, трансформация',
  9:  'философия, пътуване',
  10: 'призвание, статус',
  11: 'общности, бъдеще',
  12: 'подсъзнание, уединение',
}

/**
 * Карта · Къщи — 12 house cusps with Bulgarian theme labels. House system is
 * Placidus (small uppercase badge in the header marks it for the curious user).
 *
 * Mirrors apps/web/components/chart/HousesList.tsx (P.2-c). Branches on
 * `!birthTimeKnown` for the час-неизвестен empty state.
 */
export function HousesList({ houses, birthTimeKnown }: HousesListProps) {
  if (!birthTimeKnown) {
    return (
      <View className="border-l border-amber-300/40 bg-amber-300/[0.05] px-5 py-4">
        <Text className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-amber-300/80">
          Забележка
        </Text>
        <Text className="text-[13px] font-light leading-relaxed text-amber-100/85">
          Къщите зависят от точното време на раждане. Добави час за пълна карта.
        </Text>
      </View>
    )
  }

  return (
    <View>
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-slate-400">
          12 къщи · куспиди
        </Text>
        <Text className="font-cinzel text-[9px] uppercase tracking-[0.26em] text-slate-600">
          Placidus
        </Text>
      </View>

      <View>
        {houses.map((house, idx) => (
          <View
            key={house.number}
            className={`flex-row items-center justify-between py-3.5 ${
              idx === 0 ? '' : 'border-t border-slate-800/60'
            }`}
            style={{ gap: 16 }}
          >
            <View className="flex-row items-center" style={{ gap: 16 }}>
              {/* Same fix as PlanetsList's "H7": a bare Latin-letter
                  abbreviation doesn't belong in an otherwise fully
                  Bulgarian editorial interface. Ordinal only (no "дом"
                  suffix) to fit the fixed index column — the section
                  heading above ("12 къщи") already establishes that
                  every row here is a house. */}
              <Text className="w-10 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.22em] text-amber-300/70">
                {ordinalBg(house.number)}
              </Text>
              <Text className="text-[12.5px] font-light text-slate-300">
                {formatDegreeInSign(house.signDegree, house.sign)}
              </Text>
            </View>
            <Text className="text-[11.5px] font-light text-slate-500">
              {HOUSE_THEMES[house.number]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
