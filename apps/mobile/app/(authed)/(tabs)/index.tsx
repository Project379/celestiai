import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { getLunarPhase } from '@stellaeum/core/moon-phase'
import {
  composeWelcome,
  daysUntilPeak,
  getActiveMeteorShower,
  getSunSign,
} from '@stellaeum/core/welcome'

import { CrystalCard } from '@/components/CrystalCard'
import { useApiClient } from '@/lib/api/client'
import { useDailyHoroscope, stripPlanetSentinels } from '@/hooks/useDailyHoroscope'

interface ChartSummary {
  id: string
  birth_date: string
}

const BG_DATE_FORMAT = new Intl.DateTimeFormat('bg-BG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Sofia',
})

// Daily horoscope title-block subtitle format mirrors web's
// DailyHoroscope.tsx BG_DATE_FORMAT: day numeric + month long + year numeric,
// no weekday. Web uses this to anchor the «Дневен хороскоп» card with the
// reading's date.
const BG_HOROSCOPE_DATE_FORMAT = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Sofia',
})

// Лунна фаза tile countdown text — mirrors web's LunarTile.formatCountdown
// (apps/web/components/dashboard/tiles/LunarTile.tsx). Returns Bulgarian
// strings for time-until the next major lunar event.
function formatCountdown(daysAway: number): string {
  if (daysAway < 1 / 24) return 'съвсем скоро'
  const days = Math.floor(daysAway)
  const hours = Math.floor((daysAway - days) * 24)
  if (days === 0) return `${hours} ч`
  if (hours === 0) return `${days} д`
  return `${days} д ${hours} ч`
}

export default function DnesScreen() {
  const router = useRouter()
  const { apiFetch } = useApiClient()
  // undefined = still resolving, null = no chart, ChartSummary = chart loaded.
  // Tracks both id (for the horoscope query) and birth_date (for sun-sign
  // computation in composeWelcome) so a single GET /api/birth-data response
  // serves both purposes.
  const [chart, setChart] = useState<ChartSummary | null | undefined>(undefined)
  const horoscope = useDailyHoroscope(chart?.id)

  // Single `now` snapshot per mount — date, lunar phase, meteor shower, and
  // hour-of-day all derive from the same moment so welcome composition stays
  // internally consistent. A re-mount past midnight Sofia produces a new
  // snapshot; intra-session midnight ticks aren't covered (acceptable for
  // launch — web does setInterval here, mobile defers that polish).
  const { todayFormatted, horoscopeDateFormatted, lunarPhase, hourSnapshot, meteorShower, meteorPeakDays } = useMemo(() => {
    const now = new Date()
    const shower = getActiveMeteorShower(now)
    return {
      todayFormatted: BG_DATE_FORMAT.format(now),
      horoscopeDateFormatted: BG_HOROSCOPE_DATE_FORMAT.format(now),
      lunarPhase: getLunarPhase(now),
      hourSnapshot: now.getHours(),
      meteorShower: shower,
      meteorPeakDays: shower ? daysUntilPeak(shower) : null,
    }
  }, [])

  // welcome.summary is the «Небесен ритъм» paragraph — phase opener × sign-
  // element flavor × optional meteor note. firstName is empty because the
  // greeting block (#1) is deferred to a future polish round; composeWelcome
  // uses firstName only for the greeting line which we don't render.
  const welcome = useMemo(() => {
    const sunSign = chart?.birth_date ? getSunSign(chart.birth_date) : null
    return composeWelcome({
      firstName: '',
      sunSign,
      lunarPhase,
      meteorShower,
      hour: hourSnapshot,
    })
  }, [chart?.birth_date, lunarPhase, meteorShower, hourSnapshot])

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
            const first = data[0] as { id?: unknown; birth_date?: unknown }
            if (typeof first.id === 'string' && typeof first.birth_date === 'string') {
              setChart({ id: first.id, birth_date: first.birth_date })
            } else {
              setChart(null)
            }
          } else {
            setChart(null)
          }
        })
        .catch(() => {
          // D-4.7-4: assume no chart on fetch failure.
          if (!cancelled) setChart(null)
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
            ☾  {lunarPhase.name}
          </Text>
        </View>

        {/* Hero reading area — Layer B. Branches on chart resolution state:
            - undefined (loading birth-data): blank space (D-4.7-3)
            - chart loaded: «Небесен ритъм» welcome.summary paragraph followed
              by «Дневен хороскоп» eyebrow + LLM-generated horoscope content.
              Mirrors web's DashboardContent.tsx blocks #2 and #4. Block #1
              (greeting h1) and #3 (sign quip) deferred per mid-scope ratification.
            - null (no chart): empty-state CTA mirroring web's DashboardContent. */}
        {chart && (
          <View className="mb-10">
            <Text className="mb-3 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
              Небесен ритъм
            </Text>
            <Text className="text-[16.5px] font-light leading-[1.8] text-slate-200">
              {welcome.summary}
            </Text>

            {/* Daily horoscope title block — three-line stack mirrors web's
                DailyHoroscope.tsx (Oraculum Diei eyebrow → Дневен хороскоп
                h2 → reading's date). Web also surrounds this with an
                animated sun sigil and a decorative northNode divider; mobile
                renders text-only for now (visual richness is a future
                polish round). */}
            <View className="mt-10 mb-6 items-center">
              <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-200/85">
                Oraculum Diei
              </Text>
              <Text className="mt-2 text-[22px] font-semibold tracking-tight text-white">
                Дневен хороскоп
              </Text>
              <Text className="mt-1.5 text-[12.5px] font-light text-slate-400">
                {horoscopeDateFormatted}
              </Text>
            </View>

            <View>
              {horoscope.isLoading && (
                <View className="items-center py-6">
                  <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
                    Stellaeum
                  </Text>
                  <Text className="mt-2 text-[14px] font-light leading-relaxed text-slate-300">
                    консултира звездите…
                  </Text>
                </View>
              )}
              {horoscope.isError && !horoscope.data?.content && (
                <View className="rounded-xl border border-rose-400/15 bg-rose-500/[0.04] px-4 py-3">
                  <Text className="text-[14px] font-light leading-[1.6] text-rose-300/85">
                    Звездите мълчат - опитай отново след миг.
                  </Text>
                </View>
              )}
              {horoscope.data?.unavailable && !horoscope.data?.content && (
                <Text className="text-[15px] font-light leading-[1.8] text-slate-400 italic">
                  Вчерашното послание вече е отминало.
                </Text>
              )}
              {horoscope.data?.content && <HoroscopeBody content={horoscope.data.content} />}
            </View>
          </View>
        )}

        {chart === null && (
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

        {/* Bento launchpad — Layer C (2×2 grid). P.1-a parity port:
            - CrystalCard: data-driven via /api/crystals/today (item 1.10
              accepted divergence — mobile shows brief loading shimmer where
              web pre-fetches via Server Component; Expo Router server
              components don't exist in this codebase).
            - LunarTile: data-driven from lunarPhase + meteorShower (item 1.7).
            - TransitTile: static placeholder copy matching web's current
              state (item 1.8 — web's TransitTile.tsx is also a static link
              card; data-driven top-transit deferred for both surfaces).
            - CircleTile: empty-state CTA with subtitle (item 1.9 — Friends
              groups deferred per founder ratification 2026-05-09).
            Tile-tap navigation unenumerated, deferred until destinations
            exist on mobile (P.6 /you/crystals, P.3 /rhythm, etc.). */}
        <View className="mb-10 flex-row flex-wrap gap-3">
          <CrystalCard />
          <View className="flex-1 min-w-[46%] rounded-2xl border border-violet-400/25 px-4 py-5">
            <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-violet-300/90">
              Лунна фаза
            </Text>
            <Text className="mt-3 text-[15px] font-light text-slate-100">
              {lunarPhase.name}
            </Text>
            <Text className="mt-1 font-cinzel text-[9.5px] uppercase tracking-[0.26em] text-slate-500">
              {lunarPhase.illumination}% осветление
            </Text>
            <Text className="mt-4 text-[12px] font-light text-slate-400">
              <Text className="text-amber-300/80">☾ </Text>
              до {lunarPhase.nextMajor.name.toLowerCase()} · <Text className="text-slate-200">{formatCountdown(lunarPhase.nextMajor.daysAway)}</Text>
            </Text>
            {meteorShower && (
              <Text className="mt-2 text-[12px] font-light text-amber-300/80">
                ☄ {meteorShower.name}
                {meteorPeakDays !== null && meteorPeakDays > 0 && ` · пик след ${meteorPeakDays} д`}
                {meteorPeakDays === 0 && ' · пик тази нощ'}
              </Text>
            )}
          </View>
          <View className="flex-1 min-w-[46%] rounded-2xl border border-slate-700/60 px-4 py-5">
            <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-slate-400">
              Транзити
            </Text>
            <Text className="mt-3 text-[15px] font-light text-slate-100">Небесно време</Text>
            <Text className="mt-1 text-[12px] font-light text-slate-500">активните аспекти към картата ти</Text>
            <Text className="mt-4 font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-600">виж всички</Text>
          </View>
          <View className="flex-1 min-w-[46%] rounded-2xl border border-rose-400/20 px-4 py-5">
            <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-rose-300/90">
              Кръг
            </Text>
            <Text className="mt-3 text-[15px] font-light text-slate-100">Добави човек</Text>
            <Text className="mt-1 text-[12px] font-light text-slate-500">партньор · приятел · crush</Text>
          </View>
        </View>

        {/* Streak footer — Layer D. Hidden in empty state (mirrors web). */}
        {chart && (
          <Text className="text-center font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
            · небесен ритъм ·
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
