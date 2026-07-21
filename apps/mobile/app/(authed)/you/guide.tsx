import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { GuideAspectsSection } from '@/components/astrology-guide/GuideAspectsSection'
import { GuideDivider } from '@/components/astrology-guide/GuideSection'
import { GuideHistorySection } from '@/components/astrology-guide/GuideHistorySection'
import { GuideLunarPhasesSection } from '@/components/astrology-guide/GuideLunarPhasesSection'
import { GuideMethodSection } from '@/components/astrology-guide/GuideMethodSection'
import { GuidePlanetsSection } from '@/components/astrology-guide/GuidePlanetsSection'
import { GuidePrinciplesSection } from '@/components/astrology-guide/GuidePrinciplesSection'
import { GuideTransitsSection } from '@/components/astrology-guide/GuideTransitsSection'

/**
 * /you/guide — P.8 close. Replaces the P.5 stub with the full mobile port
 * of AstrologyGuideContent: a 7-section narrative primer (История /
 * Принципи / Планетни принципи / Аспектите / Транзитите / Лунни фази /
 * Метод), not a per-sign/per-house reference dictionary — the parity-gap
 * doc's prior description was stale (see REVISIT-41 sweep at close).
 * Free page, no premium/chart gating, no data fetching — content is
 * static and lives inline in the section components (zero lift; P.8
 * investigation ratified this over extracting to @stellaeum/core since
 * web itself never split the content out and no second consumer exists).
 */
export default function AstrologyGuideScreen() {
  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 80 }}
      >
        <View className="mb-12">
          <Text className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-400">
            Ръководство
          </Text>
          <Text className="text-[28px] leading-[1.15] tracking-tight">
            <Text className="font-light text-slate-300">Какво е </Text>
            <Text className="font-semibold text-amber-200/95">астрологията?</Text>
          </Text>
          <Text className="mt-4 text-[15px] font-light leading-[1.8] text-slate-300">
            Пътеводител от древните вавилонски звездочетци до прецизните алгоритми, с които Stellaeum изчислява твоята натална карта.
          </Text>
        </View>

        <GuideHistorySection />
        <GuideDivider />
        <GuidePrinciplesSection />
        <GuideDivider />
        <GuidePlanetsSection />
        <GuideDivider />
        <GuideAspectsSection />
        <GuideDivider />
        <GuideTransitsSection />
        <GuideDivider />
        <GuideLunarPhasesSection />
        <GuideDivider />
        <GuideMethodSection />
      </ScrollView>
    </SafeAreaView>
  )
}
