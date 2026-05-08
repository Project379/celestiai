import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { getLunarPhase } from '@stellaeum/core/moon-phase'

import { CrystalCard } from '@/components/CrystalCard'
import { useApiClient } from '@/lib/api/client'
import { useDailyHoroscope, stripPlanetSentinels } from '@/hooks/useDailyHoroscope'

const BG_DATE_FORMAT = new Intl.DateTimeFormat('bg-BG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Sofia',
})

const TILE_CLASS =
  'flex-1 min-w-[46%] rounded-2xl border border-violet-stellaeum/25 px-4 py-5'
const TILE_LABEL_CLASS =
  'font-cinzel text-[9px] uppercase tracking-[0.32em] text-amber-300/80'
const TILE_HINT_CLASS = 'mt-2 text-[13.5px] font-light text-slate-200'

export default function DnesScreen() {
  const router = useRouter()
  const { apiFetch } = useApiClient()
  // undefined = still resolving, null = no chart, string = chart UUID.
  const [chartId, setChartId] = useState<string | null | undefined>(undefined)
  const horoscope = useDailyHoroscope(chartId)

  // Single `now` snapshot per render — date + lunar phase derive from the
  // same moment so they can never disagree across the «midnight tick» edge.
  const { todayFormatted, lunarPhase } = useMemo(() => {
    const now = new Date()
    return {
      todayFormatted: BG_DATE_FORMAT.format(now),
      lunarPhase: getLunarPhase(now),
    }
  }, [])

  // Refetch on focus so post-wizard-submit returning to Днес reflects
  // the newly created chart even if the screen wasn't unmounted by the
  // expo-router replace from /wizard/confirm.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      apiFetch('/api/birth-data')
        .then((data) => {
          if (cancelled) return
          if (Array.isArray(data) && data.length > 0) {
            const first = data[0] as { id?: unknown }
            setChartId(typeof first.id === 'string' ? first.id : null)
          } else {
            setChartId(null)
          }
        })
        .catch(() => {
          // D-4.7-4: assume no chart on fetch failure.
          if (!cancelled) setChartId(null)
        })
      return () => {
        cancelled = true
      }
    }, [apiFetch]),
  )

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 }}
      >
        {/* Ambient header — scan in 2s (MOBILE_UX_RESEARCH §2.1 Layer A) */}
        <View className="mb-10">
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
            {todayFormatted}
          </Text>
          <Text className="mt-2 font-cinzel text-[11px] uppercase tracking-[0.32em] text-amber-200/90">
            ☾  {lunarPhase.name} · ден {Math.round(lunarPhase.phaseDay)}
          </Text>
        </View>

        {/* Hero reading area — Layer B. Branches on chart resolution state:
            - undefined (loading birth-data): blank space (D-4.7-3)
            - string (chart exists): daily horoscope content under «Небесен ритъм»
              eyebrow. Sub-round 5.4 will rearrange this — «Небесен ритъм»
              becomes welcome.summary from composeWelcome, daily horoscope
              moves to its own block. For 5.3 they share the eyebrow.
            - null (no chart): empty-state CTA mirroring web's DashboardContent. */}
        {chartId && (
          <View className="mb-10">
            <Text className="mb-3 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
              Небесен ритъм
            </Text>
            {horoscope.isLoading && (
              <Text className="text-[15px] font-light leading-[1.8] text-slate-400 italic">
                Звездите шепнат…
              </Text>
            )}
            {horoscope.isError && !horoscope.data?.content && (
              <View className="rounded-xl border border-rose-400/15 bg-rose-500/[0.04] px-4 py-3">
                <Text className="text-[14px] font-light leading-[1.6] text-rose-300/85">
                  Звездите мълчат — опитай отново след миг.
                </Text>
              </View>
            )}
            {horoscope.data?.unavailable && !horoscope.data?.content && (
              <Text className="text-[15px] font-light leading-[1.8] text-slate-400 italic">
                Хороскопът за днес още не е готов.
              </Text>
            )}
            {horoscope.data?.content && <HoroscopeBody content={horoscope.data.content} />}
          </View>
        )}

        {chartId === null && (
          <View className="mb-10">
            <Text className="mb-3 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
              Небесен ритъм
            </Text>
            <Text className="mb-5 text-[16px] font-light leading-[1.8] text-slate-200/90">
              Картата ти още не е настроена. Въведи рождените си данни, за да видиш хороскопа, наталната карта и транзитите.
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

        {/* Bento launchpad — Layer C (2×2 grid). Crystal tile is data-driven
            via <CrystalCard /> (sub-round 2). Other three remain hardcoded
            until their respective endpoints land. Renders in both empty
            and existing-chart states (mirrors web). */}
        <View className="mb-10 flex-row flex-wrap gap-3">
          <CrystalCard />
          <View className={TILE_CLASS}>
            <Text className={TILE_LABEL_CLASS}>Лунна фаза</Text>
            <Text className={TILE_HINT_CLASS}>Ден 7/29</Text>
          </View>
          <View className={TILE_CLASS}>
            <Text className={TILE_LABEL_CLASS}>Транзит</Text>
            <Text className={TILE_HINT_CLASS}>Венера △ Сатурн</Text>
          </View>
          <View className={TILE_CLASS}>
            <Text className={TILE_LABEL_CLASS}>Кръг</Text>
            <Text className={TILE_HINT_CLASS}>Добави човек</Text>
          </View>
        </View>

        {/* Streak footer — Layer D. Hidden in empty state (mirrors web). */}
        {chartId && (
          <Text className="text-center font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
            · серия 12 ·
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function HoroscopeBody({ content }: { content: string }) {
  const paragraphs = useMemo(
    () =>
      stripPlanetSentinels(content)
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean),
    [content],
  )
  return (
    <View>
      {paragraphs.map((paragraph, i) => (
        <Text
          key={i}
          className="text-[16.5px] font-light leading-[1.8] text-slate-200"
          style={{ marginTop: i === 0 ? 0 : 14 }}
        >
          {paragraph}
        </Text>
      ))}
    </View>
  )
}
