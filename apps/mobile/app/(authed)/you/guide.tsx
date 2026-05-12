import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * /you/guide — P.5 stub destination. Replaced by P.8 (full astrology
 * reference: planets / signs / houses / aspects, ~600 LOC per HANDOFF
 * table line 155).
 */
export default function GuideStubScreen() {
  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 80 }}
      >
        <View className="items-center py-12">
          <Text className="text-[16px] font-light leading-[1.7] text-slate-300">
            Ръководството идва скоро.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
