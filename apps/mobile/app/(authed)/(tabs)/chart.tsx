import { useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import type {
  PlanetPosition,
  PointData,
} from '@stellaeum/astrology/client'

import { BigThreeCards } from '@/components/chart/BigThreeCards'
import { NatalWheel } from '@/components/chart/NatalWheel'
import { PlanetDetail } from '@/components/chart/PlanetDetail'
import { useChart } from '@/hooks/useChart'
import { useFirstChart } from '@/hooks/useFirstChart'

const CHIPS = [
  { id: 'essence' as const, label: 'Същност' },
  { id: 'details' as const, label: 'Детайли' },
  { id: 'aspects' as const, label: 'Аспекти' },
  { id: 'houses' as const, label: 'Къщи' },
]

type ChipId = (typeof CHIPS)[number]['id']

interface PlanetSelection {
  data: PlanetPosition | PointData
  type: 'sun' | 'moon' | 'rising' | null
  house?: number
}

const SCREEN_PADDING_X = 24
const WHEEL_MARGIN = SCREEN_PADDING_X * 2

export default function ChartScreen() {
  const router = useRouter()
  const firstChart = useFirstChart()
  const chart = useChart(firstChart.data?.id)
  const [activeChip, setActiveChip] = useState<ChipId>('essence')
  const [selection, setSelection] = useState<PlanetSelection | null>(null)

  const wheelSize = Math.min(
    Dimensions.get('window').width - WHEEL_MARGIN,
    520,
  )

  const handlePlanetSelect = (planet: PlanetPosition) => {
    setSelection((prev) => {
      // Tap same planet → deselect (mirror web's toggle behavior)
      if (prev && 'planet' in prev.data && prev.data.planet === planet.planet) {
        return null
      }
      const type =
        planet.planet === 'sun' || planet.planet === 'moon'
          ? planet.planet
          : null
      return { data: planet, type, house: planet.house }
    })
  }

  const handleBigThreeSelect = (kind: 'sun' | 'moon' | 'rising') => {
    if (!chart.data) return
    setSelection((prev) => {
      if (prev?.type === kind) return null
      if (kind === 'rising') {
        return { data: chart.data.ascendant, type: 'rising' }
      }
      const planet = chart.data.planets.find((p) => p.planet === kind)
      if (!planet) return null
      return { data: planet, type: kind, house: planet.house }
    })
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING_X,
          paddingTop: 24,
          paddingBottom: 120,
        }}
      >
        <Text className="mb-6 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          Натална карта · Твоята небесна подпис
        </Text>

        {/* Scroll-chips (MOBILE_UX_RESEARCH §2.2) */}
        <View className="mb-8 flex-row" style={{ gap: 8 }}>
          {CHIPS.map((chip) => {
            const isActive = activeChip === chip.id
            return (
              <Pressable
                key={chip.id}
                onPress={() => setActiveChip(chip.id)}
                className={`rounded-full border px-4 py-2 ${
                  isActive
                    ? 'border-amber-300/60 bg-amber-300/5'
                    : 'border-slate-700/60'
                }`}
              >
                <Text
                  className={`font-cinzel text-[9.5px] uppercase tracking-[0.32em] ${
                    isActive ? 'text-amber-200' : 'text-slate-400'
                  }`}
                >
                  {chip.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Loading: birth-data still resolving or chart calculating */}
        {(firstChart.isLoading ||
          (firstChart.data && chart.isLoading && !chart.data)) && (
          <View className="items-center py-12">
            <ActivityIndicator color="rgb(252, 211, 77)" size="small" />
            <Text className="mt-4 font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-500">
              изчисляваме картата
            </Text>
          </View>
        )}

        {/* Empty state: user has no chart */}
        {firstChart.data === null && (
          <View className="mt-4">
            <Text className="mb-5 text-[16px] font-light leading-[1.85] text-slate-200/90">
              Картата ти още не е настроена. Въведи рождените си данни, за да видиш наталната си карта.
            </Text>
            <Pressable
              onPress={() => router.push('/wizard/date')}
              className="self-start flex-row items-center rounded-full border border-amber-300/40 px-5 py-2.5"
              style={{ gap: 10 }}
            >
              <Text className="font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-amber-200">
                Въведи рождени данни
              </Text>
              <Text className="font-cinzel text-[10.5px] text-amber-300">›</Text>
            </Pressable>
          </View>
        )}

        {/* Error state */}
        {chart.isError && firstChart.data && (
          <View className="rounded-xl border border-rose-400/15 bg-rose-500/[0.04] px-4 py-3">
            <Text className="text-[14px] font-light leading-[1.6] text-rose-300/85">
              Грешка при зареждане на картата.
            </Text>
          </View>
        )}

        {/* Essence chip — Big Three + wheel */}
        {chart.data && firstChart.data && activeChip === 'essence' && (
          <>
            <View className="mb-8">
              <BigThreeCards
                sun={chart.data.planets.find((p) => p.planet === 'sun')!}
                moon={chart.data.planets.find((p) => p.planet === 'moon')!}
                ascendant={chart.data.ascendant}
                birthTimeKnown={firstChart.data.birth_time_known}
                selected={selection?.type ?? null}
                onSelect={handleBigThreeSelect}
              />
            </View>

            <View className="items-center">
              <NatalWheel
                chart={chart.data}
                size={wheelSize}
                onPlanetSelect={handlePlanetSelect}
                selectedPlanet={
                  selection && 'planet' in selection.data
                    ? selection.data.planet
                    : null
                }
              />
            </View>
          </>
        )}

        {/* Other chips — Phase B placeholder. Per SR 6 decision 5,
            details/aspects/houses lists deferred to keep SR 6 bounded. */}
        {chart.data && activeChip !== 'essence' && (
          <View className="mt-4 items-center py-12">
            <Text className="font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-500">
              скоро в Phase B
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Planet/Rising tap → bottom-sheet modal */}
      <PlanetDetail
        visible={selection !== null}
        planet={selection?.data ?? null}
        type={selection?.type ?? null}
        house={selection?.house}
        aspects={
          selection && 'planet' in (selection.data as object) && chart.data
            ? chart.data.aspects.filter(
                (a) =>
                  a.planet1 === (selection.data as PlanetPosition).planet ||
                  a.planet2 === (selection.data as PlanetPosition).planet,
              )
            : []
        }
        birthTimeKnown={firstChart.data?.birth_time_known ?? true}
        onClose={() => setSelection(null)}
      />
    </SafeAreaView>
  )
}
