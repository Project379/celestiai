import { useClerk, useUser } from '@clerk/expo'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { ZODIAC_SIGNS_BG } from '@stellaeum/astrology/client'

import { useChart } from '@/hooks/useChart'
import { useFirstChart } from '@/hooks/useFirstChart'

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
  { label: 'Ръководство', hint: 'планети, знаци, къщи, аспекти',   route: '/you/guide' as const            },
  { label: 'Премиум',     hint: 'абонамент и плащане',             route: '/you/premium' as const          },
  { label: 'Настройки',   hint: 'акаунт, поверителност, известия', route: '/you/settings' as const         },
] as const

function getDisplayName(user: ReturnType<typeof useUser>['user']): string {
  if (!user) return 'Ти'
  const first = user.firstName?.trim() ?? ''
  const last = user.lastName?.trim() ?? ''
  const full = [first, last].filter(Boolean).join(' ')
  if (full) return full
  const email = user.primaryEmailAddress?.emailAddress ?? ''
  const username = email.split('@')[0]
  return username || 'Ти'
}

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
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()
  const firstChart = useFirstChart()
  const chart = useChart(firstChart.data?.id)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      if (__DEV__) console.warn('[YouScreen] signOut failed:', err)
    }
  }

  const displayName = getDisplayName(user)
  const bigThree = getBigThreeLabel(firstChart.data, chart.data)

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 }}
      >
        <Text className="mb-10 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
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
              onPress={() => router.push(section.route)}
              accessibilityRole="button"
              className={`flex-row items-baseline justify-between py-5 ${
                i > 0 ? 'border-t border-slate-800/60' : ''
              }`}
            >
              <Text className="font-cinzel text-[11px] uppercase tracking-[0.32em] text-slate-200">
                {section.label}
              </Text>
              <Text className="text-[12px] text-slate-500">{section.hint}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Излез"
          className="mt-16 self-center rounded-2xl border border-slate-700/60 px-8 py-3"
        >
          <Text className="font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-200">
            Излез
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
