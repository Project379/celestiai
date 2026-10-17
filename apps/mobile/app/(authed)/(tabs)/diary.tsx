import { ScrollView } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { ManifestDiaryContent } from '@/components/manifest/ManifestDiaryContent'

export default function DiaryTabScreen() {
  const insets = useSafeAreaInsets()
  return <SafeAreaView edges={['top']} className="flex-1 bg-bg"><ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 108 + insets.bottom }}><ManifestDiaryContent /></ScrollView></SafeAreaView>
}
