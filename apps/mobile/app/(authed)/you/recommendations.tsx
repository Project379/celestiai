import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated from 'react-native-reanimated'

import { getSunSign } from '@stellaeum/core/welcome'

import { StoriesContent } from '@/components/stories/StoriesContent'
import { BackButton } from '@/components/design-system/BackButton'
import { useBackButtonVisibility } from '@/components/design-system/useBackButtonVisibility'
import { useFirstChart } from '@/hooks/useFirstChart'

/**
 * /you/recommendations route — replaces P.5 stub with the full stories
 * catalog surface (P.7-c2). Derives the user's sun sign from chart data
 * client-side (mirrors web's server-side derivation in page.tsx; mobile
 * doesn't have server components so the chart fetch + sign derivation
 * happen in the route component).
 */
export default function RecommendationsScreen() {
  const firstChart = useFirstChart()
  const sunSign = firstChart.data?.birth_date
    ? getSunSign(firstChart.data.birth_date)
    : null

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
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 80 }}
        onScroll={backVisibility.onScroll}
        scrollEventThrottle={100}
      >
        <StoriesContent sunSign={sunSign} />
      </ScrollView>
    </SafeAreaView>
  )
}
