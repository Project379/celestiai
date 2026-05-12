import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * /you/crystals — P.5 stub destination. Replaced by P.6 (crystals
 * collection: monthly windows + daily streak + collection view, ~400 LOC
 * per HANDOFF table line 154).
 */
export default function CrystalsStubScreen() {
  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 80 }}
      >
        <View className="items-center py-12">
          <Text className="text-[16px] font-light leading-[1.7] text-slate-300">
            Кристалите ти идват скоро.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
