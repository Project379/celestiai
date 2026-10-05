import { useEffect } from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated from 'react-native-reanimated'
import { useRouter } from 'expo-router'

import { StoriesContent } from '@/components/stories/StoriesContent'
import { BackButton } from '@/components/design-system/BackButton'
import { useBackButtonVisibility } from '@/components/design-system/useBackButtonVisibility'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { useFirstChart } from '@/hooks/useFirstChart'
import { useSubscription } from '@/hooks/useSubscription'

/**
 * /you/recommendations route — replaces P.5 stub with the full stories
 * catalog surface. The API owns astrology derivation and verifies that the
 * supplied chart belongs to the signed-in user.
 *
 * RECOMMENDATION-CONTENT-LICENSING (.planning/PLACEHOLDERS.md): the You-tab
 * entry point is already removed when the flag is off, but this screen is
 * still directly reachable via a stale deep link, so it redirects rather
 * than rendering — the underlying API routes already 404 the data (server
 * is the real gate), this just avoids showing a broken/empty screen for
 * whoever follows a stale link.
 */
export default function RecommendationsScreen() {
  const router = useRouter()
  const recommendationsEnabled = useFeatureFlag('media_recommendations')

  // Every hook below must run unconditionally, every render — rules of
  // hooks. The flag-off redirect is a separate effect + a render-time
  // early return placed AFTER all hooks (not before), not a guard that
  // skips hook calls.
  const firstChart = useFirstChart()
  const chartId = firstChart.data === undefined
    ? undefined
    : firstChart.data?.id ?? null

  const { data: subscription, isError: subscriptionError } = useSubscription()
  // Tri-state: undefined while the tier query loads, so the monthly arc
  // shows a neutral pending treatment instead of flashing a lock at a
  // premium user. Hard error → free experience.
  const isPremium =
    subscription === undefined && !subscriptionError
      ? undefined
      : subscription?.tier === 'premium'

  const backVisibility = useBackButtonVisibility()

  useEffect(() => {
    if (!recommendationsEnabled) {
      router.replace('/you')
    }
  }, [recommendationsEnabled, router])

  // Render nothing while off — the useEffect above fires after this first
  // render, so without this guard a stale deep link briefly shows the real
  // screen before redirecting.
  if (!recommendationsEnabled) {
    return null
  }

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
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 80 }}
        onScroll={backVisibility.onScroll}
        scrollEventThrottle={100}
      >
        <StoriesContent chartId={chartId} isPremium={isPremium} />
      </ScrollView>
    </SafeAreaView>
  )
}
