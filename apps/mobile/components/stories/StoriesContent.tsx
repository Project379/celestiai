import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { getLunarPhase, type LunarPhase } from '@stellaeum/core/moon-phase'
import {
  getDailyForPhase,
  getMonthlyArcForSign,
} from '@stellaeum/core/stories/catalog'

import { RecommendationCard } from './RecommendationCard'
import { pressFeedback } from '@/components/design-system/tokens'
import { useStoryList } from '@/hooks/useStoryList'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'

const KIND_SECTION_LABEL: Record<'book' | 'film' | 'series' | 'episode' | 'story', string> = {
  book: 'Книга за месеца',
  film: 'Филм за месеца',
  series: 'Сериал за месеца',
  episode: 'Епизод за месеца',
  story: 'Разказ за месеца',
}

const BG_DATE = new Intl.DateTimeFormat('bg-BG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Sofia',
})

const BG_MONTH_YEAR = new Intl.DateTimeFormat('bg-BG', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Sofia',
})

interface StoriesContentProps {
  sunSign: string | null
}

/**
 * Препоръки root — daily + monthly arc + footer. Mobile port of
 * apps/web/components/stories/StoriesContent.tsx (P.7-c2).
 *
 * Live phase 60s update mirrors LunarPhaseCard / DiaryContent cadence.
 * Ambient SVG radial-gradient overlays at hero per established pattern
 * (P.2-e / P.3-b / P.4-c1). framer-motion fadeUp variants dropped per
 * HT 8 (data-display discipline).
 *
 * Chart-less branch renders simple empty-state with /wizard/date CTA per
 * HT 5 ratification — does NOT mirror web's MonthlyPreviewWithoutChart
 * Лъв sample preview. Mobile's B.0g-3 forced wizard handles chart-less
 * conversion; this surface stays product-honest about the dependency
 * rather than running a sample-preview conversion loop.
 */
export function StoriesContent({ sunSign }: StoriesContentProps) {
  const { push } = useGuardedNavigation()
  const [phase, setPhase] = useState<LunarPhase>(() => getLunarPhase())
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date()
      setNow(d)
      setPhase(getLunarPhase(d))
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const today = useMemo(() => BG_DATE.format(now), [now])
  const thisMonth = useMemo(() => BG_MONTH_YEAR.format(now), [now])

  const daily = getDailyForPhase(phase.id)
  const arc = getMonthlyArcForSign(sunSign)

  const { getStatus, setStatus, isLoaded } = useStoryList()

  return (
    <View>
      {/* Hero with ambient SVG radial-gradient overlays */}
      <View className="relative mb-12">
        <View
          pointerEvents="none"
          className="absolute"
          style={{ left: -120, top: -120, width: 360, height: 360, opacity: 0.7 }}
        >
          <Svg width={360} height={360}>
            <Defs>
              <RadialGradient id="storiesHeroViolet" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%"  stopColor="rgba(167,139,250,1)" stopOpacity="0.10" />
                <Stop offset="55%" stopColor="rgba(167,139,250,1)" stopOpacity="0.04" />
                <Stop offset="85%" stopColor="rgba(0,0,0,0)"        stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="360" height="360" fill="url(#storiesHeroViolet)" />
          </Svg>
        </View>
        <View
          pointerEvents="none"
          className="absolute"
          style={{ right: -80, top: 40, width: 220, height: 220, opacity: 0.6 }}
        >
          <Svg width={220} height={220}>
            <Defs>
              <RadialGradient id="storiesHeroAmber" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%"  stopColor="rgba(251,191,36,1)" stopOpacity="0.07" />
                <Stop offset="55%" stopColor="rgba(251,191,36,1)" stopOpacity="0.025" />
                <Stop offset="85%" stopColor="rgba(0,0,0,0)"       stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="220" height="220" fill="url(#storiesHeroAmber)" />
          </Svg>
        </View>

        <View className="flex-row items-center" style={{ gap: 12 }}>
          <View className="h-px w-5 bg-slate-300/40" />
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
            Препоръки · За твоето небе
          </Text>
        </View>

        <Text className="mt-5 text-[28px] leading-[1.2] tracking-tight">
          <Text className="font-light text-slate-300">Кратко днес, </Text>
          <Text className="font-semibold text-amber-200/95">дълго през месеца.</Text>
        </Text>

        <Text className="mt-5 text-[15.5px] font-light leading-[1.85] text-slate-300">
          Една препоръка за тази вечер — разказ, епизод или филм, подбран по лунната фаза. И една двойка за целия месец — книга с филм или книга със сериал, водени от слънчевия ти знак.
        </Text>

        <View className="mt-6 flex-row flex-wrap items-center" style={{ gap: 10 }}>
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-300">
            {today}
          </Text>
          <View className="h-[3px] w-[3px] rotate-45 bg-slate-400/80" />
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text className="text-[12px] leading-none text-amber-200/90">☾</Text>
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/90">
              {phase.name}
            </Text>
          </View>
        </View>
      </View>

      {/* Today's pick */}
      <View className="mb-16">
        <View className="mb-5 flex-row items-baseline" style={{ gap: 16 }}>
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-200">
            Днес
          </Text>
          <View className="h-px flex-1 bg-slate-300/15" />
          <Text className="font-cinzel text-[9.5px] uppercase tracking-[0.28em] text-slate-500">
            избор по лунната фаза
          </Text>
        </View>

        {isLoaded ? (
          <RecommendationCard
            recommendation={daily}
            status={getStatus(daily.id)}
            onStatusChange={(s) => setStatus(daily.id, s)}
            variant="daily"
          />
        ) : (
          <Text className="py-8 text-[14px] text-slate-500">
            Зареждам препоръката...
          </Text>
        )}
      </View>

      {/* Monthly arc — book + film/series */}
      <View className="mb-16">
        <View className="mb-5 flex-row items-baseline" style={{ gap: 16 }}>
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-200">
            За целия месец · {thisMonth}
          </Text>
          <View className="h-px flex-1 bg-slate-300/15" />
        </View>

        {arc && isLoaded && (
          <>
            <View className="mb-12">
              <View className="flex-row flex-wrap items-center" style={{ gap: 10 }}>
                <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.34em] text-amber-300/90">
                  {arc.sunSign}
                </Text>
                <View className="h-[3px] w-[3px] rotate-45 bg-amber-300/60" />
                <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-300">
                  {arc.theme}
                </Text>
              </View>
              <Text className="mt-4 text-[15.5px] font-light leading-[1.85] text-slate-200/95">
                {arc.themeSummary}
              </Text>
            </View>

            <View style={{ gap: 64 }}>
              <View>
                <SectionLabel text={KIND_SECTION_LABEL[arc.primary.kind]} />
                <RecommendationCard
                  recommendation={arc.primary}
                  status={getStatus(arc.primary.id)}
                  onStatusChange={(s) => setStatus(arc.primary.id, s)}
                  variant="monthly"
                />
              </View>
              <View>
                <SectionLabel text={KIND_SECTION_LABEL[arc.companion.kind]} />
                <RecommendationCard
                  recommendation={arc.companion}
                  status={getStatus(arc.companion.id)}
                  onStatusChange={(s) => setStatus(arc.companion.id, s)}
                  variant="monthly"
                />
              </View>
            </View>
          </>
        )}

        {!arc && isLoaded && (
          <View>
            <Text className="mb-5 text-[16px] font-light leading-[1.85] text-slate-200/90">
              За да виждаш препоръките си, първо трябва да имаш натална карта.
            </Text>
            <Pressable
              onPress={() => push('/wizard/date')}
              className="self-start flex-row items-center rounded-full border border-amber-300/40 px-5 py-2.5"
              style={({ pressed }) => ({ ...pressFeedback(pressed), gap: 10 })}
            >
              <Text className="font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-amber-200">
                Въведи рождени данни
              </Text>
              <Text className="font-cinzel text-[10.5px] text-amber-300">›</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View className="mt-4 border-t border-slate-300/[0.07] pt-8">
        <Text className="text-[14px] font-light leading-[1.85] text-slate-500">
          Препоръките са подбрани спрямо лунната фаза и слънчевия ти знак. С времето ще се учат и от цялата ти натална карта, и от текущите транзити.
        </Text>
      </View>
    </View>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <View className="mb-5 flex-row items-center" style={{ gap: 12 }}>
      <View className="h-1 w-1 rotate-45 bg-amber-300/80" />
      <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-200">
        {text}
      </Text>
      <View className="h-px flex-1 bg-slate-300/15" />
    </View>
  )
}
