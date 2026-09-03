import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

import { CrystalCollectionContent } from '@/components/crystals/CrystalCollectionContent'
import { BackButton } from '@/components/design-system/BackButton'
import { pressFeedback } from '@/components/design-system/tokens'
import { useBackButtonVisibility } from '@/components/design-system/useBackButtonVisibility'
import { CrystalDetailPanel } from '@/components/crystals/CrystalDetailPanel'
import { CrystalOfTheDayCard } from '@/components/crystals/CrystalOfTheDayCard'
import { useCollectCrystal } from '@/hooks/useCollectCrystal'
import { useCrystalOfTheDay } from '@/hooks/useCrystalOfTheDay'
import { useCrystalsOverview } from '@/hooks/useCrystalsOverview'
import { useFirstChart } from '@/hooks/useFirstChart'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'

/**
 * /you/crystals — P.6 close. Replaces the P.5 stub with the full D9 port:
 * daily crystal hero + streak (P.6-a/b), monthly windows + collection view
 * (P.6-c), detail modal (P.6-d). Premium gating reuses `isPremium` off
 * useCrystalOfTheDay's response (server-derived) rather than a separate
 * tier fetch. The web page's «Как работи колекцията» guide link is
 * omitted — REVISIT-51 tracks the /you/crystals/guide port as deferred,
 * out-of-D9 scope, so mobile does not stub a dead link.
 */
export default function CrystalsScreen() {
  const { push } = useGuardedNavigation()
  const { data: crystalOfTheDay } = useCrystalOfTheDay()
  const { data: firstChart } = useFirstChart()
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  const chartId = firstChart?.id ?? null
  const chartResolved = firstChart !== undefined
  const isPremium = crystalOfTheDay?.isPremium ?? false

  const { data: overview } = useCrystalsOverview(chartId)
  const locked = overview?.locked ?? false
  const collectMutation = useCollectCrystal(chartId)

  const selected = overview?.catalog.find((c) => c.slug === selectedSlug) ?? null
  const selectedRec = selected
    ? (overview?.recommendations.find((r) => r.crystal_id === selected.id) ?? null)
    : null
  const isDiscovered = selected
    ? (overview?.collection.some((c) => c.crystal_id === selected.id) ?? false)
    : false

  const backVisibility = useBackButtonVisibility()

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <Animated.View
        style={[{ position: 'absolute', top: 0, left: 0, zIndex: 10 }, backVisibility.style]}
        pointerEvents={backVisibility.pointerEvents}
      >
        <BackButton />
      </Animated.View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 80 }}
        onScroll={backVisibility.onScroll}
        scrollEventThrottle={100}
      >
        <Text className="mb-8 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          Кристали · Лунна колекция
        </Text>

        <View className="mb-12">
          <CrystalOfTheDayCard />
        </View>

        {/* Tier item 5: the grid renders for everyone. Free tier gets it
           locked (API returns `locked: true`, empty collection); premium
           gets the personalised payload. */}
        {isPremium && chartResolved && chartId === null ? (
          <MissingChartState onPress={() => push('/wizard/date')} />
        ) : (
          <CrystalCollectionContent
            chartId={chartId}
            onSelectCrystal={(slug) => {
              // Tile tap directly opens the detail sheet — Soft impact for
              // the sheet settling into place (same pattern as TransitOverviewCard).
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
              setSelectedSlug(slug)
            }}
          />
        )}
      </ScrollView>

      <CrystalDetailPanel
        crystal={selected}
        reason={selectedRec?.reason_text_bg ?? selectedRec?.reason_text_en ?? null}
        canCollect={!locked && Boolean(selectedRec && !isDiscovered)}
        collectLocked={locked}
        collecting={collectMutation.isPending}
        onCollect={() => selectedRec && collectMutation.mutate(selectedRec.id)}
        onClose={() => setSelectedSlug(null)}
      />
    </SafeAreaView>
  )
}

function MissingChartState({ onPress }: { onPress: () => void }) {
  return (
    <View>
      <Text className="mb-5 text-[16px] font-light leading-[1.85] text-slate-200/90">
        За да видиш личните си препоръки, първо трябва да имаш натална карта. Въведи рождените си данни.
      </Text>
      <Pressable
        onPress={onPress}
        className="self-start flex-row items-center rounded-full border border-bronze/40 px-5 py-2.5"
        style={({ pressed }) => ({ ...pressFeedback(pressed), gap: 10 })}
      >
        <Text className="font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-bronze-text">
          Добави натална карта
        </Text>
        <Text className="font-cinzel text-[10.5px] text-bronze">›</Text>
      </Pressable>
    </View>
  )
}
