import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { RecommendationCard } from './RecommendationCard'
import { PremiumLock, TierGateLoading } from '@/components/tier/PremiumLock'
import { pressFeedback } from '@/components/design-system/tokens'
import { RECS_MONTHLY_LOCKED } from '@/lib/tier/locked-copy'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'
import { useRecommendations } from '@/hooks/useRecommendations'

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
  chartId: string | null | undefined
  isPremium?: boolean
}

export function StoriesContent({ chartId, isPremium }: StoriesContentProps) {
  const tierPending = isPremium === undefined
  const { push } = useGuardedNavigation()
  const [now, setNow] = useState(() => new Date())
  const { data, isLoading, error, mutatingDeliveryId, refetch, setFeedback, reroll } =
    useRecommendations(chartId)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const today = useMemo(() => BG_DATE.format(now), [now])
  const thisMonth = useMemo(() => BG_MONTH_YEAR.format(now), [now])

  return (
    <View>
      <View className="relative mb-12">
        <View pointerEvents="none" className="absolute" style={{ left: -120, top: -120, width: 360, height: 360, opacity: 0.7 }}>
          <Svg width={360} height={360}>
            <Defs>
              <RadialGradient id="recommendationViolet" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="rgba(167,139,250,1)" stopOpacity="0.10" />
                <Stop offset="55%" stopColor="rgba(167,139,250,1)" stopOpacity="0.04" />
                <Stop offset="85%" stopColor="rgba(0,0,0,0)" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="360" height="360" fill="url(#recommendationViolet)" />
          </Svg>
        </View>

        <View className="flex-row items-center" style={{ gap: 12 }}>
          <View className="h-px w-5 bg-slate-300/40" />
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
            Препоръки · За твоето небе
          </Text>
        </View>
        <Text className="mt-5 text-[28px] leading-[1.2] tracking-tight">
          <Text className="font-light text-slate-300">Филм днес, </Text>
          <Text className="font-semibold text-bronze-text/95">книга за месеца.</Text>
        </Text>
        <Text className="mt-5 text-[15.5px] font-light leading-[1.85] text-slate-300">
          Подбрани първо според небето ти, а с времето и според това, което запазваш и оценяваш.
        </Text>
        <View className="mt-6 flex-row flex-wrap items-center" style={{ gap: 10 }}>
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-300">{today}</Text>
          {data && (
            <>
              <View className="h-[3px] w-[3px] rotate-45 bg-slate-400/80" />
              <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.25em] text-bronze-text/90">
                ☾ {data.personalization.lunarPhase.name}
              </Text>
            </>
          )}
        </View>
      </View>

      {chartId === null && !isLoading && (
        <View className="mb-8 border-l border-bronze/40 bg-bronze/[0.04] px-5 py-3">
          <Text className="text-[14px] font-light leading-[1.75] text-slate-300">
            Засега използваме лунната фаза. Добави рождени данни за по-личен избор.
          </Text>
          <Pressable
            onPress={() => push('/wizard/date')}
            className="mt-3 self-start"
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.28em] text-bronze-text">
              Добави рождени данни ›
            </Text>
          </Pressable>
        </View>
      )}

      {error && (
        <View className="mb-8 rounded-2xl border border-rose-300/15 bg-rose-400/[0.04] p-5">
          <Text className="text-[14px] text-slate-300">Не успяхме да заредим препоръките.</Text>
          <Pressable onPress={() => void refetch()} className="mt-3" style={({ pressed }) => pressFeedback(pressed)}>
            <Text className="font-cinzel text-[10px] uppercase tracking-[0.28em] text-bronze-text">Опитай отново</Text>
          </Pressable>
        </View>
      )}

      {isLoading && !data && (
        <Text className="py-12 text-[14px] text-slate-500">Подреждаме препоръките...</Text>
      )}

      {data && (
        <>
          <View className="mb-16">
            <SectionHeader title="Филм за днес" aside="избор по лунната фаза" />
            {data.dailyMovie ? (
              <RecommendationCard
                key={data.dailyMovie.deliveryId}
                recommendation={data.dailyMovie}
                onFeedback={setFeedback}
                onReroll={reroll}
                isMutating={mutatingDeliveryId === data.dailyMovie.deliveryId}
                variant="daily"
              />
            ) : (
              <EmptyRecommendation media="филм" />
            )}
          </View>

          <View className="mb-16">
            <SectionHeader title={`Книга за месеца · ${thisMonth}`} />
            {tierPending && (
              <View className="mb-8"><TierGateLoading variant="block" /></View>
            )}
            {isPremium === false && (
              <View className="mb-8">
                <PremiumLock title={RECS_MONTHLY_LOCKED.title} sub={RECS_MONTHLY_LOCKED.sub} />
              </View>
            )}
            {!tierPending && (data.monthlyBook ? (
              <RecommendationCard
                key={data.monthlyBook.deliveryId}
                recommendation={data.monthlyBook}
                onFeedback={setFeedback}
                onReroll={reroll}
                isMutating={mutatingDeliveryId === data.monthlyBook.deliveryId}
                variant="monthly"
                locked={isPremium === false}
              />
            ) : (
              <EmptyRecommendation media="книга" />
            ))}
          </View>
        </>
      )}

      <View className="mt-4 border-t border-slate-300/[0.07] pt-8">
        <Text className="text-[14px] font-light leading-[1.85] text-slate-500">
          Гледаното и прочетеното не означават автоматично, че са ти харесали. Само изричната ти оценка променя вкусовия профил в тази посока.
        </Text>
      </View>
    </View>
  )
}

function SectionHeader({ title, aside }: { title: string; aside?: string }) {
  return (
    <View className="mb-5 flex-row items-baseline" style={{ gap: 12 }}>
      <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.36em] text-slate-200">{title}</Text>
      <View className="h-px flex-1 bg-slate-300/15" />
      {aside && <Text className="font-cinzel text-[8.5px] uppercase tracking-[0.22em] text-slate-500">{aside}</Text>}
    </View>
  )
}

function EmptyRecommendation({ media }: { media: 'филм' | 'книга' }) {
  return (
    <View className="rounded-2xl border border-slate-300/[0.08] p-6">
      <Text className="text-[14px] font-light leading-relaxed text-slate-500">
        В момента няма проверен {media} за този период. Ще покажем такъв след следващия преглед на каталога.
      </Text>
    </View>
  )
}
