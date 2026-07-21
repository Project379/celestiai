import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LunarPhaseCard } from '@/components/dashboard/LunarPhaseCard'
import { TransitOverviewCard } from '@/components/horoscope/TransitOverviewCard'
import { useFirstChart } from '@/hooks/useFirstChart'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'

/**
 * Ритъм tab — current-sky reading. Mobile port of
 * apps/web/app/(protected)/rhythm/page.tsx (P.3-a opener).
 *
 * P.3-a ships the skeleton: hero «Какво ти влияе сега» + diary CTA card
 * linking to /rhythm/journal + empty-state branch for chart-less users.
 * Lunar phase card lands at P.3-b; transit overview lands at P.3-c.
 *
 * The previous 4-chip shell (Днес/Седмица/Месец/Година) is deleted at
 * P.3-a per HT 2 ratification; design intent preserved as REVISIT-46
 * for restoration decision at Phase C or first multi-scale forecast
 * request.
 */
export default function RhythmScreen() {
  const { push } = useGuardedNavigation()
  const firstChart = useFirstChart()

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 }}
      >
        {/* Editorial hero — mirrors web rhythm/page.tsx:39-52 */}
        <View className="mb-10">
          <Text className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
            Текущо небе
          </Text>
          <Text className="text-[28px] leading-[1.15] tracking-tight">
            <Text className="font-light text-slate-400">Какво ти </Text>
            <Text className="font-semibold text-amber-200/95">влияе сега</Text>
          </Text>
          <Text className="mt-3 max-w-xl text-[15px] font-light leading-relaxed text-slate-500">
            Активните транзити към картата ти — как планетите говорят с теб точно днес.
          </Text>
        </View>

        {/* Лунна фаза · Манифестация — live phase + disclosure + info expanders */}
        <LunarPhaseCard />

        {/* Лунен дневник CTA card — full-Pressable target per HT 6 */}
        <Pressable
          onPress={() => push('/rhythm/journal')}
          className="mb-16 rounded-3xl border border-slate-200/10 bg-white/[0.02] px-6 py-8"
        >
          <Text className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
            Лунен дневник
          </Text>
          <Text className="mb-5 text-[15px] font-light leading-[1.85] text-slate-300">
            Три реда на ден, водени от лунната фаза — манифестация, благодарност, освобождаване.
          </Text>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Text className="font-cinzel text-[12px] font-medium uppercase tracking-[0.28em] text-slate-200">
              Отвори дневника
            </Text>
            <Text className="text-[14px] text-slate-300">→</Text>
          </View>
        </Pressable>

        {/* Transit overview — gated on chart presence. EmptyTransitsState
            for chart-less users mirrors the chart.tsx pattern inline. */}
        {firstChart.data === null && <EmptyTransitsState />}
        {firstChart.data && <TransitOverviewCard chartId={firstChart.data.id} />}
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * No-chart fallback — duplicates the chart.tsx pattern inline per HT 5
 * (rule of three; refactor when a third surface needs the abstraction).
 */
function EmptyTransitsState() {
  const { push } = useGuardedNavigation()
  return (
    <View>
      <Text className="mb-5 text-[16px] font-light leading-[1.85] text-slate-200/90">
        За да видиш транзитите си, първо трябва да имаш натална карта. Въведи рождените си данни.
      </Text>
      <Pressable
        onPress={() => push('/wizard/date')}
        className="self-start flex-row items-center rounded-full border border-amber-300/40 px-5 py-2.5"
        style={{ gap: 10 }}
      >
        <Text className="font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-amber-200">
          Въведи рождени данни
        </Text>
        <Text className="font-cinzel text-[10.5px] text-amber-300">›</Text>
      </Pressable>
    </View>
  )
}
