import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useUser } from '@clerk/expo'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { getLunarPhase } from '@stellaeum/core/moon-phase'
import {
  composeWelcome,
  daysUntilPeak,
  getActiveMeteorShower,
  getSunSign,
} from '@stellaeum/core/welcome'

import { parseSentinels } from '@stellaeum/core/oracle/planet-parser'

import { CrystalCard } from '@/components/CrystalCard'
import { useApiClient } from '@/lib/api/client'
import { useDailyHoroscope } from '@/hooks/useDailyHoroscope'

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

// Sun sigil dimensions (item 1.4, P.1-e). Ring matches web's 58×58 disc at
// DailyHoroscope.tsx:56; bloom SVG canvas is larger so the radial gradient
// extends visibly beyond the ring (mimics web's blur-xl/blur-md outer halo
// without expo-blur dep, per Conservative SDK defaults posture).
const SIGIL_RING_SIZE = 58
const SIGIL_BLOOM_SIZE = 96
const SIGIL_PULSE_MS = 2000 // half-cycle; full breath = 4s mirrors web
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// 12 hand-written Bulgarian one-liners per sun sign. Lifted verbatim from
// apps/web/components/dashboard/DashboardContent.tsx:59-72 (D2 mirror
// discipline — no calibration, zero net-new strings).
const SIGN_QUIPS: Record<string, string> = {
  'Овен':      'Марс пак те тласка напред - независимо дали имаш план или не. Поне изглежда убедено.',
  'Телец':     'Венера обещава удоволствие. Сатурн напомня за задълженията. Ти вероятно знаеш кое печели.',
  'Близнаци':  'Два гласа в главата ти не са проблем. Проблемът е, когато и двата са прави едновременно.',
  'Рак':       'Луната е в твоя ъгъл. Усещаш всичко - включително нещата, за които другите нямат думи.',
  'Лъв':       'Слънцето не е само за показ - но трябва да признаем, малко драма никога не е навредила.',
  'Дева':      'Меркурий анализира. Ти анализираш. Разликата е, че Меркурий спира в края на краищата.',
  'Везни':     'Везните са в баланс. За колко дълго - зависи от теб и от онзи имейл, на който все още не отговаряш.',
  'Скорпион':  'Плутон вижда всичко. Ти виждаш всичко. Фактически няма смисъл да крием нищо от никого.',
  'Стрелец':   'Юпитер е щедър. Ти - с добри намерения, непоследователни резултати и неоправдан оптимизъм. Работи.',
  'Козирог':   'Сатурн одобрява усилията ти. Малък, тих знак за одобрение - продължавай без суетене.',
  'Водолей':   'Уран прави нещата интересни. Ти правиш нещата странни. Разбирате се по начин, трудно обясним.',
  'Риби':      'Нептун замъглява. Ти мечтаеш. Понякога е трудно да се каже кое е кое - и не е задължително.',
}

// Planet key → hex color for the sentinel-color rendering on mobile
// (item 1.5). Mirrors web's PLANET_COLORS Tailwind class map in
// apps/web/components/horoscope/HoroscopeStream.tsx — each hex matches the
// Tailwind class's resolved color (e.g. text-amber-300 → #fcd34d).
// Hex-not-class is required because NativeWind v4 scans className strings
// statically at build time, so dynamic className from a Record lookup
// (e.g. PLANET_COLORS[chunk.planet]) doesn't survive the scan.
const PLANET_HEX_COLORS: Record<string, string> = {
  sun: '#fcd34d',        // text-amber-300
  moon: '#cbd5e1',       // text-slate-300
  mercury: '#67e8f9',    // text-cyan-300
  venus: '#f9a8d4',      // text-pink-300
  mars: '#f87171',       // text-red-400
  jupiter: '#fdba74',    // text-orange-300
  saturn: '#facc15',     // text-yellow-400
  uranus: '#5eead4',     // text-teal-300
  neptune: '#60a5fa',    // text-blue-400
  pluto: '#c084fc',      // text-purple-400
  northNode: '#a78bfa',  // text-violet-400
}
const PLANET_HEX_FALLBACK = '#c4b5fd' // text-violet-300

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
  const { user } = useUser()
  // Fallback mirrors apps/web/app/(protected)/dashboard/page.tsx:20 ('Потребител')
  // so the greeting block never renders «Добро утро, .» during Clerk hydration
  // or when a Clerk account has no firstName set.
  const firstName = user?.firstName?.trim() || 'Потребител'

  // P.1-d stub. Tier-fetch hook + ambient-header restructure (flex-row
  // justify-between) land at P.9; visual shape below mirrors web
  // DashboardContent.tsx:140-146 (amber hairline + diamond + «Premium»).
  const isPremium = false
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

  // sunSign at render scope so the sign-quip block (item 1.2) and the
  // welcome composer both consume the same derivation.
  const sunSign = chart?.birth_date ? getSunSign(chart.birth_date) : null

  // welcome.summary is the «Небесен ритъм» paragraph — phase opener × sign-
  // element flavor × optional meteor note. welcome.greeting is consumed by
  // the greeting block (item 1.1) for the time-of-day prefix.
  const welcome = useMemo(
    () =>
      composeWelcome({
        firstName,
        sunSign,
        lunarPhase,
        meteorShower,
        hour: hourSnapshot,
      }),
    [firstName, sunSign, lunarPhase, meteorShower, hourSnapshot],
  )

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
          {isPremium && (
            <View className="mt-3 flex-row items-center" style={{ gap: 10 }}>
              <View className="h-px w-8 bg-amber-300/40" />
              <View className="h-1 w-1 rotate-45 bg-amber-300/90" />
              <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-200/90">Premium</Text>
            </View>
          )}
        </View>

        {/* Greeting (item 1.1) — time-aware «{TOD}, {firstName}.» mirrors
            web's DashboardContent.tsx:163-170. firstName uses RN textShadow*
            style props for the warm halo instead of NativeWind's drop-shadow
            class — RN's text-shadow is the native equivalent for text glow,
            and the Tailwind drop-shadow utility maps to CSS `filter` which
            doesn't apply to Text. Option C per P.1-b ratification 2026-05-11
            (no gradient; faux halo via solid amber + text-shadow). */}
        <View className="mb-8">
          <Text className="text-[32px] leading-[1.2] tracking-tight">
            <Text className="font-light text-slate-300">
              {welcome.greeting.split(',')[0]},{' '}
            </Text>
            <Text
              className="font-semibold text-amber-200/95"
              style={{
                textShadowColor: 'rgba(251,191,36,0.22)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 28,
              }}
            >
              {firstName}.
            </Text>
          </Text>
        </View>

        {/* Hero reading area — Layer B. Branches on chart resolution state:
            - undefined (loading birth-data): blank space (D-4.7-3)
            - chart loaded: «Небесен ритъм» summary + sign quip + «Дневен
              хороскоп» eyebrow + LLM-generated horoscope content. Mirrors
              web's DashboardContent.tsx Layer B.
            - null (no chart): empty-state CTA mirroring web's DashboardContent. */}
        {chart && (
          <View className="mb-10">
            <Text className="mb-3 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
              Небесен ритъм
            </Text>
            <Text className="text-[16.5px] font-light leading-[1.8] text-slate-200">
              {welcome.summary}
            </Text>

            {/* Sign quip (item 1.2) — eyebrow with user's sun sign + one-liner
                from SIGN_QUIPS. Fallback string mirrors web's at
                DashboardContent.tsx:192. */}
            {sunSign && (
              <View className="mt-8">
                <Text className="mb-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-slate-300">
                  {sunSign}
                </Text>
                <Text className="text-[17px] font-light leading-[1.85] text-slate-200/95">
                  {SIGN_QUIPS[sunSign] ?? 'Звездите са в движение. Вселената е написала нещо за теб.'}
                </Text>
              </View>
            )}

            {/* Daily horoscope title block — animated sun sigil (item 1.4,
                P.1-e) → Oraculum Diei eyebrow → Дневен хороскоп h2 →
                reading's date. Decorative northNode divider lands at P.1-f
                (motion-polish ratification). */}
            <View className="mt-10 mb-6 items-center">
              <SunSigil />
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

// Animated sun sigil — item 1.4, P.1-e. Two-bloom + ring + glyph composition
// mirrors web DailyHoroscope.tsx:55-80. Animation: opacity oscillation on
// the two SVG RadialGradient blooms (outer violet, inner amber) at opposing
// phases over a 4s cycle. Cross-platform clean — no boxShadow animation
// (Android requires elevation, doesn't interpolate smoothly), no Gaussian
// blur (react-native-svg filter support is patchy on Android), no
// expo-linear-gradient dep (Conservative SDK defaults).
function SunSigil() {
  const outerOpacity = useSharedValue(0.6)
  const innerOpacity = useSharedValue(0.4)

  useEffect(() => {
    outerOpacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: SIGIL_PULSE_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: SIGIL_PULSE_MS, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
    innerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: SIGIL_PULSE_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: SIGIL_PULSE_MS, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
    // Cleanup on unmount — Reanimated 4.x holds the animation reference
    // internally on the shared value; cancelAnimation drops it so a
    // navigate-away/back doesn't leak the prior cycle.
    return () => {
      cancelAnimation(outerOpacity)
      cancelAnimation(innerOpacity)
    }
  }, [innerOpacity, outerOpacity])

  const outerProps = useAnimatedProps(() => ({ opacity: outerOpacity.value }))
  const innerProps = useAnimatedProps(() => ({ opacity: innerOpacity.value }))

  return (
    <View
      style={{
        width: SIGIL_BLOOM_SIZE,
        height: SIGIL_BLOOM_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
      }}
    >
      <Svg
        width={SIGIL_BLOOM_SIZE}
        height={SIGIL_BLOOM_SIZE}
        style={{ position: 'absolute' }}
      >
        <Defs>
          <RadialGradient id="sigil-violet" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.30" />
            <Stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="sigil-amber" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="rgb(251, 191, 36)" stopOpacity="0.20" />
            <Stop offset="60%" stopColor="rgb(251, 191, 36)" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="rgb(251, 191, 36)" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <AnimatedCircle
          cx={SIGIL_BLOOM_SIZE / 2}
          cy={SIGIL_BLOOM_SIZE / 2}
          r={SIGIL_BLOOM_SIZE / 2}
          fill="url(#sigil-violet)"
          animatedProps={outerProps}
        />
        <AnimatedCircle
          cx={SIGIL_BLOOM_SIZE / 2}
          cy={SIGIL_BLOOM_SIZE / 2}
          r={SIGIL_BLOOM_SIZE / 2.5}
          fill="url(#sigil-amber)"
          animatedProps={innerProps}
        />
      </Svg>
      <View
        style={{
          width: SIGIL_RING_SIZE,
          height: SIGIL_RING_SIZE,
          borderRadius: SIGIL_RING_SIZE / 2,
          borderWidth: 1,
          borderColor: 'rgba(226, 232, 240, 0.20)', // slate-200/20
          backgroundColor: 'rgba(139, 92, 246, 0.08)', // flat violet tint, no gradient
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Sun glyph — two concentric circles mirror SunIcon at
            apps/web/components/icons/CelestialIcons.tsx:67-75. */}
        <Svg width={26} height={26} viewBox="0 0 24 24">
          <Circle
            cx={12}
            cy={12}
            r={6}
            fill="none"
            stroke="rgb(254, 243, 199)" // amber-100
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={12} cy={12} r={1.2} fill="rgb(254, 243, 199)" />
        </Svg>
      </View>
    </View>
  )
}

function HoroscopeBody({ content }: { content: string }) {
  // Split paragraphs first (raw \n\n+ on content with sentinels intact),
  // then parse each paragraph's chunks for coloring. Mirrors web's
  // HoroscopeStream order: paragraph-then-parse keeps sentinel boundaries
  // paragraph-local. Planet mentions render as nested <Text> with inline
  // style.color (item 1.5, P.1-c).
  const paragraphs = useMemo(
    () =>
      content
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => parseSentinels(p)),
    [content],
  )
  return (
    <View>
      {paragraphs.map((chunks, i) => (
        <Text
          key={i}
          className="text-[16.5px] font-light leading-[1.8] text-slate-200"
          style={{ marginTop: i === 0 ? 0 : 14 }}
        >
          {chunks.map((chunk, j) => {
            if (chunk.planet) {
              const color = PLANET_HEX_COLORS[chunk.planet] ?? PLANET_HEX_FALLBACK
              return (
                <Text key={j} style={{ color, fontWeight: '500' }}>
                  {chunk.text}
                </Text>
              )
            }
            return chunk.text
          })}
        </Text>
      ))}
    </View>
  )
}
