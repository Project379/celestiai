import { useUser } from '@clerk/expo'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { ZODIAC_SIGNS_BG } from '@stellaeum/astrology/client'

import { font, pressFeedback } from '@/components/design-system/tokens'
import { useChart } from '@/hooks/useChart'
import { useFirstChart } from '@/hooks/useFirstChart'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'
import { getDisplayName } from '@/lib/clerk/displayName'
import { hapticSelect } from '@/lib/haptics'

// Systemic navbar-clearance rule (2026-07-27, audit) — see rhythm.tsx's
// matching comment; same flat-120 gap found and fixed here.
const TAB_BAR_BASE_HEIGHT = 56
const TAB_BAR_CLEARANCE = 52

// First four hints mirror apps/web/components/you/YouHub.tsx verbatim.
// Premium and Settings are mobile-only entries (web hosts them in the
// top-right UserMenu); their hints are bulgarian-skill-calibrated to match
// the surrounding voice (comma/«и» noun-list pattern). Each row carries a
// route; P.5 ships the navigation wiring, downstream sub-rounds (P.6/P.7/
// P.8/P.10/P.11) populate the destination content.
const SECTIONS = [
  { label: 'Кристали',    hint: 'месечни прозорци + дневна серия', route: '/you/crystals' as const        },
  { label: 'Дневник',     hint: 'лунен дневник — по три реда',     route: '/rhythm/journal' as const       },
  { label: 'Препоръки',   hint: 'месечни книги и филми',           route: '/you/recommendations' as const  },
  { label: 'Ръководство', hint: 'история, планети, аспекти, лунни фази', route: '/you/guide' as const     },
  { label: 'Премиум',     hint: 'абонамент и плащане',             route: '/you/premium' as const          },
  { label: 'Настройки',   hint: 'акаунт, поверителност, данни',    route: '/you/settings' as const         },
] as const

/**
 * Dynamic Big-Three subtitle (item 5.8). Resolves the user's sun + moon +
 * ascendant signs from chart data and renders them in Bulgarian via
 * ZODIAC_SIGNS_BG. Falls back to the literal generic label «Слънце ·
 * Луна · Асцендент» when no chart is loaded — preserves visual layout
 * during chart fetch + chart-less users (HT 3 ratification).
 */
const BIG_THREE_FALLBACK = 'Слънце · Луна · Асцендент'

function getBigThreeLabel(
  firstChart: ReturnType<typeof useFirstChart>['data'],
  chart: ReturnType<typeof useChart>['data'],
): string {
  if (!firstChart || !chart) return BIG_THREE_FALLBACK
  const sun = chart.planets.find((p) => p.planet === 'sun')?.sign
  const moon = chart.planets.find((p) => p.planet === 'moon')?.sign
  const rising = chart.ascendant.sign
  if (!sun || !moon || !rising) return BIG_THREE_FALLBACK
  const sunBg = ZODIAC_SIGNS_BG[sun as keyof typeof ZODIAC_SIGNS_BG]
  const moonBg = ZODIAC_SIGNS_BG[moon as keyof typeof ZODIAC_SIGNS_BG]
  const risingBg = ZODIAC_SIGNS_BG[rising as keyof typeof ZODIAC_SIGNS_BG]
  if (!sunBg || !moonBg || !risingBg) return BIG_THREE_FALLBACK
  return `${sunBg} · ${moonBg} · ${risingBg}`
}

export default function YouScreen() {
  const { push } = useGuardedNavigation()
  const { user } = useUser()
  const firstChart = useFirstChart()
  const chart = useChart(firstChart.data?.id)
  const insets = useSafeAreaInsets()

  const displayName = getDisplayName(user)
  const bigThree = getBigThreeLabel(firstChart.data, chart.data)

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        {/* REVISIT-42 fix (2026-07-27): font-cinzel on Cyrillic text —
            same fix as rhythm.tsx/circle.tsx. */}
        <Text style={{ fontFamily: font.bodyMedium }} className="mb-10 text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          Ти
        </Text>

        <View className="mb-10">
          <Text className="text-[26px] font-light text-slate-100">{displayName}</Text>
          <Text className="mt-1 text-[13px] text-slate-500">{bigThree}</Text>
        </View>

        <View>
          {SECTIONS.map((section, i) => (
            <Pressable
              key={section.label}
              onPress={() => {
                hapticSelect()
                push(section.route)
              }}
              accessibilityRole="button"
              className={`flex-row items-baseline justify-between py-5 ${
                i > 0 ? 'border-t border-slate-800/60' : ''
              }`}
              style={({ pressed }) => pressFeedback(pressed)}
            >
              <Text style={{ fontFamily: font.bodyMedium }} className="text-[11px] uppercase tracking-[0.32em] text-slate-200">
                {section.label}
              </Text>
              <Text className="text-[12px] text-slate-500">{section.hint}</Text>
            </Pressable>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}
