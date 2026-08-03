import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated from 'react-native-reanimated'

import { AmbientBackground } from '@/components/design-system/AmbientBackground'
import { BackButton } from '@/components/design-system/BackButton'
import { useBackButtonVisibility } from '@/components/design-system/useBackButtonVisibility'
import { ManifestDiaryContent } from '@/components/manifest/ManifestDiaryContent'

/**
 * Лунен дневник route — mobile parity port of
 * apps/web/app/(protected)/rhythm/journal/page.tsx (P.4-c1).
 *
 * Founder correction (this batch): the Stack header (title + native back
 * button) is gone — apps/mobile/app/(authed)/_layout.tsx now renders no
 * header at all on this route. `edges` widened to include `top` (used to
 * rely on the header for that inset) and BackButton renders its own
 * quiet top-left affordance instead — visible at the top of the scroll,
 * fading out once the user scrolls into content (useBackButtonVisibility).
 * The route still sits outside the (tabs) group so it pushes with the
 * native iOS animation.
 *
 * Founder correction (this batch, round 2): this screen previously had no
 * starfield at all — AmbientBackground is normally mounted once behind
 * the three TAB roots ((tabs)/_layout.tsx), and this route lives outside
 * that group. Mounted directly here instead.
 */
export default function ManifestJournalScreen() {
  const backVisibility = useBackButtonVisibility()

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <AmbientBackground />
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
        <ManifestDiaryContent />
      </ScrollView>
    </SafeAreaView>
  )
}
