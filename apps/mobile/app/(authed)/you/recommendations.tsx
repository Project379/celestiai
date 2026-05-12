import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { getSunSign } from '@stellaeum/core/welcome'

import { StoriesContent } from '@/components/stories/StoriesContent'
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

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 80 }}
      >
        <StoriesContent sunSign={sunSign} />
      </ScrollView>
    </SafeAreaView>
  )
}
