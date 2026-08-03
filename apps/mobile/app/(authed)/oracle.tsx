import { Redirect } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CapReachedNotice } from '@/components/oracle/CapReachedNotice'
import { ReadingBody } from '@/components/oracle/ReadingBody'
import { TopicCards } from '@/components/oracle/TopicCards'
import { useFirstChart } from '@/hooks/useFirstChart'
import { useOracleReading } from '@/hooks/useOracleReading'

/**
 * Mobile Oracle screen — full-screen route under (authed) with the
 * Stack header from the parent layout providing the «Оракул» title +
 * native back button. Mirrors apps/web/components/oracle/OraclePanelGlobal.tsx
 * composition (TopicCards → ReadingBody / CapReachedNotice / loading)
 * minus web's modal overlay, streaming cursor, and dead
 * LockedTopicTeaser path (REVISIT-23 logs the web parity gap).
 *
 * Bulgarian copy mirrors web verbatim except the empty-state subtitle,
 * which drops «отгоре» (now spatially redundant — topic cards sit
 * directly above the caption on mobile).
 */
export default function OracleScreen() {
  const firstChart = useFirstChart()
  const chartId = firstChart.data?.id ?? null

  // While useFirstChart resolves, render an empty surface so the
  // header animates in cleanly without a flash of fallback content.
  if (firstChart.isLoading) {
    return <SafeAreaView edges={['bottom']} className="flex-1 bg-bg" />
  }

  // No chart → user shouldn't be here. The OracleEntry FAB hides
  // itself when there's no chart, so this is a defensive fallback
  // (deep-link, race) that bounces back to Днес.
  if (!chartId) {
    return <Redirect href="/" />
  }

  return <OracleScreenInner chartId={chartId} />
}

function OracleScreenInner({ chartId }: { chartId: string }) {
  const {
    savedReadings,
    activeTopic,
    selectTopic,
    clearActiveTopic,
    isGenerating,
    generationError,
    currentReading,
  } = useOracleReading(chartId)

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 }}
      >
        <View className="mb-5">
          <View
            className="mb-2 flex-row items-center"
            style={{ gap: 12 }}
          >
            <View
              className="h-1 w-1 bg-amber-300/90"
              style={{
                transform: [{ rotate: '45deg' }],
                shadowColor: 'rgb(251, 191, 36)',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.7,
                shadowRadius: 8,
              }}
            />
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
              Астрологичен оракул
            </Text>
            <View
              className="h-px flex-1 bg-amber-300/30"
              style={{ marginLeft: 4 }}
            />
          </View>
        </View>

        {!activeTopic && (
          <>
            <TopicCards
              activeTopic={activeTopic}
              savedReadings={savedReadings}
              onTopicSelect={selectTopic}
            />
            <View className="mt-10 items-center">
              <Text className="text-center text-[15px] font-light leading-7 text-slate-400">
                Избери тема и звездите ще ти разкажат.
              </Text>
            </View>
          </>
        )}

        {activeTopic && (
          <>
            <Pressable
              onPress={clearActiveTopic}
              accessibilityRole="button"
              className="mb-5 flex-row items-center"
              style={{ gap: 8 }}
            >
              <Text className="font-cinzel text-[16px] text-slate-500">‹</Text>
              <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                Всички теми
              </Text>
            </Pressable>

            {isGenerating && <GeneratingState />}

            {!isGenerating && generationError?.kind === 'cap-reached' && (
              <CapReachedNotice cap={generationError.cap} />
            )}

            {!isGenerating && generationError?.kind === 'generic' && (
              <Text className="text-center text-[14px] font-light text-rose-300/85">
                {generationError.message}
              </Text>
            )}

            {!isGenerating && !generationError && currentReading && (
              <ReadingBody
                content={currentReading.content}
                generatedAt={currentReading.generatedAt}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

/**
 * Loading state mirroring web's ReadingStream pre-first-token block
 * (apps/web/components/oracle/ReadingStream.tsx). Web wraps the text in
 * an animated orbiting-diamond canvas; mobile ships a static rendition
 * for SR 7. Animation is REVISIT polish.
 */
function GeneratingState() {
  return (
    <View className="items-center py-12" style={{ gap: 18 }}>
      <View
        className="h-2 w-2 bg-amber-300/90"
        style={{
          transform: [{ rotate: '45deg' }],
          shadowColor: 'rgb(251, 191, 36)',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.75,
          shadowRadius: 14,
        }}
      />
      <View className="items-center" style={{ gap: 6 }}>
        <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
          Stellaeum
        </Text>
        <Text className="text-[14px] font-light leading-relaxed text-slate-400">
          консултира звездите…
        </Text>
      </View>
    </View>
  )
}
