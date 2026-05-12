import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * /you/settings — P.5 stub destination. Replaced by P.10 (Clerk RN
 * <UserProfile> + custom app-specific section: GDPR export trigger,
 * account deletion confirm, notification preferences. ~400 LOC per
 * HANDOFF table line 156).
 *
 * Per D5: settings = Clerk UserProfile + custom app section.
 * Per D13: subscription is NOT a settings concern — it lives at
 * /you/premium with conditional content by tier.
 */
export default function SettingsStubScreen() {
  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 80 }}
      >
        <View className="items-center py-12">
          <Text className="text-[16px] font-light leading-[1.7] text-slate-300">
            Настройките идват скоро.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
