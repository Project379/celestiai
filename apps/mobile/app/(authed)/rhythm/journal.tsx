import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ManifestDiaryContent } from '@/components/manifest/ManifestDiaryContent'

/**
 * Лунен дневник route — mobile parity port of
 * apps/web/app/(protected)/rhythm/journal/page.tsx (P.4-c1).
 *
 * Stack header is wired in apps/mobile/app/(authed)/_layout.tsx with
 * title «Лунен дневник» and «Назад» back affordance. The route sits
 * outside the (tabs) group so it pushes natively with the iOS animation
 * instead of swapping inside the tab bar.
 */
export default function ManifestJournalScreen() {
  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 80 }}
      >
        <ManifestDiaryContent />
      </ScrollView>
    </SafeAreaView>
  )
}
